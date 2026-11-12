import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { periodOf } from '../goalMath';

const initiate = vi.fn((args: { periodKey: string }) => ({ args }));
const calls: string[] = [];
let respond: (periodKey: string) => unknown = () => ({ goalProgress: {} });

vi.mock('@/store/api/goalsRulesApi', () => ({
  goalsRulesApi: { endpoints: { getGoalsProgress: { initiate: (a: { periodKey: string }) => initiate(a) } } },
}));
const dispatch = (action: { args: { periodKey: string } }) => ({
  unwrap: () => {
    calls.push(action.args.periodKey);
    const r = respond(action.args.periodKey);
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
  },
});
vi.mock('@/store/hooks', () => ({ useAppDispatch: () => dispatch }));

import { useGoalHistory } from '../useGoalHistory';

const current = periodOf('weekly', new Date(2026, 10, 11));
const progress = (profit: number, trades: number) => ({
  goalProgress: {
    profit: { current: profit, target: 500 },
    winRate: { current: 60, target: 65 },
    maxDrawdown: { current: 1, target: 3 },
    tradeCount: { current: trades, target: 8 },
  },
});

describe('useGoalHistory', () => {
  beforeEach(() => {
    calls.length = 0;
    initiate.mockClear();
    respond = () => progress(600, 4);
  });

  it('asks once for each of the eight periods before the one on screen, never for the current one', async () => {
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toHaveLength(8);
    expect(calls).not.toContain(current.key);
    expect(new Set(calls).size).toBe(8);
    expect(initiate).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'usd', currentPeriod: false, period: 'weekly', totalCapital: 1000 }));
  });

  it('turns each response into a glyph per goal, oldest first', async () => {
    respond = (key) => (key === 'week#2026-10-05' ? progress(100, 3) : key === 'week#2026-10-12' ? progress(0, 0) : progress(600, 4));
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: true }));
    await waitFor(() => expect(result.current.loaded).toBe(8));
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
    renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: false }));
    expect(calls).toHaveLength(0);
  });

  it('reports a failure and keeps the other cells', async () => {
    respond = (key) => (key === 'week#2026-10-12' ? new Error('boom') : progress(600, 4));
    const { result } = renderHook(() => useGoalHistory({ accountId: 'usd', totalCapital: 1000, current, enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);
    expect(result.current.loaded).toBe(7);
  });
});
