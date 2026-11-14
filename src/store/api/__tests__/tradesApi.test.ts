import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/api/tokenRefresh', () => ({ refreshToken: vi.fn() }));

import { api } from '../baseApi';
import { tradesApi } from '../tradesApi';
import { patchUiState } from '@/hooks/useUiState';

/** jsdom's AbortSignal is not accepted by Node's Request, so the request object is a stand-in; `fetch` is what answers. */
class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const wire = (id: string, accountId: string, day: string, extra: Record<string, unknown> = {}) => ({
  tradeId: id,
  symbol: 'ES',
  side: 'BUY',
  quantity: 1,
  openDate: `${day}T10:00:00.000Z`,
  closeDate: `${day}T11:00:00.000Z`,
  accountId,
  pnl: 10,
  ...extra,
});

/** What the "server" holds; GET /trades answers the part inside the requested account and dates. The mutations answer with the body a test sets. */
let listed: ReturnType<typeof wire>[] = [];
let answer: (method: string, url: string) => unknown = () => ({});

const envelope = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });
const requests = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([r]) => `${(r as StandInRequest).init.method ?? 'GET'} ${(r as StandInRequest).url}`);
const listCalls = () => requests().filter((r) => r.startsWith('GET ') && r.includes('/trades'));

const makeStore = () => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });
type Store = ReturnType<typeof makeStore>;

const NOV = { startDate: '2026-11-01', endDate: '2026-11-30' };
const DEC = { startDate: '2026-12-01', endDate: '2026-12-31' };
const ids = (store: Store, args: object) => (tradesApi.endpoints.getScopeTrades.select(args)(store.getState() as never).data ?? []).map((t) => t.id);

