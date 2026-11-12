import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DataTable, type DataColumn, type DataSort } from '@/components/ui/data-table';
import { Money, RMultiple } from '@/components/ui/money';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { MIN_SEGMENT_TRADES, explorerTotals, type DistributionRow } from '@/lib/analyticsRows';
import { MetricInfo } from './MetricInfo';

interface BreakdownExplorerProps {
  /** Column header of the first column: the dimension, e.g. `Strategy`. */
  dimension: string;
  rows: DistributionRow[];
  currency?: string;
  /** Where a row leads (Trades as a temporary view of that segment); null when Trades has no filter for it. */
  rowHref: (row: DistributionRow) => string | null;
  caption: string;
}

const TOTAL_ID = '__total__';
type SortId = 'name' | 'trades' | 'winRate' | 'net' | 'avgR' | 'expectancy';

function sortValue(r: DistributionRow, id: SortId): number | string {
  if (id === 'name') return r.name.toLowerCase();
  if (id === 'avgR') return r.avgR ?? Number.NEGATIVE_INFINITY;
  if (id === 'expectancy') return r.trades ? r.net / r.trades : 0;
  return r[id];
}

/** The breakdown explorer (E-060): ranked rows with an inline bar, sortable, every row opens the matching trades. */
export function BreakdownExplorer({ dimension, rows, currency, rowHref, caption }: BreakdownExplorerProps) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<DataSort>({ id: 'net', dir: 'desc' });
  const hasAvgR = rows.some((r) => r.avgR !== undefined);
  const maxAbs = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.net))), [rows]);

  const sorted = useMemo(() => {
    const id = sort.id as SortId;
    const list = [...rows].sort((a, b) => {
      const av = sortValue(a, id);
      const bv = sortValue(b, id);
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, sort]);

  const totals = explorerTotals(rows);
  const totalRow: DistributionRow = { key: TOTAL_ID, name: 'Total', trades: totals.trades, wins: totals.wins, winRate: totals.winRate, net: totals.net };
  const data = [...sorted, totalRow];

  const onSort = (id: string) => setSort((s) => (s.id === id ? { id, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { id, dir: id === 'name' ? 'asc' : 'desc' }));

  const columns: DataColumn<DistributionRow>[] = [
    {
      id: 'name',
      header: dimension,
      sortable: true,
      cell: (r) =>
        r.key === TOTAL_ID ? (
          <span className="font-medium">Total</span>
        ) : (
          <span className={cn('flex items-baseline gap-2', r.trades < MIN_SEGMENT_TRADES && 'text-muted-foreground')}>
            <span className="min-w-0">
              <span className="block max-w-[16rem] truncate" title={r.name}>{r.name}</span>
              <span className="block text-xs text-muted-foreground sm:hidden">{r.trades} {r.trades === 1 ? 'trade' : 'trades'} · {formatPercent(r.winRate)}</span>
            </span>
            {r.trades < MIN_SEGMENT_TRADES && <span className="whitespace-nowrap text-xs">n &lt; {MIN_SEGMENT_TRADES}</span>}
          </span>
        ),
    },
    {
      id: 'trades',
      header: 'Trades',
      align: 'right',
      sortable: true,
      hideBelow: 'sm',
      cell: (r) => <span className="font-mono tabular-nums">{r.trades}</span>,
    },
    { id: 'winRate', hideBelow: 'sm', header: 'Win %', align: 'right', sortable: true, cell: (r) => <span className="font-mono tabular-nums">{formatPercent(r.winRate)}</span> },
  ];
  columns.push({
    id: 'net',
    header: 'Net P&L',
    align: 'right',
    sortable: true,
    width: 'sm:w-64',
    cell: (r) => (
      <span className="flex items-center justify-end gap-3">
        {r.key !== TOTAL_ID && (
          <span aria-hidden="true" className="relative hidden h-1 w-24 sm:block">
            <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
            <span
              className={cn('absolute inset-y-0 rounded-sm', r.net >= 0 ? 'bg-profit' : 'bg-loss')}
              style={r.net >= 0 ? { left: '50%', width: `${(Math.abs(r.net) / maxAbs) * 50}%` } : { right: '50%', width: `${(Math.abs(r.net) / maxAbs) * 50}%` }}
            />
          </span>
        )}
        <Money value={r.net} currency={currency} className="min-w-24 text-right" />
      </span>
    ),
  });
  if (hasAvgR) {
    columns.push({ id: 'avgR', header: 'Avg R', align: 'right', sortable: true, hideBelow: 'md', cell: (r) => (r.key === TOTAL_ID ? null : <RMultiple value={r.avgR} />) });
  }
  columns.push({
    id: 'expectancy',
    header: 'Expectancy',
    align: 'right',
    sortable: true,
    hideBelow: 'md',
    cell: (r) => <Money value={r.trades ? r.net / r.trades : 0} currency={currency} />,
  });
  columns.push({
    id: 'open',
    header: 'Open trades',
    srHeader: true,
    width: 'w-10',
    cell: (r) => {
      const href = r.key === TOTAL_ID ? null : rowHref(r);
      return href === null ? null : (
        <Link to={href} aria-label={`Open ${r.trades} ${r.trades === 1 ? 'trade' : 'trades'} for ${r.name} in Trades`} className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      );
    },
  });

  return (
    <div className="overflow-x-auto">
      <DataTable
        caption={caption}
        rows={data}
        columns={columns}
        getRowId={(r) => r.key}
        sort={sort}
        onSort={onSort}
        onRowOpen={(r) => {
          const href = r.key === TOTAL_ID ? null : rowHref(r);
          if (href) navigate(href);
        }}
        rowClassName={(r) => (r.key === TOTAL_ID ? 'cursor-default border-t border-border-strong font-medium hover:bg-transparent' : undefined)}
      />
      <p className="px-3 py-2 text-xs text-muted-foreground">
        <MetricInfo metric="expectancy" /> is net P&amp;L divided by trades. Segments under {MIN_SEGMENT_TRADES} trades are shown in grey and left out of the summary.
      </p>
    </div>
  );
}
