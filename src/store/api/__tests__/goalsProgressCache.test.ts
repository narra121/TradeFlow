import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/api/tokenRefresh', () => ({ refreshToken: vi.fn() }));

import { api } from '../baseApi';
import { goalsRulesApi } from '../goalsRulesApi';

class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const args = { period: 'week' as const, count: 8, before: 'week#2026-11-09', accountId: 'a1', totalCapital: 1000 };
const cached = (store: ReturnType<typeof makeStore>) => goalsRulesApi.endpoints.getGoalsHistory.select(args)(store.getState() as never).status !== 'uninitialized';
const makeStore = () => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });

describe('goal history is one request and stays cached between visits (FE-061, X-019)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.stubGlobal('Request', StandInRequest);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: true, data: { period: 'week', accountId: 'a1', periods: [] } }), { status: 200, headers: { 'content-type': 'application/json' } })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks /goals/history once for the eight periods before the one on screen', async () => {
    const store = makeStore();
    await store.dispatch(goalsRulesApi.endpoints.getGoalsHistory.initiate(args, { subscribe: false }));
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].url).toBe('https://api.test/v1/goals/history?period=week&count=8&before=week%232026-11-09&accountId=a1&totalCapital=1000');
  });

  it('an unsubscribed history survives well past the 60 s default, and is dropped after 15 minutes', async () => {
    const store = makeStore();
    await store.dispatch(goalsRulesApi.endpoints.getGoalsHistory.initiate(args, { subscribe: false }));
    expect(cached(store)).toBe(true);

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(cached(store)).toBe(true);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(11 * 60_000);
    expect(cached(store)).toBe(false);
  });
});
