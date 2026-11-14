import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DataTable, type DataColumn, type DataSort } from '@/components/ui/data-table';
import { Money, RMultiple } from '@/components/ui/money';
import { EvidenceText } from '@/components/analysis/EvidenceText';
import { cn } from '@/lib/utils';
import { formatPercent, formatProfitFactor, formatR } from '@/lib/format';
import { MIN_VERDICT_TRADES } from '@/lib/evidence';
import { MIN_SEGMENT_TRADES, explorerTotals, type DistributionRow } from '@/lib/analyticsRows';
import { MetricInfo } from './MetricInfo';

interface BreakdownExplorerProps {
  /** Column header of the first column: the dimension, e.g. `Strategy`. */
  dimension: string;
  rows: DistributionRow[];
  currency?: string;
  /** Where a row leads (Trades as a temporary view of that segment); null when Trades has no filter for it. */
  rowHref: (row: DistributionRow) => string | null;
  /** Rows without a link but with trade ids open the trade pane on them; absent = such rows open nothing. */
  onOpenIds?: (ids: string[]) => void;
  caption: string;
  /** `order` keeps the rows as given (weekdays, bands); the default ranks by evidence when rows carry it, else by net P&L. */
  initialSort?: DataSort;
  /** Trades-per-day bands: the net of an average day in the band instead of expectancy per trade. */
  perDay?: boolean;
  /** Hide the footnote (when the panel says it already). */
  footnote?: boolean;
  /** No totals row where one trade can sit in several rows (tags, news events). */
  totals?: boolean;
}

const TOTAL_ID = '__total__';
type SortId = 'order' | 'name' | 'trades' | 'winRate' | 'net' | 'avgR' | 'profitFactor' | 'evidence' | 'expectancy';

const evidenceRank = (r: DistributionRow) => (r.verdict === 'edge' ? 3 : r.verdict === 'leak' ? 2 : r.trades >= MIN_VERDICT_TRADES ? 1 : 0) * 1e7 + r.trades;

function sortValue(r: DistributionRow, id: SortId, index: number, perDay: boolean): number | string {
  if (id === 'order') return -index;
  if (id === 'name') return r.name.toLowerCase();
  if (id === 'avgR') return r.avgR ?? Number.NEGATIVE_INFINITY;
  if (id === 'profitFactor') return r.profitFactor === null ? Number.POSITIVE_INFINITY : (r.profitFactor ?? Number.NEGATIVE_INFINITY);
  if (id === 'evidence') return evidenceRank(r);
  if (id === 'expectancy') return perDay && r.days ? r.net / r.days : r.trades ? r.net / r.trades : 0;
  return r[id];
}

/** Averages of a row the server did not judge are printed without profit/loss colour: a small sample is not a finding. */
const unjudged = (r: DistributionRow) => r.verdict === 'watch';

