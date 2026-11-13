import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useGetGoalsProgressQuery } from '@/store/api';
import { useScopeCapital } from '@/components/stats/useScopeCapital';
import { currentWeek, weekGoals, type WeekGoal } from '@/lib/dashboard';
import { appTodayKey } from '@/lib/appTimeZone';

export interface WeekGoalsState {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  /** Tracks of the goals the user set; empty when none are set. */
  goals: WeekGoal[];
  /** Rule breaks recorded this week across the scope. */
  brokenRules: number;
  /** At least one rule exists, so `No rules broken` is a statement and not an absence. */
  hasRules: boolean;
}

/** Current-week goal progress for the account in scope (the dashboard's Today strip and Goals panel). */
export function useWeekGoals(): WeekGoalsState {
  const { selectedAccountId, totalCapital, accountsReady, drawdownBasis } = useScopeCapital();
  const todayKey = appTodayKey();
  const week = useMemo(() => currentWeek(), [todayKey]); // eslint-disable-line react-hooks/exhaustive-deps -- the week changes only when the day does
  const q = useGetGoalsProgressQuery(
    accountsReady ? { accountId: selectedAccountId || 'ALL', startDate: week.start, endDate: week.end, period: 'weekly', periodKey: week.periodKey, currentPeriod: true, totalCapital } : skipToken,
  );
  return useMemo(() => {
    const data = q.data;
    const setTypes = (data?.goals ?? []).filter((g) => g.period === 'weekly').map((g) => g.goalType);
    // A drawdown limit needs one currency and a starting balance; otherwise the server's figure would be a percentage of nothing.
    const goals = weekGoals(data?.goalProgress, setTypes).filter((g) => g.type !== 'maxDrawdown' || drawdownBasis === 'ok');
    const broken = Object.values(data?.ruleCompliance?.brokenRulesCounts ?? {}).reduce((s, n) => s + n, 0);
    return {
      isLoading: q.isLoading,
      isError: q.isError,
      error: q.error,
      goals,
      brokenRules: broken,
      hasRules: (data?.ruleCompliance?.totalRules ?? 0) > 0,
    };
  }, [q.data, q.isLoading, q.isError, q.error, drawdownBasis]);
}
