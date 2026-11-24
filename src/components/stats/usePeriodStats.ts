import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useGetStatsQuery } from '@/store/api';
import { useAppSelector } from '@/store/hooks';
import { previousPeriod } from '@/lib/dashboard';
import type { DatePreset } from '@/lib/scope';
import { useCompare } from './useCompare';
import { useScopeCapital } from './useScopeCapital';

interface Options {
  includeEquityCurve?: boolean;
  /** Do not request the statistics at all (a locked tab never asks for its data). */
  skip?: boolean;
}

interface StatsScope {
  accountId: string;
  startDate: string;
  endDate: string;
  datePreset: DatePreset;
}

/** The requests of usePeriodStats; shell/prefetchPage.ts makes the same ones before a visit. */
export function periodStatsArgs(
  filters: StatsScope,
  { totalCapital, accountsReady, compareOn, includeEquityCurve, skip }: Options & { totalCapital: number; accountsReady: boolean; compareOn: boolean },
) {
  const base = { accountId: filters.accountId, totalCapital };
  const prevRange = previousPeriod(filters.datePreset, filters.startDate, filters.endDate);
  const ready = accountsReady && !skip;
  return {
    current: ready ? { ...base, startDate: filters.startDate, endDate: filters.endDate, includeEquityCurve } : skipToken,
    previous: ready && compareOn && prevRange ? { ...base, startDate: prevRange.startDate, endDate: prevRange.endDate } : skipToken,
    prevRange,
  } as const;
}

/**
 * `/stats` for the scope in the store, plus the equal previous period when `Compare` is on (and the range is not
 * All time). A failed or pending comparison only hides the deltas.
 */
export function usePeriodStats({ includeEquityCurve, skip }: Options = {}) {
  const filters = useAppSelector((s) => s.trades.filters);
  const { totalCapital, accountsReady } = useScopeCapital();
  const [compareOn] = useCompare();

  const args = useMemo(
    () => periodStatsArgs(filters, { totalCapital, accountsReady, compareOn, includeEquityCurve, skip }),
    [filters, totalCapital, accountsReady, compareOn, includeEquityCurve, skip],
  );
  const { prevRange } = args;
  const current = useGetStatsQuery(args.current);
  const previous = useGetStatsQuery(args.previous);
  // `currentData`, not `data`: RTK keeps `data` from the last scope while a new account or range loads, which would show
  // that scope's figures under the new one. A new scope is loading until its own answer arrives.
  const stats = current.currentData;
  const prevStats = previous.currentData;
  // An empty period answers zeros; a change against them would be invented, so it is not a comparison.
  const prevEmpty = !!(compareOn && prevRange && prevStats && !prevStats.totalTrades);

  return {
    stats,
    isLoading: current.isLoading || (current.isFetching && !stats),
    isFetching: current.isFetching,
    isError: current.isError,
    error: current.error,
    refetch: () => void current.refetch(),
    /** Present only while Compare is on, the range has a predecessor and the request succeeded. */
    prev: compareOn && prevRange && !prevEmpty ? prevStats : undefined,
    /** Compare is on and the previous period has no trades. */
    prevEmpty,
    prevRange: compareOn ? prevRange : null,
    canCompare: prevRange !== null,
    accountsReady,
    totalCapital,
  };
}
