import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useGetAnalysisQuery, type AnalysisScope } from '@/store/api/analysisApi';
import { statsApi } from '@/store/api/statsApi';
import { useAppSelector } from '@/store/hooks';
import { useScopeCapital } from '@/components/stats/useScopeCapital';
import { useTradeParam } from '@/hooks/useTradeParam';
import type { Analysis } from '@/types/analysis';

export interface AnalysisState {
  data?: Analysis;
  scope: AnalysisScope;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  /** The currencies of a 422 MIXED_CURRENCY answer (All accounts in several currencies); null otherwise. */
  mixed: string[] | null;
  refetch: () => void;
}

/** The currency list of a MIXED_CURRENCY error, or null for any other result. */
export function mixedCurrencies(error: unknown): string[] | null {
  const data = (error as { data?: { errorCode?: string; error?: { code?: string; currencies?: unknown } } } | undefined)?.data;
  if (data?.errorCode !== 'MIXED_CURRENCY' && data?.error?.code !== 'MIXED_CURRENCY') return null;
  const list = data?.error?.currencies;
  return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string') : [];
}

type StatsArgs = { accountId?: string; startDate?: string; endDate?: string } | undefined;

/**
 * The currencies of All accounts in the period from the `/stats` answer for the same scope, which every page that
 * shows the analysis (Analytics, Dashboard) requests: null until it arrives, 'unknown' when it failed. Trades without
 * an account ('UNKNOWN') are not counted, as on the server.
 */
function useStatsCurrencies(scope: AnalysisScope, active: boolean): string[] | null | 'unknown' {
  return useAppSelector((state) => {
    if (!active) return 'unknown';
    let failed = false;
    for (const args of statsApi.util.selectCachedArgsForQuery(state, 'getStats') as StatsArgs[]) {
      if ((args?.accountId || 'ALL') !== 'ALL' || args?.startDate !== scope.from || args?.endDate !== scope.to) continue;
      const r = statsApi.endpoints.getStats.select(args)(state);
      if (r.isSuccess) return (r.data as { currencies?: string[] }).currencies ?? [];
      if (r.isError) failed = true;
    }
    return failed ? 'unknown' : null;
  });
}

/**
 * `GET /analysis` for the shared scope (account and period in the store). `skip` never requests it (a locked tab).
 * All accounts that `/stats` shows in several currencies are not asked: the server would answer 422 MIXED_CURRENCY.
 */
export function useAnalysis({ skip = false }: { skip?: boolean } = {}): AnalysisState {
  const filters = useAppSelector((s) => s.trades.filters);
  const { accountsReady } = useScopeCapital();
  const scope = useMemo<AnalysisScope>(() => ({ accountId: filters.accountId || 'ALL', from: filters.startDate, to: filters.endDate }), [filters.accountId, filters.startDate, filters.endDate]);
  const known = useStatsCurrencies(scope, !skip && scope.accountId === 'ALL');
  const knownMixed = useMemo(() => {
    const list = Array.isArray(known) ? known.filter((c) => c !== 'UNKNOWN') : [];
    return list.length > 1 ? [...list].sort() : null;
  }, [known]);
  const waiting = known === null;
  const q = useGetAnalysisQuery(accountsReady && !skip && !waiting && !knownMixed ? scope : skipToken);
  const mixed = knownMixed ?? (q.isError ? mixedCurrencies(q.error) : null);
  // currentData, not data: after a scope change the previous account's figures (and currency) must not show.
  return {
    data: q.isError || knownMixed ? undefined : q.currentData,
    scope,
    isLoading: !skip && !mixed && !q.isError && (!accountsReady || waiting || !q.currentData),
    isError: q.isError && mixed === null,
    error: q.error,
    mixed,
    refetch: () => void q.refetch(),
  };
}

/** The pane steps through at most this many cited trades; the id list travels in the URL. */
export const MAX_PANE_IDS = 200;

/** Opens the trade pane on the first id, with Prev / Next walking the list (as AI reports cite trades). */
export function useOpenTrades(): (ids: string[]) => void {
  const trade = useTradeParam();
  return (ids) => {
    if (ids.length) trade.openTrade(ids[0], { ids: ids.slice(0, MAX_PANE_IDS) });
  };
}