const linkClass = 'flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** The breakdown explorer (E-060): ranked rows with an inline bar, sortable, every row opens the matching trades. */
export function BreakdownExplorer({ dimension, rows, currency, rowHref, onOpenIds, caption, initialSort, perDay = false, footnote = true, totals: showTotals = true }: BreakdownExplorerProps) {
  const navigate = useNavigate();
  const hasEvidence = rows.some((r) => r.verdict !== undefined);
  const [sort, setSort] = useState<DataSort>(initialSort ?? { id: hasEvidence ? 'evidence' : 'net', dir: 'desc' });
  const hasAvgR = rows.some((r) => r.avgR !== undefined);
  const hasPf = rows.some((r) => r.profitFactor !== undefined);
  const maxAbs = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.net))), [rows]);

  const sorted = useMemo(() => {
    const id = sort.id as SortId;
    const indexed = rows.map((r, i) => [r, i] as const);
    indexed.sort(([a, ai], [b, bi]) => {
      const av = sortValue(a, id, ai, perDay);
      const bv = sortValue(b, id, bi, perDay);
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return indexed.map(([r]) => r);
  }, [rows, sort, perDay]);

  const totals = useMemo(() => explorerTotals(rows), [rows]);
  const totalDays = rows.reduce((s, r) => s + (r.days ?? 0), 0);
  const totalRow: DistributionRow = { key: TOTAL_ID, name: 'Total', trades: totals.trades, wins: totals.wins, winRate: totals.winRate, net: totals.net, ...(perDay ? { days: totalDays } : {}) };
  const data = showTotals ? [...sorted, totalRow] : sorted;

  const onSort = (id: string) => setSort((s) => (s.id === id ? { id, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { id, dir: id === 'name' ? 'asc' : 'desc' }));
  const openOf = (r: DistributionRow): { href: string } | { ids: string[] } | null => {
    if (r.key === TOTAL_ID) return null;
    const href = rowHref(r);
    if (href) return { href };
    return onOpenIds && r.tradeIds?.length ? { ids: r.tradeIds } : null;
  };

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
              <span className="block text-xs text-muted-foreground sm:hidden">
                {r.trades} {r.trades === 1 ? 'trade' : 'trades'} · {formatPercent(r.winRate)}
                {hasEvidence && r.verdict ? <> · <EvidenceText verdict={r.verdict} trades={r.trades} inline className="text-xs" /></> : null}
              </span>
            </span>
            {r.trades < MIN_SEGMENT_TRADES && <span className="hidden whitespace-nowrap text-xs sm:inline">n &lt; {MIN_SEGMENT_TRADES}</span>}
          </span>
        ),
    },
    { id: 'trades', header: perDay ? 'Trades · days' : 'Trades', align: 'right', sortable: true, hideBelow: 'sm', cell: (r) => <span className="whitespace-nowrap font-mono tabular-nums">{r.trades}{perDay && r.days !== undefined ? <span className="text-muted-foreground"> · {r.days}</span> : null}</span> },
    { id: 'winRate', hideBelow: 'sm', header: 'Win %', align: 'right', sortable: true, cell: (r) => <span className="font-mono tabular-nums">{formatPercent(r.winRate)}</span> },
    {
      id: 'net',
      header: 'Net P&L',
      align: 'right',
      sortable: true,
      width: 'sm:w-56',
      cell: (r) => (
        <span className="flex items-center justify-end gap-3">
          {r.key !== TOTAL_ID && (
            <span aria-hidden="true" className="relative hidden h-1 w-20 lg:block">
              <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
              <span
                className={cn('absolute inset-y-0 rounded-sm', r.net >= 0 ? 'bg-profit' : 'bg-loss')}
                style={r.net >= 0 ? { left: '50%', width: `${(Math.abs(r.net) / maxAbs) * 50}%` } : { right: '50%', width: `${(Math.abs(r.net) / maxAbs) * 50}%` }}
              />
            </span>
          )}
          <span className="text-right">
            <Money value={r.net} currency={currency} className="block min-w-24" />
            {r.key !== TOTAL_ID && hasAvgR && <span className="block font-mono text-xs tabular-nums text-foreground-soft md:hidden">{formatR(r.avgR)}</span>}
          </span>
        </span>
      ),
    },
  ];
  if (hasAvgR) columns.push({ id: 'avgR', header: 'Avg R', align: 'right', sortable: true, hideBelow: 'md', cell: (r) => (r.key === TOTAL_ID ? null : unjudged(r) ? <span className="font-mono tabular-nums text-foreground-soft">{formatR(r.avgR)}</span> : <RMultiple value={r.avgR} />) });
  if (hasPf) columns.push({ id: 'profitFactor', header: 'Profit factor', align: 'right', sortable: true, hideBelow: 'lg', cell: (r) => (r.key === TOTAL_ID ? null : <span className="font-mono tabular-nums">{formatProfitFactor(r.profitFactor, r.wins, r.trades)}</span>) });
  columns.push({
    id: 'expectancy',
    header: perDay ? 'Average day' : 'Expectancy',
    align: 'right',
    sortable: true,
    hideBelow: 'md',
    cell: (r) => <Money value={perDay ? (r.days ? r.net / r.days : 0) : r.trades ? r.net / r.trades : 0} currency={currency} neutral={unjudged(r)} />,
  });
  if (hasEvidence) columns.push({ id: 'evidence', header: 'Evidence', sortable: true, hideBelow: 'sm', cell: (r) => (r.key === TOTAL_ID || !r.verdict ? null : <EvidenceText verdict={r.verdict} trades={r.trades} />) });
  columns.push({
    id: 'open',
    header: 'Open trades',
    srHeader: true,
    width: 'w-10',
    cell: (r) => {
      const open = openOf(r);
      const name = `Open ${r.trades} ${r.trades === 1 ? 'trade' : 'trades'} for ${r.name}`;
      if (!open) return null;
      if ('href' in open) {
        return (
          <Link to={open.href} aria-label={`${name} in Trades`} className={linkClass}>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        );
      }
      return (
        <button type="button" aria-label={name} className={linkClass} onClick={(e) => { e.stopPropagation(); onOpenIds?.(open.ids); }}>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
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
        sort={sort.id === 'order' ? undefined : sort}
        onSort={onSort}
        onRowOpen={(r) => {
          const open = openOf(r);
          if (!open) return;
          if ('href' in open) navigate(open.href);
          else onOpenIds?.(open.ids);
        }}
        rowClassName={(r) => (r.key === TOTAL_ID ? 'cursor-default border-t border-border-strong font-medium hover:bg-transparent' : undefined)}
      />
      {footnote && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          <MetricInfo metric="expectancy" /> is net P&amp;L divided by trades.{hasEvidence ? <> <MetricInfo metric="evidence" /> needs {MIN_VERDICT_TRADES} trades in a row and {MIN_VERDICT_TRADES} outside it.</> : null} Segments under {MIN_SEGMENT_TRADES} trades are shown in grey{hasEvidence ? '' : ' and left out of the summary'}.
        </p>
      )}
    </div>
  );
}
