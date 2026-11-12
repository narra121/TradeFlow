import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useGetStatsQuery } from '@/store/api';
import { useAppSelector } from '@/store/hooks';
import { previousPeriod } from '@/lib/dashboard';
import { useCompare } from './useCompare';
import { useScopeCapital } from './useScopeCapital';

interface Options {
  includeEquityCurve?: boolean;
  /** Do not request the statistics at all (a locked tab never asks for its data). */
  skip?: boolean;
}

/**
 * `/stats` for the scope in the store, plus the equal previous period when `Compare` is on (and the range is not
 * All time). A failed or pending comparison only hides the deltas.
 */
export function usePeriodStats({ includeEquityCurve, skip }: Options = {}) {
  const filters = useAppSelector((s) => s.trades.filters);
  const { totalCapital, accountsReady } = useScopeCapital();
  const [compareOn] = useCompare();

  const base = { accountId: filters.accountId, totalCapital };
  const current = useGetStatsQuery(accountsReady && !skip ? { ...base, startDate: filters.startDate, endDate: filters.endDate, includeEquityCurve } : skipToken);

  const prevRange = useMemo(() => previousPeriod(filters.datePreset, filters.startDate, filters.endDate), [filters.datePreset, filters.startDate, filters.endDate]);
  const prevArgs = accountsReady && !skip && compareOn && prevRange ? { ...base, startDate: prevRange.startDate, endDate: prevRange.endDate } : skipToken;
  const previous = useGetStatsQuery(prevArgs);

  return {
    stats: current.data,
    isLoading: current.isLoading,
    isFetching: current.isFetching,
    isError: current.isError,
    error: current.error,
    refetch: () => void current.refetch(),
    /** Present only while Compare is on, the range has a predecessor and the request succeeded. */
    prev: compareOn && prevRange ? previous.data : undefined,
    prevRange: compareOn ? prevRange : null,
    canCompare: prevRange !== null,
    accountsReady,
    totalCapital,
  };
}
