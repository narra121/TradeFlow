import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { SCOPE_TRADE_CEILING, useGetNewestTradeQuery, useGetScopeTradesQuery } from '@/store/api/tradesApi';
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
 * e.g. the calendar loads its visible month regardless of the date range. `newestOnly` reads just the newest trade
 * of that scope in one request (`trades` has at most one entry) instead of paging all of them.
 */
export function useScopeTrades(override?: ScopeParams, options?: { skip?: boolean; newestOnly?: boolean }) {
  const filters = useAppSelector((s) => s.trades.filters);
  const params: ScopeParams = override ?? {
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
  const all = useGetScopeTradesQuery(params, { skip: options?.skip || options?.newestOnly });
  const newest = useGetNewestTradeQuery(params, { skip: options?.skip || !options?.newestOnly });
  const query = options?.newestOnly ? newest : all;
  // `currentData`, not `data`: RTK keeps `data` from the last scope while a new account or range loads, which would show
  // that scope's trades under the new one. A new scope is loading until its own answer arrives.
  const current = query.currentData;
  const trades = useMemo(() => sortNewestFirst(current ?? []), [current]);
  return {
    trades,
    isLoading: query.isLoading || (query.isFetching && current === undefined),
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    truncated: (current?.length ?? 0) >= SCOPE_TRADE_CEILING,
    params,
  };
}
