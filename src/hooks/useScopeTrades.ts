import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { SCOPE_TRADE_CEILING, useGetScopeTradesQuery } from '@/store/api/tradesApi';
import type { Trade } from '@/types/trade';

export interface ScopeParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  /** Only trades saved by this import (`GET /trades?importBatchId=`). */
  importBatchId?: string;
}

export function tradeTime(t: Trade): number {
  const d = new Date(t.exitDate || t.entryDate).getTime();
  return Number.isNaN(d) ? 0 : d;
}

/** Newest first; trades with equal times keep a stable order by id. */
export function sortNewestFirst(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => tradeTime(b) - tradeTime(a) || (a.id < b.id ? 1 : -1));
}

/**
 * Every trade in the current scope (account + date range from the store) unless `override` narrows it,
 * e.g. the calendar loads its visible month regardless of the date range.
 */
export function useScopeTrades(override?: ScopeParams, options?: { skip?: boolean }) {
  const filters = useAppSelector((s) => s.trades.filters);
  const params: ScopeParams = override ?? {
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
  const query = useGetScopeTradesQuery(params, { skip: options?.skip });
  const trades = useMemo(() => sortNewestFirst(query.data ?? []), [query.data]);
  return {
    trades,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    truncated: (query.data?.length ?? 0) >= SCOPE_TRADE_CEILING,
    params,
  };
}
