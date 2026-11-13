import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { periodOf, previousPeriods } from '../goalMath';

interface Item {
  current: number;
  target: number;
}
type Periods = { periodKey: string; goals: Record<'profit' | 'winRate' | 'maxDrawdown' | 'tradeCount', Item> }[];

const query = vi.fn();
let state: { currentData?: { periods: Periods }; isError: boolean } = { isError: false };
vi.mock('@/store/api/goalsRulesApi', () => ({
  useGetGoalsHistoryQuery: (args: unknown, options: unknown) => (query(args, options), state),
}));

import { useGoalHistory } from '../useGoalHistory';

const current = periodOf('weekly', new Date(2026, 10, 11));
const goals = (profit: number, trades: number) => ({
  profit: { current: profit, target: 500 },
  winRate: { current: 60, target: 65 },
  maxDrawdown: { current: 1, target: 3 },
  tradeCount: { current: trades, target: 8 },
});
const response = (pick: (key: string) => ReturnType<typeof goals>) => ({ periods: previousPeriods(current).map((p) => ({ periodKey: p.key, goals: pick(p.key) })) });

describe('useGoalHistory', () => {
  beforeEach(() => {
    query.mockClear();
    state = { currentData: response(() => goals(600, 4)), isError: false };
  });

  it('asks once for the eight periods before the one on screen, never for the current one', () => {
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: true }));
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({ period: 'week', count: 8, before: 'week#2026-11-09', accountId: 'usd', totalCapital: 1000 }, { skip: false });
    expect(result.current.strips.profit.map((c) => c.period.key)).not.toContain(current.key);
    expect(result.current.loaded).toBe(8);
  });

  it('names a month on screen as month', () => {
    renderHook(() => useGoalHistory({ accountId: 'ALL', totalCapital: 0, current: periodOf('monthly', new Date(2026, 10, 11)), enabled: true }));
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ period: 'month', before: 'month#2026-11' }), { skip: false });
  });

  it('turns each period into a glyph per goal, oldest first', () => {
    state = { currentData: response((key) => (key === 'week#2026-10-05' ? goals(100, 3) : key === 'week#2026-10-12' ? goals(0, 0) : goals(600, 4))), isError: false };
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: true }));
    const profit = result.current.strips.profit;
    expect(profit).toHaveLength(8);
    expect(profit[3].period.key).toBe('week#2026-10-05');
    expect(profit[3].glyph).toBe('missed');
    expect(profit[4].glyph).toBe('none');
    expect(profit[7].glyph).toBe('met');
    expect(result.current.strips.winRate[7].glyph).toBe('missed');
    expect(result.current.strips.maxDrawdown[7].glyph).toBe('met');
    expect(result.current.strips.maxTrades[7].glyph).toBe('met');
  });

  it('does not call the API until enabled, so the current period renders first', () => {
    state = { isError: false };
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: false }));
    expect(query).toHaveBeenCalledWith(expect.anything(), { skip: true });
    expect(result.current.loading).toBe(false);
  });

  it('is loading until the answer comes, with every cell empty', () => {
    state = { isError: false };
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: true }));
    expect(result.current.loading).toBe(true);
    expect(result.current.loaded).toBe(0);
    expect(result.current.strips.profit.every((c) => c.glyph === 'none')).toBe(true);
  });

  it('reports a failure with empty cells and stops loading', () => {
    state = { isError: true };
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: true }));
    expect(result.current.failed).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.loaded).toBe(0);
  });
});
