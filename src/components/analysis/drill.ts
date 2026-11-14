import type { AggregatedStats } from '@/types/stats';
import type { PreviousPeriod } from '@/lib/dashboard';
import type { DimensionId, DistributionRow } from '@/lib/analyticsRows';
import type { Dimension, Segment } from '@/types/analysis';
import type { AnalysisState } from './useAnalysis';

export type DrillParam = 'symbol' | 'strategy' | 'session' | 'weekday' | 'hour' | 'direction' | 'assetClass' | 'mistake' | 'rule';

/**
 * Trades as a temporary view of one segment; `src=analytics` tells Trades to offer a way back. The period and
 * account are the shared scope, so they travel by themselves. Trades reads these parameters (see REQUESTS).
 */
export function tradesHref(param: DrillParam, value: string, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams({ [param]: value, ...extra, src: 'analytics' });
  return `/app/tradelog?${q.toString()}`;
}

/** What every tab receives once `/stats` has loaded. */
export interface AnalyticsContext {
  stats: AggregatedStats;
  prev?: AggregatedStats;
  prevRange: PreviousPeriod | null;
  /** Currency of every money figure; the scope's currencies are switched, never added. */
  currency?: string;
  /** Several currencies in scope: the drawdown percentage needs one account's starting balance, so it is not shown. */
  multi: boolean;
  /** An account in scope has no starting balance: the drawdown percentage would read near 100%, so it is not shown. */
  noBalance?: boolean;
  /** IANA zone the server bucketed hours and weekdays in. */
  zone: string;
  /** Pro or trialing: `advanced_analytics` is on. */
  pro: boolean;
  /** `GET /analysis` for the same scope; absent where a caller renders a tab without it. */
  analysis?: AnalysisState;
}

/** Trades link of an explorer row, or null when Trades cannot filter by that value (an empty session, for one). */
export function rowLink(dim: DimensionId, row: DistributionRow, zone?: string): string | null {
  if (row.drill === null || row.drill === undefined) return null;
  if (dim === 'strategy' && row.drill === '') return '/app/tradelog?missing=strategy&src=analytics';
  // Weekday and hour exist only in the zone `/stats` used, so the link names it.
  return tradesHref(dim, row.drill, zone && (dim === 'weekday' || dim === 'hour') ? { zone } : {});
}

/**
 * Trades filtered to a segment of `GET /analysis`, for the dimensions Trades can filter by; null for the others
 * (their rows open the trade pane on the segment's trade ids instead). Weekday and hour carry the server's zone.
 */
export function segmentHref(dim: Dimension, seg: Pick<Segment, 'key' | 'name'>, zone: string): string | null {
  switch (dim) {
    case 'symbol': return tradesHref('symbol', seg.name);
    case 'setup': return tradesHref('strategy', seg.name);
    case 'session': return tradesHref('session', seg.name);
    case 'assetClass': return tradesHref('assetClass', seg.name);
    case 'direction': return tradesHref('direction', seg.key === 'short' ? 'SHORT' : 'LONG');
    case 'weekday': return tradesHref('weekday', seg.name, { zone });
    case 'hour': return tradesHref('hour', String(Number(seg.key)), { zone });
    default: return null;
  }
}
