export interface DistributionRow {
  /** Raw key from `/stats` (a rule id for broken rules); `name` is what is shown. */
  key: string;
  name: string;
  trades: number;
  wins: number;
  winRate: number;
  net: number;
  /** Present only when the server sends it per segment (BE-R4 extension); never estimated in the browser. */
  avgR?: number;
  /** Value for the Trades filter; null when Trades cannot filter by it, '' for "no strategy". Absent on mistake / rule rows. */
  drill?: string | null;
}

type Entry = { count?: number; wins?: number; pnl?: number; totalPnl?: number; avgR?: number };

/** Turns a `/stats` distribution record into rows, most trades first; names with no trades are dropped. */
export function distributionRows(record: Record<string, Entry> | undefined, opts: { resolveName?: (key: string) => string } = {}): DistributionRow[] {
  return Object.entries(record ?? {})
    .map(([key, e]) => {
      const trades = e.count ?? 0;
      const wins = e.wins ?? 0;
      const row: DistributionRow = { key, name: opts.resolveName ? opts.resolveName(key) : key, trades, wins, winRate: trades ? (wins / trades) * 100 : 0, net: e.pnl ?? e.totalPnl ?? 0 };
      if (typeof e.avgR === 'number') row.avgR = e.avgR;
      return row;
    })
    .filter((r) => r.trades > 0)
    .sort((a, b) => b.trades - a.trades || a.name.localeCompare(b.name));
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Monday-first display order of `WEEKDAY_NAMES`. */
export const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** A segment below this many trades is listed but greyed and left out of "what is working". */
export const MIN_SEGMENT_TRADES = 5;

export type DimensionId = 'symbol' | 'strategy' | 'session' | 'weekday' | 'hour' | 'direction' | 'assetClass';

export interface Dimension {
  id: DimensionId;
  label: string;
  /** Free plans get Symbol only (CONTRACT §4). */
  free: boolean;
}

export const DIMENSIONS: Dimension[] = [
  { id: 'symbol', label: 'Symbol', free: true },
  { id: 'strategy', label: 'Strategy', free: false },
  { id: 'session', label: 'Session', free: false },
  { id: 'weekday', label: 'Weekday', free: false },
  { id: 'hour', label: 'Hour', free: false },
  { id: 'direction', label: 'Direction', free: false },
  { id: 'assetClass', label: 'Asset class', free: false },
];

interface Segment {
  trades: number;
  wins: number;
  net: number;
  avgR: number | null;
}

/** `/stats` `segments`: one record per dimension, keyed by the raw value (weekday 0 = Sunday, hour `00`…`23`, direction BUY / SELL). */
export type Segments = Partial<Record<DimensionId, Record<string, Segment>>>;

interface StatsLike {
  [key: string]: unknown;
  segments?: Segments;
  weekdayHour?: { day: number; hour: number; trades: number; wins: number; net: number }[];
  rDistribution?: { buckets: { label: string; count: number }[]; noStop: number };
}

/**
 * Realised R above this magnitude is a missing lot size, not a result: the server divides by risk × quantity × a contract
 * multiplier it defaults to 1 (JournalAWSSetup segments.ts `realizedR`), which inflates R into the thousands for
 * trades stored without one. Such a figure is not shown.
 */
const MAX_PLAUSIBLE_R = 50;

/** What the server stores for a trade without the field. */
const UNKNOWN = 'Unknown';
const NONE_LABEL: Partial<Record<DimensionId, string>> = { strategy: 'No strategy', session: 'No session', assetClass: 'No asset class', symbol: 'No symbol' };

export function availableDimensions(stats: StatsLike | undefined): Dimension[] {
  return DIMENSIONS.filter((d) => Object.keys(stats?.segments?.[d.id] ?? {}).length > 0 || d.free);
}

function segmentName(dim: DimensionId, key: string): string {
  if (key === UNKNOWN) return NONE_LABEL[dim] ?? key;
  if (dim === 'weekday') return WEEKDAY_NAMES[Number(key)] ?? key;
  if (dim === 'hour') return `${key.padStart(2, '0')}:00`;
  if (dim === 'direction') return key === 'SELL' ? 'Short' : 'Long';
  return key;
}

/** The value Trades filters by for a row (`drill`), or null when Trades has no filter for it. */
function drillValue(dim: DimensionId, key: string): string | null {
  if (key === UNKNOWN) return dim === 'strategy' ? '' : null;
  if (dim === 'weekday') return WEEKDAY_NAMES[Number(key)] ?? null;
  if (dim === 'hour') return String(Number(key));
  if (dim === 'direction') return key === 'SELL' ? 'SHORT' : 'LONG';
  return key;
}

/** Rows of one dimension from the server's segments. `drill` is null when the row cannot open Trades. */
export function explorerRows(stats: StatsLike | undefined, dim: DimensionId): DistributionRow[] {
  const seg = stats?.segments?.[dim] ?? {};
  return Object.entries(seg)
    .filter(([, s]) => s.trades > 0)
    .map(([key, s]) => ({
      key,
      name: segmentName(dim, key),
      trades: s.trades,
      wins: s.wins,
      winRate: (s.wins / s.trades) * 100,
      net: s.net,
      ...(typeof s.avgR === 'number' && Math.abs(s.avgR) <= MAX_PLAUSIBLE_R ? { avgR: s.avgR } : {}),
      drill: drillValue(dim, key),
    }))
    .sort((a, b) => (dim === 'weekday' ? (Number(a.key) + 6) % 7 - ((Number(b.key) + 6) % 7) : dim === 'hour' ? Number(a.key) - Number(b.key) : b.trades - a.trades || a.name.localeCompare(b.name)));
}

export interface ExplorerTotals {
  trades: number;
  wins: number;
  winRate: number;
  net: number;
  expectancy: number;
}

export function explorerTotals(rows: DistributionRow[]): ExplorerTotals {
  const trades = rows.reduce((s, r) => s + r.trades, 0);
  const wins = rows.reduce((s, r) => s + r.wins, 0);
  const net = rows.reduce((s, r) => s + r.net, 0);
  return { trades, wins, winRate: trades ? (wins / trades) * 100 : 0, net, expectancy: trades ? net / trades : 0 };
}

export interface Standout {
  dimension: string;
  dimId: DimensionId;
  row: DistributionRow;
}

/**
 * Best and worst segments (at least 5 trades) across the dimensions the caller has data for, by net P&L:
 * up to `each` winners (net > 0) and `each` losers (net < 0). Rows without a value ("No strategy") are not segments.
 */
export function whatIsWorking(sets: { dim: Dimension; rows: DistributionRow[] }[], each = 2): { working: Standout[]; notWorking: Standout[] } {
  const all: Standout[] = sets.flatMap(({ dim, rows }) => rows.filter((r) => r.trades >= MIN_SEGMENT_TRADES && r.key !== UNKNOWN).map((row) => ({ dimension: dim.label, dimId: dim.id, row })));
  return {
    working: all.filter((s) => s.row.net > 0).sort((a, b) => b.row.net - a.row.net).slice(0, each),
    notWorking: all.filter((s) => s.row.net < 0).sort((a, b) => a.row.net - b.row.net).slice(0, each),
  };
}

export interface GridCell {
  trades: number;
  net: number;
  winRate: number;
}

export interface TimingGrid {
  hours: number[];
  /** Monday first. */
  rows: { day: string; cells: Record<number, GridCell | undefined> }[];
}

/** From the server's `weekdayHour` matrix; `null` when there is none. */
export function timingGrid(matrix: StatsLike['weekdayHour']): TimingGrid | null {
  if (!Array.isArray(matrix)) return null;
  const used = matrix.filter((m) => m.trades > 0);
  if (used.length === 0) return null;
  const hours = [...new Set(used.map((m) => Number(m.hour)))].sort((a, b) => a - b);
  const rows = WEEKDAY_ORDER.map((day) => {
    const cells: Record<number, GridCell | undefined> = {};
    for (const m of used.filter((x) => WEEKDAY_NAMES[Number(x.day)] === day)) cells[Number(m.hour)] = { trades: m.trades, net: m.net, winRate: (m.wins / m.trades) * 100 };
    return { day, cells };
  });
  return { hours, rows };
}

export interface RBucket {
  label: string;
  count: number;
}

const R_LABEL: Record<string, string> = {
  '<=-2': '−2R or worse',
  '-2..-1': '−2 to −1R',
  '-1..0': '−1 to 0R',
  '0..1': '0 to 1R',
  '1..2': '1 to 2R',
  '2..3': '2 to 3R',
  '>3': '3R or better',
};

/** Server R histogram with display labels; `sample` counts trades that have a stop loss. */
export function rBuckets(r: StatsLike['rDistribution']): { buckets: RBucket[]; noStop: number; sample: number } {
  const buckets = (r?.buckets ?? []).map((b) => ({ label: R_LABEL[b.label] ?? b.label, count: b.count }));
  return { buckets, noStop: r?.noStop ?? 0, sample: buckets.reduce((s, b) => s + b.count, 0) };
}
