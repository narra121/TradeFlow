import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let accountsReady = false;
vi.mock('@/components/stats/useScopeCapital', () => ({ useScopeCapital: () => ({ selectedAccountId: null, totalCapital: 0, accountsReady, drawdownBasis: 'ok' }) }));
vi.mock('@/store/api/goalsRulesApi', () => ({
  useGetGoalsProgressQuery: (arg: unknown) => (typeof arg === 'symbol' || !accountsReady ? { isUninitialized: true, isLoading: false, isError: false } : { isUninitialized: false, isLoading: false, isError: false, data: { goals: [], goalProgress: undefined } }),
}));

import { useWeekGoals } from '../useWeekGoals';

describe('useWeekGoals', () => {
  it('is loading while the request waits for the accounts, so the widgets do not say "No weekly goals set" before the data', () => {
    accountsReady = false;
    expect(renderHook(() => useWeekGoals()).result.current.isLoading).toBe(true);
    accountsReady = true;
    expect(renderHook(() => useWeekGoals()).result.current.isLoading).toBe(false);
  });
});
