import { useMemo } from 'react';
import { Image as ImageIcon, Lock, MoreHorizontal, NotebookPen, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CellKind } from '@/components/tradelog/CellPicker';
import type { FilterFieldKey } from '@/components/tradelog/FilterBar';
import { DirectionChip, OUTCOME_LABEL } from '@/components/ui/chips';
import { DataTable, type DataColumn, type DataGroup, type DataSelection, type DataSort } from '@/components/ui/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Money, RMultiple } from '@/components/ui/money';
import { copy } from '@/copy';
import { formatDateShort, formatDurationMinutes, formatMoney, formatPrice, formatQuantity, formatTime } from '@/lib/format';
import { resolveColumns, type ColumnConfig } from '@/lib/tradeColumns';
import { holdingMinutes, plannedRR, realisedR, riskAmount, type SortKey, type SortState } from '@/lib/tradeFilters';
import type { GroupBy, TradeGroup } from '@/lib/tradeGroups';
import type { Trade, TradingAccount } from '@/types/trade';

const PIN_WIDTH: Record<string, number> = { date: 84, symbol: 96, pnl: 108 };

export interface TradeRowActions {
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

interface TradeTableProps {
  trades: Trade[];
  accounts: Map<string, TradingAccount>;
  sort: SortState;
  onSort: (key: SortKey) => void;
  selection: DataSelection;
  openId: string | null;
  onOpen: (id: string) => void;
  /** Docked pane: only the compact column set. */
  compact: boolean;
  showAccount: boolean;
  columns: ColumnConfig;
  groupBy: GroupBy;
  highlightId?: string | null;
  density?: 'comfortable' | 'compact';
  groups?: TradeGroup[];
  collapsed?: ReadonlySet<string>;
  onToggleGroup?: (key: string) => void;
  actions: TradeRowActions;
  /** Accounts the user may not write to (over the Free limit): rows get a lock mark. */
  readOnlyAccountIds?: ReadonlySet<string>;
  /** The list spans calendar years, so Date cells carry the year (E-037). */
  spansYears?: boolean;
  /** Row key handler for `S` / `T` / `Shift+T` (E-043); returns true when it handled the key. */
  onRowKey?: (e: React.KeyboardEvent, t: Trade) => boolean | void;
  /** Journal cells open their picker on click (E-043); absent on touch lists. */
  onPickCell?: (kind: CellKind, t: Trade, anchor: HTMLElement) => void;
  /** Mount only the rows near the viewport (E-041). */
  virtualize?: boolean;
  /** Column widths in px set by the user (E-035) and the handler that changes them; `null` = fit. */
  columnWidths?: Record<string, number>;
  onResizeColumn?: (id: string, width: number | null) => void;
  /** Header caret menu (E-034). */
  onSortDir?: (key: SortKey, dir: 'asc' | 'desc') => void;
  onGroupBy?: (group: GroupBy) => void;
  onFilterBy?: (field: FilterFieldKey) => void;
  onHideColumn?: (id: string) => void;
}

const GROUP_OF: Record<string, GroupBy> = { date: 'day', symbol: 'symbol', side: 'side', account: 'account', asset: 'asset', outcome: 'outcome', strategy: 'strategy', session: 'session', market: 'market' };
const FILTER_OF: Record<string, FilterFieldKey> = { symbol: 'symbols', side: 'sides', account: 'accounts', asset: 'assets', outcome: 'outcomes', strategy: 'strategies', session: 'sessions', mistakes: 'mistakes', tags: 'tags', broken: 'broken', pnl: 'result' };

/** Fixed width of the pinned Symbol column, sized for the longest name shown (≈7 px a character + padding), 96–240 px. */
export function symbolPinWidth(trades: Trade[]): number {
  const longest = trades.reduce((n, t) => Math.max(n, optionSymbol(t).length), 0);
  return Math.min(240, Math.max(PIN_WIDTH.symbol, Math.ceil(longest * 7.2) + 32));
}

const FREE_TEXT_OF: Record<string, (t: Trade) => string> = { strategy: (t) => t.strategy || t.setup || '', session: (t) => t.session || '', market: (t) => t.marketCondition || '' };

/** Width of a free-text journal column: its default, grown to the longest value shown (≈7 px a character + padding), at most 200 px. */
export function freeTextWidth(id: string, base: number, trades: Trade[]): number {
  const of = FREE_TEXT_OF[id];
  if (!of) return base;
  const longest = trades.reduce((n, t) => Math.max(n, of(t).length), 0);
  return Math.min(200, Math.max(base, Math.ceil(longest * 7.2) + 40));
}

/** `NIFTY 24500 CE · 28 Nov` for options, the plain symbol otherwise. */
export function optionSymbol(t: Trade): string {
  if (t.assetClass === 'options' && t.strike !== undefined && t.optionType) {
    const exp = t.expiry ? ` · ${formatDateShort(t.expiry)}` : '';
    return `${t.underlying || t.symbol} ${formatPrice(t.strike)} ${t.optionType === 'call' ? 'CE' : 'PE'}${exp}`;
  }
  return t.symbol;
}

function dateCell(t: Trade, groupBy: GroupBy, spansYears: boolean): string {
  const when = t.exitDate || t.entryDate;
  if (groupBy === 'day') return formatTime(when);
  return `${formatDateShort(when, spansYears)} ${formatTime(when)}`;
}

function firstPlus(values: string[] | undefined): string {
  const v = (values ?? []).filter(Boolean);
  if (!v.length) return '—';
  return v.length > 1 ? `${v[0]} +${v.length - 1}` : v[0];
}

const FREE_TEXT = new Set(['strategy', 'session', 'market']);

function JournalMarks({ t }: { t: Trade }) {
  const shots = t.images?.length ?? 0;
  const notes = !!(t.notes || t.keyLesson);
  const tags = (t.mistakes?.length ?? 0) + (t.tags?.length ?? 0);
  if (!shots && !notes && !tags) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="flex items-center gap-1 text-muted-foreground">
      {shots > 0 && (
        <li title="Has screenshot">
          <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">Has screenshot</span>
        </li>
      )}
      {notes && (
        <li title="Has notes or lesson">
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">Has notes or lesson</span>
        </li>
      )}
      {tags > 0 && (
        <li title={`${tags} ${tags === 1 ? 'tag' : 'tags'}`}>
          <Tag className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">{tags} {tags === 1 ? 'tag' : 'tags'}</span>
        </li>
      )}
    </ul>
  );
}

