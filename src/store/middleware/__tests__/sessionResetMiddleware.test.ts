import { describe, expect, it } from 'vitest';
import { store } from '@/store';
import { clearAuth, setUser } from '@/store/slices/authSlice';
import { setSelectedAccount } from '@/store/slices/accountsSlice';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { authApi } from '@/store/api/authApi';
import { SCOPE_KEY, TRADELOG_KEY } from '@/lib/scope';

describe('sessionResetMiddleware', () => {
  it('clears scope, persisted view state and filters when the session ends', () => {
    store.dispatch(setUser({ id: 'u1', name: 'U', email: 'u@x.io' }));
    store.dispatch(setSelectedAccount('acc-1'));
    store.dispatch(setDateRangeFilter({ startDate: '2026-01-01', endDate: '2026-01-31', datePreset: 'custom' }));
    sessionStorage.setItem(TRADELOG_KEY, '{"q":"EUR"}');
    expect(localStorage.getItem(SCOPE_KEY)).toContain('acc-1');

    store.dispatch(clearAuth());

    expect(store.getState().accounts.selectedAccountId).toBeNull();
    expect(store.getState().trades.filters.datePreset).toBe('all');
    expect(store.getState().trades.filters.accountId).toBe('ALL');
    expect(sessionStorage.getItem(TRADELOG_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(SCOPE_KEY) ?? '{}').accountId ?? null).toBeNull();
  });

  it('a log out removes the trade drafts of the tab; a session that ended keeps them', () => {
    sessionStorage.setItem('tq.draft.new', '{"symbol":"EURUSD"}');
    store.dispatch(clearAuth());
    expect(sessionStorage.getItem('tq.draft.new')).not.toBeNull();

    const fulfilled = authApi.endpoints.logout.matchFulfilled;
    expect(typeof fulfilled).toBe('function');
    store.dispatch({ type: 'api/executeMutation/fulfilled', payload: undefined, meta: { arg: { endpointName: 'logout', originalArgs: undefined, track: true }, requestId: 'r1', requestStatus: 'fulfilled' } });
    expect(sessionStorage.getItem('tq.draft.new')).toBeNull();
  });
});
