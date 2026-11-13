import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/api/tokenRefresh', () => ({ refreshToken: vi.fn() }));

import { api } from '@/store/api/baseApi';
import { goalsRulesApi } from '@/store/api/goalsRulesApi';

class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const args = (periodKey: string) => ({ accountId: 'a1', startDate: '2026-10-05', endDate: '2026-10-11', period: 'weekly' as const, periodKey, currentPeriod: false });

/** ScopeBar (FE-062) counts a failed query only when `state.api.subscriptions[cacheKey]` holds a subscriber: this is the state shape it relies on. */
describe('RTK Query subscription state', () => {
  beforeEach(() => {
    vi.stubGlobal('Request', StandInRequest);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, data: { goalProgress: {} } }), { status: 200, headers: { 'content-type': 'application/json' } })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists a subscribed query under its cache key and leaves an unsubscribed one out', async () => {
    const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });
    const subscribed = store.dispatch(goalsRulesApi.endpoints.getGoalsProgress.initiate(args('week#current')));
    await subscribed;
    await store.dispatch(goalsRulesApi.endpoints.getGoalsProgress.initiate(args('week#history'), { subscribe: false }));
    // RTK mirrors its subscriptions into the store at most every 500 ms.
    await new Promise((r) => setTimeout(r, 650));

    const state = store.getState().api;
    const keyOf = (periodKey: string) => Object.entries(state.queries).find(([, q]) => (q?.originalArgs as { periodKey?: string })?.periodKey === periodKey)![0];
    expect(Object.keys(state.subscriptions[keyOf('week#current')] ?? {})).toHaveLength(1);
    expect(Object.keys(state.subscriptions[keyOf('week#history')] ?? {})).toHaveLength(0);
    subscribed.unsubscribe();
  });
});