export function TradeTable({
  trades, accounts, sort, onSort, selection, openId, onOpen, compact, showAccount, columns, groupBy, highlightId, density, groups, collapsed, onToggleGroup, actions, readOnlyAccountIds, spansYears = false, onRowKey, onPickCell,
  virtualize, columnWidths, onResizeColumn, onSortDir, onGroupBy, onFilterBy, onHideColumn,
}: TradeTableProps) {
  const defs = useMemo(() => resolveColumns(columns, { showAccount, compact }), [columns, showAccount, compact]);
  const symbolPin = useMemo(() => symbolPinWidth(trades), [trades]);

  const cols = useMemo<DataColumn<Trade>[]>(() => {
    const cell = (id: string): DataColumn<Trade>['cell'] => (t) => {
      const acc = t.accountId ? accounts.get(t.accountId) : undefined;
      const pickable = (kind: CellKind, trade: Trade, text: string) =>
        onPickCell && !(trade.accountId && readOnlyAccountIds?.has(trade.accountId)) ? (
          <button type="button" onClick={(e) => onPickCell(kind, trade, e.currentTarget)} title={text} className="-mx-1 block max-w-full truncate rounded px-1 text-left text-foreground-soft hover:bg-muted [@media(pointer:coarse)]:pointer-events-none">
            <span className="sr-only">Change {kind}: </span>
            {text}
          </button>
        ) : (
          <span className="truncate text-foreground-soft">{text}</span>
        );
      const cur = acc?.currency;
      switch (id) {
        case 'date':
          return <span className="whitespace-nowrap font-mono tabular-nums text-foreground-soft">{dateCell(t, groupBy, spansYears)}</span>;
        case 'symbol':
          return <span className="block truncate whitespace-nowrap font-medium" title={optionSymbol(t)}>{optionSymbol(t)}</span>;
        case 'side':
          return <DirectionChip direction={t.direction} />;
        case 'account':
          return acc ? (
            <span className="flex items-center gap-1 truncate text-foreground-soft">
              {readOnlyAccountIds?.has(acc.id) && <Lock className="h-3 w-3 shrink-0" strokeWidth={1.5} aria-label="Read-only account" />}
              {acc.name}
            </span>
          ) : (
            <span className="rounded-sm border border-border px-1.5 text-xs text-muted-foreground">No account</span>
          );
        case 'asset':
          return <span className="capitalize text-foreground-soft">{t.assetClass ?? '—'}</span>;
        case 'qty':
          return <span className="font-mono tabular-nums">{formatQuantity(t.size)}</span>;
        case 'entry':
          return <span className="font-mono tabular-nums">{formatPrice(t.entryPrice)}</span>;
        case 'exit':
          return <span className="font-mono tabular-nums">{formatPrice(t.exitPrice)}</span>;
        case 'stop':
          return <span className="font-mono tabular-nums">{t.stopLoss ? formatPrice(t.stopLoss) : '—'}</span>;
        case 'target':
          return <span className="font-mono tabular-nums">{t.takeProfit ? formatPrice(t.takeProfit) : '—'}</span>;
        case 'opened':
          return <span className="whitespace-nowrap font-mono tabular-nums text-foreground-soft">{formatDateShort(t.entryDate)} {formatTime(t.entryDate)}</span>;
        case 'hold':
          return <span className="font-mono tabular-nums">{formatDurationMinutes(holdingMinutes(t))}</span>;
        case 'fees':
          return <span className="font-mono tabular-nums">{t.fees !== undefined ? formatMoney(t.fees, cur) : '—'}</span>;
        case 'pnl':
          return <Money value={t.pnl} currency={cur} className="whitespace-nowrap" />;
        case 'gross':
          return t.grossPnl !== undefined ? <Money value={t.grossPnl} currency={cur} className="whitespace-nowrap" /> : <span className="text-muted-foreground">—</span>;
        case 'risk': {
          const r = riskAmount(t);
          return <span className="font-mono tabular-nums">{r === null ? '—' : formatMoney(r, cur)}</span>;
        }
        case 'r':
          return <RMultiple value={realisedR(t)} />;
        case 'planned': {
          const p = plannedRR(t);
          return <span className="font-mono tabular-nums">{p === null ? '—' : p.toFixed(2)}</span>;
        }
        case 'outcome':
          return <span className="text-foreground-soft">{OUTCOME_LABEL[t.outcome] ?? t.outcome}</span>;
        case 'strategy':
          return pickable('strategy', t, t.strategy || t.setup || '—');
        case 'session':
          return pickable('session', t, t.session || '—');
        case 'market':
          return pickable('market', t, t.marketCondition || '—');
        case 'mistakes':
          return pickable('mistakes', t, firstPlus(t.mistakes));
        case 'broken':
          return <span className="text-foreground-soft">{t.brokenRuleIds?.length ? `${t.brokenRuleIds.length} broken` : '—'}</span>;
        case 'tags':
          return pickable('tags', t, firstPlus(t.tags));
        case 'lesson':
          return <span className="block max-w-[200px] truncate text-foreground-soft">{t.keyLesson || '—'}</span>;
        case 'news':
          return <span className="block max-w-[120px] truncate text-foreground-soft">{t.newsEvents?.[0] || '—'}</span>;
        case 'journal':
          return <JournalMarks t={t} />;
        default:
          return null;
      }
    };

    const base: DataColumn<Trade>[] = defs.map((d) => ({
      id: d.id,
      header: d.label,
      sortable: !!d.sort,
      align: d.align,
      pinned: d.pinned,
      pinWidth: d.pinned ? (d.id === 'symbol' ? symbolPin : PIN_WIDTH[d.id]) : undefined,
      resizable: !d.pinned,
      cell: cell(d.id),
    }));
    base.push({
      id: 'menu',
      header: 'Row actions',
      srHeader: true,
      pinned: 'right',
      pinWidth: 40,
      align: 'right',
      cell: (t) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" tabIndex={-1} data-row-menu aria-label={`Actions for ${t.symbol}`} className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          {/* React events bubble out of the portal to the row, whose click and Enter open the trade. */}
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => actions.onEdit(t.id)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.onDuplicate(t.id)}>
              <span>
                {copy.trades.duplicate.label}
                <span className="block text-xs text-muted-foreground">{copy.trades.duplicate.hint}</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => actions.onDelete(t.id)} variant="destructive">Delete…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
    return base;
  }, [defs, accounts, groupBy, spansYears, actions, readOnlyAccountIds, onPickCell, symbolPin]);

  const sortKeyById = useMemo(() => new Map(defs.map((d) => [d.id, d.sort])), [defs]);
  const dataSort: DataSort | undefined = useMemo(() => {
    const id = defs.find((d) => d.sort === sort.key)?.id;
    return id ? { id, dir: sort.dir } : undefined;
  }, [defs, sort]);

  // Free-text journal columns are at least their default width and grow to the longest value shown (the table scrolls
  // sideways instead of cutting the text); a width the user set wins.
  const widths = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of defs) if (FREE_TEXT.has(d.id) && !d.pinned) out[d.id] = freeTextWidth(d.id, d.width ?? 0, trades);
    return { ...out, ...(columnWidths ?? {}) };
  }, [defs, columnWidths, trades]);

  const renderHeaderMenu = (c: DataColumn<Trade>) => {
    const def = defs.find((d) => d.id === c.id);
    if (!def) return null;
    const key = def.sort as SortKey | undefined;
    const width = columnWidths?.[c.id] ?? def.width;
    const items: React.ReactNode[] = [];
    if (key && onSortDir) {
      items.push(<DropdownMenuItem key="asc" onSelect={() => onSortDir(key, 'asc')}>Sort ascending</DropdownMenuItem>, <DropdownMenuItem key="desc" onSelect={() => onSortDir(key, 'desc')}>Sort descending</DropdownMenuItem>);
    }
    if (GROUP_OF[c.id] && onGroupBy) items.push(<DropdownMenuItem key="group" onSelect={() => onGroupBy(GROUP_OF[c.id])}>Group by {def.label}</DropdownMenuItem>);
    if (FILTER_OF[c.id] && onFilterBy) items.push(<DropdownMenuItem key="filter" onSelect={() => onFilterBy(FILTER_OF[c.id])}>Filter by {def.label}…</DropdownMenuItem>);
    if (!def.pinned && onResizeColumn) {
      items.push(
        <DropdownMenuSeparator key="s1" />,
        <DropdownMenuItem key="narrow" onSelect={() => onResizeColumn(c.id, Math.max(56, width - 16))}>Narrower</DropdownMenuItem>,
        <DropdownMenuItem key="wide" onSelect={() => onResizeColumn(c.id, width + 16)}>Wider</DropdownMenuItem>,
        <DropdownMenuItem key="fit" onSelect={() => onResizeColumn(c.id, null)}>Fit width</DropdownMenuItem>,
      );
    }
    if (!def.pinned && onHideColumn) items.push(<DropdownMenuSeparator key="s2" />, <DropdownMenuItem key="hide" onSelect={() => onHideColumn(c.id)}>Hide column</DropdownMenuItem>);
    return items.length ? <>{items}</> : null;
  };

  const dataGroups: DataGroup<Trade>[] | undefined = groups?.map((g) => ({
    key: g.key,
    label: g.label,
    rows: g.trades,
    meta: `${g.trades.length} · ${g.wins}W ${g.losses}L`,
    summary: (
      <>
        {g.totalR !== null && <RMultiple value={g.totalR} />}
        {g.net.map((n) => (
          <Money key={n.currency} value={n.value} currency={n.currency} />
        ))}
      </>
    ),
  }));

  return (
    <DataTable
      onRowKey={onRowKey}
      caption="Trades"
      rows={trades}
      columns={cols}
      getRowId={(t) => t.id}
      sort={dataSort}
      onSort={(id) => {
        const key = sortKeyById.get(id);
        if (key) onSort(key);
      }}
      selection={selection}
      onRowOpen={(t) => onOpen(t.id)}
      openId={openId}
      density={density}
      groups={dataGroups}
      collapsed={collapsed}
      onToggleGroup={onToggleGroup}
      highlightId={highlightId}
      virtualize={virtualize}
      renderHeaderMenu={renderHeaderMenu}
      columnWidths={widths}
      onResizeColumn={onResizeColumn}
    />
  );
}
