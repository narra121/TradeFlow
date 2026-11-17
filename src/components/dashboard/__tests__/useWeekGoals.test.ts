import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let accountsReady = false;
// RTK while another account loads: `data` still holds the last account's progress, `currentData` is empty.
let stale = false;
const lastAccount = { goals: [{ goalType: 'profit', period: 'weekly' }], goalProgress: { profit: { current: 380, target: 600, progress: 63, achieved: false } }, ruleCompliance: { totalRules: 2, brokenRulesCounts: { a: 3 } } };
vi.mock('@/components/stats/useScopeCapital', () => ({ useScopeCapital: () => ({ selectedAccountId: null, totalCapital: 0, accountsReady, drawdownBasis: 'ok' }) }));
vi.mock('@/store/api/goalsRulesApi', () => ({
  useGetGoalsProgressQuery: (arg: unknown) => (typeof arg === 'symbol' || !accountsReady ? { isUninitialized: true, isLoading: false, isError: false } : (stale ? { isUninitialized: false, isLoading: false, isFetching: true, isError: false, data: lastAccount, currentData: undefined } : { isUninitialized: false, isLoading: false, isFetching: false, isError: false, data: { goals: [], goalProgress: undefined }, currentData: { goals: [], goalProgress: undefined } })),
}));

import { useWeekGoals } from '../useWeekGoals';

describe('useWeekGoals', () => {
  it('is loading while the request waits for the accounts, so the widgets do not say "No weekly goals set" before the data', () => {
    accountsReady = false;
    expect(renderHook(() => useWeekGoals()).result.current.isLoading).toBe(true);
    accountsReady = true;
    expect(renderHook(() => useWeekGoals()).result.current.isLoading).toBe(false);
  });

  it('while another account loads it is loading and shows none of the last account\'s goals or broken rules', () => {
    accountsReady = true;
    stale = true;
    const r = renderHook(() => useWeekGoals()).result.current;
    stale = false;
    expect(r.isLoading).toBe(true);
    expect(r.goals).toHaveLength(0);
    expect(r.brokenRules).toBe(0);
  });
});
