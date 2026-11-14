import { WEEKDAY_NAMES } from '@/lib/format';
import type { Dimension as AnalysisDimension, Segment as AnalysisSegment, Verdict } from '@/types/analysis';

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
  /** Trades behind `avgR` (those with a stop and an exit price); present when the server sends it. */
  rCount?: number;
  /** Value for the Trades filter; null when Trades cannot filter by it, '' for "no strategy". Absent on mistake / rule rows. */
  drill?: string | null;
  /** The rest are present on rows from `GET /analysis` segments only. Null profit factor = no losing trade. */
  profitFactor?: number | null;
  verdict?: Verdict;
  tradeIds?: string[];
  /** Trades-per-day bands: days in the band. */
  days?: number;
}

/** Rows of `GET /analysis` segments in the server's order (natural order for ordered dimensions, else by evidence). */
export function segmentRows(segments: AnalysisSegment[] | undefined): DistributionRow[] {
  return (segments ?? [])
    .filter((s) => s.trades > 0)
    .map((s) => ({
      key: s.key,
      name: s.name,
      trades: s.trades,
      wins: s.wins,
      winRate: s.winRate * 100,
      net: s.net,
      ...(s.avgR != null ? { avgR: s.avgR } : {}),
      profitFactor: s.profitFactor,
      verdict: s.verdict,
      tradeIds: s.tradeIds,
      ...(s.days != null ? { days: s.days } : {}),
    }));
}

type Entry = { count?: number; wins?: number; pnl?: number; totalPnl?: number; avgR?: number | null; rCount?: number };

/** Turns a `/stats` distribution record into rows, most trades first; names with no trades are dropped. */
export function distributionRows(record: Record<string, Entry> | undefined, opts: { resolveName?: (key: string) => string } = {}): DistributionRow[] {
  return Object.entries(record ?? {})
    .map(([key, e]) => {
      const trades = e.count ?? 0;
      const wins = e.wins ?? 0;
      const row: DistributionRow = { key, name: opts.resolveName ? opts.resolveName(key) : key, trades, wins, winRate: trades ? (wins / trades) * 100 : 0, net: e.pnl ?? e.totalPnl ?? 0 };
      if (typeof e.avgR === 'number') row.avgR = e.avgR;
      if (typeof e.rCount === 'number') row.rCount = e.rCount;
      return row;
    })
    .filter((r) => r.trades > 0)
    .sort((a, b) => b.trades - a.trades || a.name.localeCompare(b.name));
}

/** Monday-first display order of `WEEKDAY_NAMES`. */
export const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** A segment below this many trades is listed but greyed and left out of "what is working". */
export const MIN_SEGMENT_TRADES = 5;

export type DimensionId = 'symbol' | 'strategy' | 'session' | 'weekday' | 'hour' | 'direction' | 'assetClass';

export interface Dimension {
  id: DimensionId;
  label: string;
  /** Open without Pro analytics; the trial and Pro both have them (CONTRACT revision 4), so only a plan without them sees the lock. */
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
      ...(typeof s.avgR === 'number' ? { avgR: s.avgR } : {}),
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

export interface Finding {
  dim: AnalysisDimension;
  seg: AnalysisSegment;
}

/** Weekday and hour rows are named only when they meet the evidence rule (report §4.2). */
const VERDICT_ONLY: AnalysisDimension[] = ['weekday', 'hour'];

/**
 * "What is working · what is not" from the server's verdicts: edges and leaks exactly as judged (largest |avg R| first);
 * everything else with at least 5 trades and an R is a pattern to watch, ranked by how far its average R sits from the
 * period's, scaled by √trades (more trades, more weight). Net P&L does not rank anything. A segment holding every
 * trade of the period (one direction only, say) is not a pattern.
 */
export function evidenceFindings(segments: Partial<Record<AnalysisDimension, AnalysisSegment[]>>, dims: AnalysisDimension[], overallR: number | null, tradeCount: number, watchMax = 4): { edges: Finding[]; leaks: Finding[]; watch: Finding[] } {
  const all = dims.flatMap((dim) => (segments[dim] ?? []).map((seg) => ({ dim, seg })));
  const byR = (dir: 1 | -1) => (a: Finding, b: Finding) => dir * ((b.seg.avgR ?? 0) - (a.seg.avgR ?? 0));
  const score = (f: Finding) => Math.abs((f.seg.avgR ?? 0) - (overallR ?? 0)) * Math.sqrt(f.seg.trades);
  return {
    edges: all.filter((f) => f.seg.verdict === 'edge').sort(byR(1)),
    leaks: all.filter((f) => f.seg.verdict === 'leak').sort(byR(-1)),
    watch: all
      .filter((f) => f.seg.verdict === 'watch' && f.seg.avgR != null && f.seg.trades >= MIN_SEGMENT_TRADES && f.seg.trades < tradeCount && !VERDICT_ONLY.includes(f.dim))
      .sort((a, b) => score(b) - score(a))
      .slice(0, watchMax),
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

export interface RealisedRStat {
  /** Null when no trade has a stop and an exit price, or the server predates realised R. */
  avgR: number | null;
  sdR: number | null;
  rCount: number;
  /** Average planned R:R; null when no trade recorded one. */
  planned: number | null;
  /** The sample under the figure ("45 trades with a stop"); empty when unknown. */
  note: string;
  /** The plan beside the result ("planned R:R 2.00"), or "planned, not realised" when only the plan is shown; may be empty. */
  plan: string;
  /** Popover sample text; empty without realised R. */
  sample: string;
}

type RStatsLike = { avgR?: number | null; sdR?: number | null; rCount?: number; avgRiskReward?: number; totalTrades?: number };

/** Realised average R of a `/stats` aggregate with its sample, falling back to the planned R:R when no trade has an R. */
export function realisedRStat(stats: RStatsLike | undefined): RealisedRStat {
  const avgR = typeof stats?.avgR === 'number' ? stats.avgR : null;
  const rCount = avgR === null ? 0 : (stats?.rCount ?? 0);
  const sdR = avgR !== null && typeof stats?.sdR === 'number' ? stats.sdR : null;
  const planned = stats?.avgRiskReward && stats.avgRiskReward > 0 ? stats.avgRiskReward : null;
  const total = stats?.totalTrades ?? 0;
  if (avgR === null) {
    // null = the server counted no trade with a stop; absent = a server that sends no realised R.
    return { avgR, sdR, rCount, planned, note: stats?.avgR === null ? 'No trade with a stop' : '', plan: planned === null ? '' : 'planned, not realised', sample: '' };
  }
  return {
    avgR,
    sdR,
    rCount,
    planned,
    note: `${rCount} ${rCount === 1 ? 'trade' : 'trades'} with a stop`,
    plan: planned === null ? '' : `planned R:R ${planned.toFixed(2)}`,
    sample: `${rCount} of ${total} trades have a stop and an exit price${sdR === null ? '' : `; spread (standard deviation) ${sdR.toFixed(2)}R`}. Before fees.`,
  };
}

/** `note` and `plan` as one line. */
export function rNoteLine(r: RealisedRStat): string {
  if (!r.note) return r.plan.charAt(0).toUpperCase() + r.plan.slice(1);
  return r.plan ? `${r.note} · ${r.plan}` : r.note;
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
