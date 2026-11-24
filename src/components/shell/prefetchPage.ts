import { skipToken } from '@reduxjs/toolkit/query';
import type { AppDispatch, RootState } from '@/store';
import { accountsApi } from '@/store/api/accountsApi';
import { analysisApi } from '@/store/api/analysisApi';
import { chatApi } from '@/store/api/chatApi';
import { goalsRulesApi } from '@/store/api/goalsRulesApi';
import { insightsApi } from '@/store/api/insightsApi';
import { statsApi } from '@/store/api/statsApi';
import { tradesApi } from '@/store/api/tradesApi';
import { analysisArgs, analysisScope, statsCurrencies } from '@/components/analysis/useAnalysis';
import { weekGoalsArgs } from '@/components/dashboard/useWeekGoals';
import { goalsAnchor, goalsPeriodType, goalsQueries, goalsScope } from '@/components/goals/goalsQueries';
import { periodOf } from '@/components/goals/goalMath';
import { insightsQueries } from '@/components/insights/insightsQueries';
import { readCompare } from '@/components/stats/useCompare';
import { periodStatsArgs } from '@/components/stats/usePeriodStats';
import { scopeCapital } from '@/components/stats/useScopeCapital';
import { appTodayKey } from '@/lib/appTimeZone';
import { todayScopeArgs } from '@/lib/dashboard';

/** Analytics tabs that request nothing (Tax has its own report) or only for Pro. */
const TABS_WITHOUT_STATS = ['tax', 'timing', 'risk'];

/**
 * Starts the requests the app page at `url` makes when it opens, with the same arguments, so it opens on cached data. A
 * request already cached or in flight is not repeated. Pages not listed here request nothing of their own on open.
 */
export function prefetchPage(url: URL, dispatch: AppDispatch, getState: () => RootState): void {
  const page = url.pathname.split('/')[2];
  const state = getState();
  const { filters } = state.trades;
  const { selectedAccountId } = state.accounts;
  const accountsQuery = accountsApi.endpoints.getAccounts.select()(state);
  const accounts = accountsQuery.data?.accounts ?? [];
  const accountsReady = accounts.length > 0;

  if (page === 'dashboard' || (page === 'analytics' && !TABS_WITHOUT_STATS.includes(url.searchParams.get('tab') ?? ''))) {
    const { totalCapital } = scopeCapital(accounts, selectedAccountId);
    const stats = periodStatsArgs(filters, { totalCapital, accountsReady, compareOn: readCompare(), includeEquityCurve: page === 'dashboard' || undefined });
    const scope = analysisScope(filters.accountId, filters.startDate, filters.endDate);
    // /analysis waits for the currencies in the /stats answer, as useAnalysis does.
    const analysis = () => {
      const args = analysisArgs(scope, statsCurrencies(getState(), scope, scope.accountId === 'ALL'), accountsReady, false);
      if (args !== skipToken) dispatch(analysisApi.util.prefetch('getAnalysis', args, {}));
    };
    if (stats.current === skipToken) analysis();
    else void dispatch(statsApi.endpoints.getStats.initiate(stats.current, { subscribe: false })).then(analysis);
    if (stats.previous !== skipToken) dispatch(statsApi.util.prefetch('getStats', stats.previous, {}));
    if (page === 'dashboard') {
      dispatch(tradesApi.util.prefetch('getScopeTrades', todayScopeArgs(filters.accountId, appTodayKey()), {}));
      const week = weekGoalsArgs(selectedAccountId, totalCapital, accountsReady);
      if (week !== skipToken) dispatch(goalsRulesApi.util.prefetch('getGoalsProgress', week, {}));
    }
  } else if (page === 'goals') {
    const ref = periodOf(goalsPeriodType(url.searchParams.get('period')), goalsAnchor(url.searchParams.get('on')));
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;
    const q = goalsQueries(ref, goalsScope(accounts, selectedAccount), accountsQuery.isLoading || !accountsReady);
    dispatch(goalsRulesApi.util.prefetch('getRulesAndGoals', q.rulesGoals, {}));
    dispatch(goalsRulesApi.util.prefetch('getRulesAndGoals', q.sibling, {}));
    dispatch(goalsRulesApi.util.prefetch('getRules', undefined, {}));
    if (!q.progressSkip) dispatch(goalsRulesApi.util.prefetch('getGoalsProgress', q.progress, {}));
    if (!q.tradesSkip) dispatch(tradesApi.util.prefetch('getScopeTrades', q.trades, {}));
  } else if (page === 'insights') {
    const q = insightsQueries(filters, selectedAccountId);
    dispatch(insightsApi.util.prefetch('listInsights', q.list, {}));
    dispatch(insightsApi.util.prefetch('getInsightSettings', undefined, {}));
    dispatch(statsApi.util.prefetch('getStats', q.stats, {}));
  } else if (page === 'chat') {
    dispatch(chatApi.util.prefetch('listChatSessions', undefined, {}));
  }
}
