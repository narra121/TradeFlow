import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/api/tokenRefresh', () => ({ refreshToken: vi.fn() }));

import { api } from '../baseApi';
import { accountsApi } from '../accountsApi';

/** jsdom's AbortSignal is not accepted by Node's Request, so the request object is a stand-in; `fetch` is what answers. */
class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const envelope = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });
const wire = (accountId: string, extra: Record<string, unknown> = {}) => ({ accountId, name: accountId, status: 'active', balance: 1000, initialBalance: 1000, currency: 'USD', ...extra });

let answer: (method: string) => unknown = () => ({});

const makeStore = () => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });
const listed = (store: ReturnType<typeof makeStore>) => accountsApi.endpoints.getAccounts.select()(store.getState() as never).data?.accounts ?? [];

beforeEach(() => {
  vi.stubGlobal('Request', StandInRequest);
  vi.stubGlobal('fetch', vi.fn(async (req: StandInRequest) => envelope(answer(req.init.method ?? 'GET'))));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the trade count of an account', () => {
  const load = async () => {
    answer = () => ({ accounts: [wire('a1', { tradeCount: 8, lastTradeDate: '2026-11-10' }), wire('a2', { tradeCount: 0, lastTradeDate: null })] });
    const store = makeStore();
    await store.dispatch(accountsApi.endpoints.getAccounts.initiate());
    return store;
  };

  it('arrives with the list, next to the id the app uses', async () => {
    const store = await load();
    expect(listed(store).map((a) => [a.id, a.tradeCount, a.lastTradeDate])).toEqual([['a1', 8, '2026-11-10'], ['a2', 0, null]]);
  });

  it('survives an edit: the response of PUT /accounts/:id has no count and must not wipe the cached one', async () => {
    const store = await load();
    answer = () => ({ account: wire('a1', { name: 'Renamed' }) });
    await store.dispatch(accountsApi.endpoints.updateAccount.initiate({ id: 'a1', payload: { name: 'Renamed' } }));
    expect(listed(store)[0]).toMatchObject({ id: 'a1', name: 'Renamed', tradeCount: 8, lastTradeDate: '2026-11-10' });
  });

  it('survives a status change the same way', async () => {
    const store = await load();
    answer = () => ({ account: wire('a1', { status: 'passed' }) });
    await store.dispatch(accountsApi.endpoints.updateAccountStatus.initiate({ id: 'a1', status: 'passed' }));
    expect(listed(store)[0]).toMatchObject({ id: 'a1', status: 'passed', tradeCount: 8, lastTradeDate: '2026-11-10' });
  });
});