async function open(store: Store, args: object) {
  const sub = store.dispatch(tradesApi.endpoints.getScopeTrades.initiate(args));
  await sub;
  return sub;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('Request', StandInRequest);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: StandInRequest) => {
      const method = req.init.method ?? 'GET';
      if (method === 'GET' && req.url.includes('/trades')) {
        const q = new URL(req.url).searchParams;
        const [account, from, to] = [q.get('accountId'), q.get('startDate') ?? '', q.get('endDate') ?? ''];
        const trades = listed.filter((t) => (!account || account === 'ALL' || t.accountId === account) && t.openDate.slice(0, 10) >= from && t.openDate.slice(0, 10) <= to);
        return envelope({ trades, pagination: { hasMore: false, nextCursor: null, limit: 100 } });
      }
      return envelope(answer(method, req.url));
    }),
  );
  listed = [];
  answer = () => ({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('trade writes patch the cached lists and do not refetch them (FE-009)', () => {
  it('a delete removes the trade from every list and no list is paged again, not even after the stream delay', async () => {
    listed = [wire('t1', 'a1', '2026-11-03'), wire('t2', 'a1', '2026-11-04')];
    const store = makeStore();
    await open(store, {});
    await open(store, NOV);
    expect(listCalls()).toHaveLength(2);

    await store.dispatch(tradesApi.endpoints.deleteTrade.initiate('t1'));
    await vi.advanceTimersByTimeAsync(5000);

    expect(ids(store, {})).toEqual(['t2']);
    expect(ids(store, NOV)).toEqual(['t2']);
    expect(listCalls()).toHaveLength(2);
  });

  it('a bulk delete and a create are patched the same way', async () => {
    listed = [wire('t1', 'a1', '2026-11-03'), wire('t2', 'a1', '2026-11-04')];
    const store = makeStore();
    await open(store, NOV);

    answer = () => ({ deleted: 2 });
    await store.dispatch(tradesApi.endpoints.bulkDeleteTrades.initiate({ tradeIds: ['t1', 't2'] }));
    answer = () => ({ trade: wire('t3', 'a1', '2026-11-05') });
    await store.dispatch(tradesApi.endpoints.createTrade.initiate({ symbol: 'ES', direction: 'LONG', accountId: 'a1' } as never));
    await vi.advanceTimersByTimeAsync(5000);

    expect(ids(store, NOV)).toEqual(['t3']);
    expect(listCalls()).toHaveLength(1);
  });
});

describe('the newest trade of a scope (FE-009)', () => {
  it('is one /trades request with limit=1, not a paging of the whole scope', async () => {
    listed = [wire('t1', 'a1', '2026-11-03'), wire('t2', 'a1', '2026-11-04')];
    const res = await makeStore().dispatch(tradesApi.endpoints.getNewestTrade.initiate({ accountId: 'ALL', startDate: '2000-01-01', endDate: '2099-12-31' }));
    expect('data' in res && res.data?.length).toBe(1);
    const reads = requests().filter((r) => r.startsWith('GET '));
    expect(reads).toHaveLength(1);
    expect(reads[0]).toContain('limit=1');
  });
});

describe('creating a trade in several accounts (X-010)', () => {
  const payload = { symbol: 'ES', direction: 'LONG', accountIds: ['a1', 'a2'] } as never;

  it('reads { trades, count } as one trade per account, each with its own id', async () => {
    answer = () => ({ trades: [wire('n1', 'a1', '2026-11-05'), wire('n2', 'a2', '2026-11-05')], count: 2 });
    const res = await makeStore().dispatch(tradesApi.endpoints.createTrade.initiate(payload));
    expect('data' in res && res.data?.map((t) => [t.id, t.accountId])).toEqual([['n1', 'a1'], ['n2', 'a2']]);
  });

  it('still reads { trade } as a list of one', async () => {
    answer = () => ({ trade: wire('n1', 'a1', '2026-11-05') });
    const res = await makeStore().dispatch(tradesApi.endpoints.createTrade.initiate({ symbol: 'ES', direction: 'LONG', accountId: 'a1' } as never));
    expect('data' in res && res.data?.map((t) => t.id)).toEqual(['n1']);
  });

  it('puts each copy only in the lists of its own account and period, never a blank row', async () => {
    const store = makeStore();
    await open(store, { accountId: 'a1', ...NOV });
    await open(store, { accountId: 'a2', ...NOV });
    await open(store, { accountId: 'a1', ...DEC });
    await open(store, {});

    answer = () => ({ trades: [wire('n1', 'a1', '2026-11-05'), wire('n2', 'a2', '2026-11-05')], count: 2 });
    await store.dispatch(tradesApi.endpoints.createTrade.initiate(payload));

    expect(ids(store, { accountId: 'a1', ...NOV })).toEqual(['n1']);
    expect(ids(store, { accountId: 'a2', ...NOV })).toEqual(['n2']);
    expect(ids(store, { accountId: 'a1', ...DEC })).toEqual([]);
    expect(ids(store, {})).toEqual(['n1', 'n2']);
  });

  it('does not add a new trade to the list of one import batch', async () => {
    const store = makeStore();
    await open(store, { importBatchId: 'b1' });
    answer = () => ({ trade: wire('n1', 'a1', '2026-11-05') });
    await store.dispatch(tradesApi.endpoints.createTrade.initiate({ symbol: 'ES', direction: 'LONG', accountId: 'a1' } as never));
    expect(ids(store, { importBatchId: 'b1' })).toEqual([]);
  });
});

describe('editing a trade', () => {
  const edit = (store: Store, id: string) => store.dispatch(tradesApi.endpoints.updateTrade.initiate({ id, payload: { notes: 'x' } }));

  it('a copy created for another account is not pushed into lists of other accounts or periods (FE-032)', async () => {
    listed = [wire('t1', 'a1', '2026-11-03')];
    const store = makeStore();
    await open(store, { accountId: 'a1', ...NOV });
    await open(store, { accountId: 'a2', ...NOV });
    await open(store, { accountId: 'a1', ...DEC });
    await open(store, {});

    answer = () => ({ trade: wire('t1', 'a1', '2026-11-03'), createdTrades: [wire('c1', 'a2', '2026-11-03')] });
    await edit(store, 't1');

    expect(ids(store, { accountId: 'a1', ...NOV })).toEqual(['t1']);
    expect(ids(store, { accountId: 'a2', ...NOV })).toEqual(['c1']);
    expect(ids(store, { accountId: 'a1', ...DEC })).toEqual([]);
    expect(ids(store, {})).toEqual(['t1', 'c1']);
  });

  it('an edit that keeps account and day replaces the trade in place and refetches no list', async () => {
    listed = [wire('t1', 'a1', '2026-11-03'), wire('t2', 'a1', '2026-11-04')];
    const store = makeStore();
    await open(store, NOV);
    answer = () => ({ trade: wire('t1', 'a1', '2026-11-03', { pnl: 99 }) });
    await edit(store, 't1');
    await vi.advanceTimersByTimeAsync(5000);

    const list = tradesApi.endpoints.getScopeTrades.select(NOV)(store.getState() as never).data;
    expect(list?.map((t) => [t.id, t.pnl])).toEqual([['t1', 99], ['t2', 10]]);
    expect(listCalls()).toHaveLength(1);
  });

  it('a trade moved to another period leaves the old period list and joins the new one', async () => {
    listed = [wire('t1', 'a1', '2026-11-03')];
    const store = makeStore();
    await open(store, NOV);
    await open(store, DEC);

    answer = () => ({ trade: wire('t1', 'a1', '2026-12-02') });
    await edit(store, 't1');

    expect(ids(store, NOV)).toEqual([]);
    expect(ids(store, DEC)).toEqual(['t1']);
  });
});

describe('a saved trade joins the lists of the day it opened on in the app time zone (H2)', () => {
  afterEach(() => patchUiState({ timeZone: '' }));

  const create = (store: Store, trade: object) => {
    answer = () => ({ trade });
    return store.dispatch(tradesApi.endpoints.createTrade.initiate({ symbol: 'ES', direction: 'LONG', accountId: 'a1' } as never));
  };

  it('an Indian trade at 01:30 on the 5th is in the list of the 5th, though its UTC day is the 4th', async () => {
    patchUiState({ timeZone: 'Asia/Kolkata' });
    const store = makeStore();
    const fifth = { startDate: '2026-11-05', endDate: '2026-11-05' };
    const fourth = { startDate: '2026-11-04', endDate: '2026-11-04' };
    await open(store, fifth);
    await open(store, fourth);
    await create(store, wire('n1', 'a1', '2026-11-04', { openDate: '2026-11-04T20:00:00.000Z', closeDate: '2026-11-04T20:30:00.000Z' }));
    expect(ids(store, fifth)).toEqual(['n1']);
    expect(ids(store, fourth)).toEqual([]);
  });

  it('a New York trade opened on the 4th and closed on the 5th UTC stays in the list of the 4th', async () => {
    patchUiState({ timeZone: 'America/New_York' });
    const store = makeStore();
    const fifth = { startDate: '2026-11-05', endDate: '2026-11-05' };
    const fourth = { startDate: '2026-11-04', endDate: '2026-11-04' };
    await open(store, fifth);
    await open(store, fourth);
    await create(store, wire('n1', 'a1', '2026-11-04', { openDate: '2026-11-04T23:30:00.000Z', closeDate: '2026-11-05T01:30:00.000Z' }));
    expect(ids(store, fourth)).toEqual(['n1']);
    expect(ids(store, fifth)).toEqual([]);
  });

  it('an edit that moves the open time across local midnight moves the trade between the lists', async () => {
    patchUiState({ timeZone: 'Asia/Kolkata' });
    listed = [wire('t1', 'a1', '2026-11-04', { openDate: '2026-11-04T17:00:00.000Z', closeDate: '2026-11-04T17:30:00.000Z' })];
    const store = makeStore();
    const fifth = { startDate: '2026-11-05', endDate: '2026-11-05' };
    const fourth = { startDate: '2026-11-04', endDate: '2026-11-04' };
    await open(store, fourth);
    await open(store, fifth);
    answer = () => ({ trade: wire('t1', 'a1', '2026-11-04', { openDate: '2026-11-04T20:00:00.000Z', closeDate: '2026-11-04T20:30:00.000Z' }) });
    await store.dispatch(tradesApi.endpoints.updateTrade.initiate({ id: 't1', payload: { notes: 'x' } }));
    expect(ids(store, fourth)).toEqual([]);
    expect(ids(store, fifth)).toEqual(['t1']);
  });
});

describe('clearing a contract field (H5)', () => {
  it('a PUT carries an explicit null, which the server reads as remove, and leaves absent fields out', async () => {
    answer = () => ({ trade: wire('t1', 'a1', '2026-11-03') });
    await makeStore().dispatch(
      tradesApi.endpoints.updateTrade.initiate({ id: 't1', payload: { fees: null, contractMultiplier: null, optionType: null, strike: null, expiry: null, underlying: null, assetClass: 'stock' } }),
    );
    const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([r]) => r as StandInRequest).find((r) => r.init.method === 'PUT')!;
    const body = JSON.parse(put.init.body as string);
    expect(body).toMatchObject({ fees: null, contractMultiplier: null, optionType: null, strike: null, expiry: null, underlying: null, assetClass: 'stock' });
    expect(body).not.toHaveProperty('grossPnl');
  });
});

describe('bulk edit and bulk delete (X-012, X-013)', () => {
  it('a bulk delete that answers 200 with per-trade errors puts those trades back in the lists', async () => {
    listed = [wire('t1', 'a1', '2026-11-03'), wire('t2', 'a1', '2026-11-04'), wire('t3', 'a1', '2026-11-05')];
    const store = makeStore();
    await open(store, NOV);
    answer = () => ({ deleted: ['t1', 't3'], notFound: [], errors: [{ tradeId: 't2', message: 'timeout' }] });
    await store.dispatch(tradesApi.endpoints.bulkDeleteTrades.initiate({ tradeIds: ['t1', 't2', 't3'] }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(ids(store, NOV)).toEqual(['t2']);
    expect(listCalls()).toHaveLength(1);
  });

  it('a bulk update posts one request without the cache patches and patches the updated trades only', async () => {
    listed = [wire('t1', 'a1', '2026-11-03'), wire('t2', 'a1', '2026-11-04')];
    const store = makeStore();
    await open(store, NOV);
    answer = () => ({ updated: 1, updatedIds: ['t1'], notFound: [], failed: [{ tradeId: 't2', message: 'Tag problem' }] });
    const res = await store.dispatch(
      tradesApi.endpoints.bulkUpdateTrades.initiate({ tradeIds: ['t1', 't2'], add: { tags: ['A'] }, patches: { t1: { tags: ['A'] }, t2: { tags: ['A'] } } }),
    );
    await vi.advanceTimersByTimeAsync(5000);

    expect('data' in res && res.data).toMatchObject({ updatedIds: ['t1'], failed: [{ tradeId: 't2', message: 'Tag problem' }] });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([r]) => r as StandInRequest).find((r) => r.url.endsWith('/trades/bulk-update'))!;
    expect(call.init.method).toBe('POST');
    expect(JSON.parse(call.init.body as string)).toEqual({ tradeIds: ['t1', 't2'], add: { tags: ['A'] } });
    const list = tradesApi.endpoints.getScopeTrades.select(NOV)(store.getState() as never).data;
    expect(list?.map((t) => [t.id, t.tags])).toEqual([['t1', ['A']], ['t2', []]]);
    expect(listCalls()).toHaveLength(1);
  });

  it('a bulk update can set reviewed for many trades', async () => {
    answer = () => ({ updated: 2, updatedIds: ['t1', 't2'], notFound: [], failed: [] });
    await makeStore().dispatch(tradesApi.endpoints.bulkUpdateTrades.initiate({ tradeIds: ['t1', 't2'], set: { reviewed: true }, patches: { t1: { reviewed: true }, t2: { reviewed: true } } }));
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([r]) => r as StandInRequest).find((r) => r.url.endsWith('/trades/bulk-update'))!;
    expect(JSON.parse(call.init.body as string)).toEqual({ tradeIds: ['t1', 't2'], set: { reviewed: true } });
  });
});

describe('the reviewed flag and the debrief (A-21, A-22)', () => {
  const sent = (method: string) => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([r]) => r as StandInRequest).filter((r) => r.init.method === method);
  const debrief = { tradeId: 't1', checks: [{ id: 'stopSet', label: 'A stop was set', state: 'met', detail: 'Stop at 0.9.' }], metCount: 1, total: 1, currency: 'USD', timeZone: 'UTC' };

  it('reads reviewed as false when the server has none, and true only for true', async () => {
    listed = [wire('t1', 'a1', '2026-11-03'), wire('t2', 'a1', '2026-11-04', { reviewed: true }), wire('t3', 'a1', '2026-11-05', { reviewed: 'yes' })];
    const store = makeStore();
    await open(store, NOV);
    const list = tradesApi.endpoints.getScopeTrades.select(NOV)(store.getState() as never).data;
    expect(list?.map((t) => [t.id, t.reviewed])).toEqual([['t1', false], ['t2', true], ['t3', false]]);
  });

  it('a create sends reviewed only when it is given, and a PUT sends it as is', async () => {
    answer = () => ({ trade: wire('n1', 'a1', '2026-11-03') });
    const store = makeStore();
    const base = { symbol: 'ES', direction: 'LONG' as const, size: 1, entryDate: '2026-11-03T10:00:00Z', accountId: 'a1' };
    await store.dispatch(tradesApi.endpoints.createTrade.initiate(base));
    await store.dispatch(tradesApi.endpoints.createTrade.initiate({ ...base, reviewed: true }));
    expect(sent('POST').map((r) => JSON.parse(r.init.body as string).reviewed)).toEqual([undefined, true]);

    await store.dispatch(tradesApi.endpoints.updateTrade.initiate({ id: 't1', payload: { reviewed: false } }));
    expect(JSON.parse(sent('PUT')[0].init.body as string)).toEqual({ reviewed: false });
  });

  it('GET /insights/debrief/:tradeId is read from the envelope and fetched again after the trade is saved', async () => {
    answer = (method, url) => (method === 'GET' && url.includes('/insights/debrief/') ? { debrief } : { trade: wire('t1', 'a1', '2026-11-03', { reviewed: true }) });
    const store = makeStore();
    const sub = store.dispatch(tradesApi.endpoints.getTradeDebrief.initiate('t1'));
    const res = await sub;
    expect(res.data).toEqual(debrief);
    expect(requests()).toEqual(['GET https://api.test/v1/insights/debrief/t1']);

    await store.dispatch(tradesApi.endpoints.updateTrade.initiate({ id: 't1', payload: { reviewed: true } }));
    await vi.waitFor(() => expect(requests().filter((r) => r.includes('/insights/debrief/t1'))).toHaveLength(2));
    expect(listCalls()).toHaveLength(0);
    sub.unsubscribe();
  });

  it('a trade shown from its own query (outside every list) shows the saved value at once', async () => {
    answer = (method) => ({ trade: wire('t9', 'a1', '2026-08-03', method === 'PUT' ? { reviewed: true } : {}) });
    const store = makeStore();
    const sub = store.dispatch(tradesApi.endpoints.getTrade.initiate('t9'));
    expect((await sub).data?.reviewed).toBe(false);
    await store.dispatch(tradesApi.endpoints.updateTrade.initiate({ id: 't9', payload: { reviewed: true } }));
    expect(tradesApi.endpoints.getTrade.select('t9')(store.getState() as never).data?.reviewed).toBe(true);
    sub.unsubscribe();
  });

  it('a debrief that answers 404 is an error with the server message', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => new Response(JSON.stringify({ success: false, message: 'Trade not found.' }), { status: 404, headers: { 'content-type': 'application/json' } }));
    const res = await makeStore().dispatch(tradesApi.endpoints.getTradeDebrief.initiate('gone'));
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.error)).toContain('Trade not found.');
  });
});
