import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useGetGoalsProgressQuery } from '@/store/api';
import { useScopeCapital } from '@/components/stats/useScopeCapital';
import { currentWeek, weekGoals, type WeekGoal } from '@/lib/dashboard';
import { formatLocalDateOnly } from '@/lib/dateUtils';

export interface WeekGoalsState {
  isLoading: boolean;
  isError: boolean;
  /** Tracks of the goals the user set; empty when none are set. */
  goals: WeekGoal[];
  /** Rule breaks recorded this week across the scope. */
  brokenRules: number;
  /** At least one rule exists, so `No rules broken` is a statement and not an absence. */
  hasRules: boolean;
}

/** Current-week goal progress for the account in scope (the dashboard's Today strip and Goals panel). */
export function useWeekGoals(): WeekGoalsState {
  const { selectedAccountId, totalCapital, accountsReady } = useScopeCapital();
  const todayKey = formatLocalDateOnly(new Date());
  const week = useMemo(() => currentWeek(), [todayKey]); // eslint-disable-line react-hooks/exhaustive-deps -- the week changes only when the day does
  const q = useGetGoalsProgressQuery(
    accountsReady ? { accountId: selectedAccountId || 'ALL', startDate: week.start, endDate: week.end, period: 'weekly', periodKey: week.periodKey, currentPeriod: true, totalCapital } : skipToken,
  );
  return useMemo(() => {
    const data = q.data;
    const setTypes = (data?.goals ?? []).filter((g) => g.period === 'weekly').map((g) => g.goalType);
    const broken = Object.values(data?.ruleCompliance?.brokenRulesCounts ?? {}).reduce((s, n) => s + n, 0);
    return {
      isLoading: q.isLoading,
      isError: q.isError,
      goals: weekGoals(data?.goalProgress, setTypes),
      brokenRules: broken,
      hasRules: (data?.ruleCompliance?.totalRules ?? 0) > 0,
    };
  }, [q.data, q.isLoading, q.isError]);
}
