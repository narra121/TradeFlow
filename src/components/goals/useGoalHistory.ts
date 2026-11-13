import { useMemo } from 'react';
import { useGetGoalsHistoryQuery } from '@/store/api/goalsRulesApi';
import { historyGlyph, previousPeriods, GOAL_ORDER, type Glyph, type GoalType, type PeriodRef } from '@/components/goals/goalMath';

export interface HistoryCell {
  period: PeriodRef;
  glyph: Glyph;
}

interface Args {
  accountId: string;
  totalCapital: number;
  current: PeriodRef;
  enabled: boolean;
}

/** The eight periods before the one on screen, from one `/goals/history` call. It waits for `enabled`, so the current period renders first. */
export function useGoalHistory({ accountId, totalCapital, current, enabled }: Args) {
  const periods = useMemo(() => previousPeriods(current), [current]);
  const { currentData, isError } = useGetGoalsHistoryQuery(
    { period: current.period === 'weekly' ? 'week' : 'month', count: periods.length, before: current.key, accountId, totalCapital },
    { skip: !enabled },
  );

  const strips = useMemo(() => {
    const byKey = new Map((currentData?.periods ?? []).map((p) => [p.periodKey, p.goals]));
    const out = {} as Record<GoalType, HistoryCell[]>;
    for (const type of GOAL_ORDER) {
      out[type] = periods.map((period) => {
        const gp = byKey.get(period.key);
        if (!gp) return { period, glyph: 'none' as Glyph };
        const prog = type === 'maxTrades' ? gp.tradeCount : gp[type];
        return { period, glyph: historyGlyph(type, { current: prog.current, target: prog.target, tradeCount: gp.tradeCount.current }) };
      });
    }
    return out;
  }, [periods, currentData]);

  return { strips, loading: enabled && !currentData && !isError, failed: isError, loaded: currentData?.periods.length ?? 0 };
}
