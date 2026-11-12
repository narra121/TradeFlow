import { useEffect, useMemo, useState } from 'react';
import { goalsRulesApi } from '@/store/api/goalsRulesApi';
import { useAppDispatch } from '@/store/hooks';
import { historyGlyph, previousPeriods, GOAL_ORDER, type Glyph, type GoalType, type PeriodRef } from '@/components/goals/goalMath';

export interface HistoryCell {
  period: PeriodRef;
  glyph: Glyph;
}

type Progress = { current: number; target: number } | undefined;
interface RawPeriod {
  period: PeriodRef;
  profit?: Progress;
  winRate?: Progress;
  maxDrawdown?: Progress;
  tradeCount?: Progress;
}

interface Args {
  accountId: string;
  totalCapital: number;
  current: PeriodRef;
  enabled: boolean;
}

const POOL = 2;

/**
 * The eight periods before the one on screen, from one `/goals/progress` call each (BE-R14 would make it one).
 * The current period renders first; these load after it, two at a time, and stay in the RTK cache.
 */
export function useGoalHistory({ accountId, totalCapital, current, enabled }: Args) {
  const dispatch = useAppDispatch();
  const periods = useMemo(() => previousPeriods(current), [current]);
  const [raw, setRaw] = useState<Record<string, RawPeriod>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const signature = `${accountId}|${totalCapital}|${current.key}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setRaw({});
    setFailed(false);
    setLoading(true);
    const queue = [...periods];
    const worker = async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          const sub = dispatch(
            goalsRulesApi.endpoints.getGoalsProgress.initiate(
              { accountId, startDate: p.startDate, endDate: p.endDate, period: p.period, periodKey: p.key, currentPeriod: false, totalCapital },
              { subscribe: false },
            ),
          );
          const res = await sub.unwrap();
          if (cancelled) return;
          const gp = res.goalProgress;
          setRaw((r) => ({ ...r, [p.key]: { period: p, profit: gp.profit, winRate: gp.winRate, maxDrawdown: gp.maxDrawdown, tradeCount: gp.tradeCount } }));
        } catch {
          if (!cancelled) setFailed(true);
        }
      }
    };
    void Promise.all(Array.from({ length: POOL }, worker)).then(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled, dispatch]);

  const strips = useMemo(() => {
    const out = {} as Record<GoalType, HistoryCell[]>;
    for (const type of GOAL_ORDER) {
      out[type] = periods.map((period) => {
        const r = raw[period.key];
        if (!r) return { period, glyph: 'none' as Glyph };
        const prog = type === 'maxTrades' ? r.tradeCount : r[type];
        const trades = r.tradeCount?.current ?? 0;
        return { period, glyph: historyGlyph(type, prog ? { current: prog.current, target: prog.target, tradeCount: trades } : null) };
      });
    }
    return out;
  }, [periods, raw]);

  return { strips, loading, failed, loaded: Object.keys(raw).length };
}
