import { reportRange } from '@/lib/ai/insightFormat';
import type { DatePreset } from '@/lib/scope';

export const REPORT_PAGE = 50;

/** The requests InsightsView makes on open; shell/prefetchPage.ts makes the same ones before a visit. */
export function insightsQueries(filters: { datePreset: DatePreset; startDate: string; endDate: string }, selectedAccountId: string | null) {
  // "All time" has no real start and the API takes at most 366 days: longer scopes send their last 366 days, and the button says so.
  const range = reportRange(filters.datePreset, filters.startDate, filters.endDate);
  return {
    range,
    list: { limit: REPORT_PAGE },
    stats: { accountId: selectedAccountId ?? 'ALL', startDate: range.from, endDate: range.to },
  };
}
