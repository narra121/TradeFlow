import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalizedTrade } from '@/types/import';
vi.mock('@/lib/auth/authService', () => ({ getIdToken: vi.fn(async () => 'tok') }));

import { api } from '../baseApi';
import { billingApi } from '../billingApi';
import { chatApi } from '../chatApi';
import { importApi } from '../importApi';
import { insightsApi } from '../insightsApi';

class FakeRequest {
  url: string;
  method: string;
  headers: Headers;
  private payload: unknown;
  constructor(input: string, init: { method?: string; headers?: HeadersInit; body?: unknown } = {}) {
    this.url = String(input);
    this.method = init.method ?? 'GET';
    this.headers = new Headers(init.headers);
    this.payload = init.body;
  }
  clone() {
    return this;
  }
  async text() {
    return typeof this.payload === 'string' ? this.payload : '';
  }
}

const envelope = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, message: 'Success', data }), { status, headers: { 'content-type': 'application/json' } });
const errorEnvelope = (status: number, body: object) => new Response(JSON.stringify({ success: false, ...body }), { status, headers: { 'content-type': 'application/json' } });

interface Call {
  url: URL;
  method: string;
  body: any;
}
let calls: Call[];
let handler: (c: Call) => Response | Promise<Response>;

const makeStore = () => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (g) => g().concat(api.middleware) });

beforeEach(() => {
  calls = [];
  // jsdom's AbortSignal is rejected by Node's Request; this stand-in keeps the parts fetchBaseQuery and the mock use.
  vi.stubGlobal('Request', FakeRequest);
  handler = () => envelope({});
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: FakeRequest | string, init?: { method?: string; body?: string }) => {
      const direct = typeof input === 'string'; // chatStream calls fetch(url, init) itself
      const method = direct ? init?.method ?? 'GET' : input.method;
      const text = direct ? init?.body ?? '' : method === 'GET' ? '' : await input.clone().text();
      const call: Call = { url: new URL(direct ? input : input.url, 'http://api.test'), method, body: text ? JSON.parse(text) : undefined };
      calls.push(call);
      return handler(call);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const trade = (i: number): NormalizedTrade => ({
  symbol: 'SBIN', side: 'BUY', quantity: 1, entryPrice: 1, exitPrice: 2, openDate: '2026-04-07T04:00:00.000Z', closeDate: '2026-04-07T05:00:00.000Z', outcome: 'TP', pnl: 1, stopLoss: null, takeProfit: null, tags: [],
  assetClass: 'stock', fees: 0, grossPnl: 1, externalId: `zerodha:${i}:${i}`, importSource: 'zerodha',
});

describe('importApi', () => {
  it('getImportSources unwraps the list', async () => {
    handler = () => envelope({ sources: [{ id: 'zerodha', name: 'Zerodha', assetClasses: ['stock'], fileTypes: ['csv'], howToExport: 'x', sampleColumns: ['symbol'] }] });
    const r = await makeStore().dispatch(importApi.endpoints.getImportSources.initiate());
    expect(r.data?.map((s) => s.id)).toEqual(['zerodha']);
    expect(calls[0].url.pathname).toMatch(/\/import\/sources$/);
  });

  it('parseImport posts the request body unchanged', async () => {
    handler = () => envelope({ detectedSource: 'zerodha', trades: [], warnings: [], skipped: 0 });
    const body = { source: 'auto' as const, fileName: 'a.csv', contentBase64: 'QQ==', accountId: 'acc1' };
    const r = await makeStore().dispatch(importApi.endpoints.parseImport.initiate(body));
    expect('data' in r && r.data.detectedSource).toBe('zerodha');
    expect(calls[0]).toMatchObject({ method: 'POST', body });
  });

  it('parseImport surfaces a 402 with the quota details', async () => {
    handler = () => errorEnvelope(402, { errorCode: 'QUOTA_EXCEEDED', message: 'Monthly limit reached', error: { code: 'QUOTA_EXCEEDED', feature: 'broker_import', limit: 3, resetsAt: '2026-12-01T00:00:00.000Z' } });
    const r = await makeStore().dispatch(importApi.endpoints.parseImport.initiate({ source: 'auto', fileName: 'a.csv', contentBase64: 'QQ==' }));
    expect((r as any).error.status).toBe(402);
    expect((r as any).error.data.error).toMatchObject({ feature: 'broker_import', limit: 3 });
  });

  it('saveImportedTrades sends 50 per request with idempotency keys and sums the results', async () => {
    handler = (c) => envelope({ created: c.body.items.length - 1, skipped: [{ index: 0 }], errors: [] });
    const trades = Array.from({ length: 120 }, (_, i) => trade(i));
    const r = await makeStore().dispatch(importApi.endpoints.saveImportedTrades.initiate({ trades, accountId: 'acc1' }));
    expect(calls.map((c) => c.body.items.length)).toEqual([50, 50, 20]);
    expect(calls.every((c) => c.url.pathname.endsWith('/trades') && c.method === 'POST')).toBe(true);
    expect(calls[0].body.items[0]).toMatchObject({ accountIds: ['acc1'], idempotencyKey: 'imp|acc1|zerodha|zerodha:0:0' });
    expect((r as any).data).toMatchObject({ created: 117, skipped: 3, errors: 0, failed: 0 });
    const batch = (r as any).data.batchId;
    expect(batch).toMatch(/^[0-9a-f-]{36}$/);
    expect(calls.every((c) => c.body.items.every((i: any) => i.importBatchId === batch))).toBe(true);
  });

  it('a failed chunk is reported, the other chunks still save; all failing is an error', async () => {
    let n = 0;
    handler = () => (++n === 2 ? errorEnvelope(500, { message: 'boom' }) : envelope({ created: 50, skipped: [], errors: [] }));
    const trades = Array.from({ length: 120 }, (_, i) => trade(i));
    const partial = await makeStore().dispatch(importApi.endpoints.saveImportedTrades.initiate({ trades, accountId: 'acc1' }));
    expect((partial as any).data).toMatchObject({ created: 100, failed: 50 });

    handler = () => errorEnvelope(500, { message: 'boom' });
    const all = await makeStore().dispatch(importApi.endpoints.saveImportedTrades.initiate({ trades: trades.slice(0, 5), accountId: 'acc1' }));
    expect((all as any).error).toBeDefined();
  });

  it('nothing to save is a no-op success', async () => {
    const r = await makeStore().dispatch(importApi.endpoints.saveImportedTrades.initiate({ trades: [{ ...trade(1), duplicate: true }], accountId: 'a' }));
    expect(calls).toHaveLength(0);
    expect((r as any).data).toMatchObject({ created: 0, skipped: 0, errors: 0, failed: 0 });
  });
});

describe('insightsApi', () => {
  const insight = { id: '20261111T100000000Z_abcd1234', createdAt: '2026-11-11T10:00:00.000Z', period: { from: '2026-10-01', to: '2026-10-31' }, accountId: null, summary: 's', sections: [], model: 'm', tradeCount: 18 };

  it('generate / list', async () => {
    const store = makeStore();
    handler = () => envelope({ insight });
    const g = await store.dispatch(insightsApi.endpoints.generateInsight.initiate({ from: '2026-10-01', to: '2026-10-31' }));
    expect((g as any).data.id).toBe(insight.id);
    expect(calls[0]).toMatchObject({ method: 'POST', body: { from: '2026-10-01', to: '2026-10-31' } });

    handler = () => envelope({ insights: [insight], nextCursor: null });
    const l = await store.dispatch(insightsApi.endpoints.listInsights.initiate({ accountId: 'acc1', limit: 5 }));
    expect(l.data?.insights).toHaveLength(1);
    expect(calls[1].url.searchParams.get('accountId')).toBe('acc1');
    expect(calls[1].url.searchParams.get('limit')).toBe('5');
  });

  it('422 NOT_ENOUGH_TRADES keeps its error code', async () => {
    handler = () => errorEnvelope(422, { errorCode: 'NOT_ENOUGH_TRADES', message: 'At least 5 closed trades are needed' });
    const r = await makeStore().dispatch(insightsApi.endpoints.generateInsight.initiate({ from: '2026-10-01', to: '2026-10-31' }));
    expect((r as any).error.status).toBe(422);
    expect((r as any).error.data.errorCode).toBe('NOT_ENOUGH_TRADES');
  });
});

describe('chatApi', () => {
  const session = { id: '20261111T100000000Z_abcd1234', title: '', createdAt: 'x', updatedAt: 'x', messageCount: 0 };
  const sse = (s: string) => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(s)); c.close(); } }), { status: 200, headers: { 'content-type': 'text/event-stream' } });

  it('sessions and messages unwrap their lists', async () => {
    const store = makeStore();
    handler = () => envelope({ session });
    const created = await store.dispatch(chatApi.endpoints.createChatSession.initiate({ title: 'x' }));
    expect((created as any).data.id).toBe(session.id);
    handler = () => envelope({ sessions: [session] });
    expect((await store.dispatch(chatApi.endpoints.listChatSessions.initiate())).data).toHaveLength(1);
    handler = () => envelope({ messages: [{ id: 'm', role: 'user', content: 'hi', createdAt: 'x' }] });
    expect((await store.dispatch(chatApi.endpoints.getChatMessages.initiate(session.id))).data?.[0].content).toBe('hi');
    handler = () => envelope({ deleted: true });
    await store.dispatch(chatApi.endpoints.deleteChatSession.initiate(session.id));
    expect(calls.some((c) => c.method === 'DELETE' && c.url.pathname.endsWith(`/chat/sessions/${session.id}`))).toBe(true);
  });

  it('sendChatMessage streams tokens through the callback and returns the full answer', async () => {
    const tokens: string[] = [];
    handler = (c) =>
      c.url.pathname.endsWith('/messages') && c.method === 'POST'
        ? sse('event: token\ndata: {"t":"Hi "}\n\nevent: token\ndata: {"t":"there"}\n\nevent: done\ndata: {"messageId":"m2","usage":{"promptTokens":1,"outputTokens":1,"remaining":4},"disclaimer":"d","tradeIds":[]}\n\n')
        : envelope({ messages: [] });
    const r = await makeStore().dispatch(chatApi.endpoints.sendChatMessage.initiate({ sessionId: session.id, content: 'q', onToken: (t) => tokens.push(t) }));
    expect(tokens).toEqual(['Hi ', 'there']);
    expect((r as any).data).toMatchObject({ content: 'Hi there', done: { messageId: 'm2', usage: { remaining: 4 } } });
  });

  it('sendChatMessage returns a 402 as an RTK error carrying feature and limit', async () => {
    handler = () => errorEnvelope(402, { errorCode: 'QUOTA_EXCEEDED', message: 'limit', error: { code: 'QUOTA_EXCEEDED', feature: 'ai_chat', limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' } });
    const r = await makeStore().dispatch(chatApi.endpoints.sendChatMessage.initiate({ sessionId: session.id, content: 'q' }));
    expect((r as any).error).toMatchObject({ status: 402, data: { errorCode: 'QUOTA_EXCEEDED', error: { feature: 'ai_chat', limit: 10 } } });
  });
});

describe('billingApi', () => {
  it('entitlements, checkout and portal', async () => {
    const store = makeStore();
    const ent = { entitlements: { plan: 'trial', status: 'trial', limits: { ai_extract: 200, ai_insight: 30, ai_chat: 500, broker_import: 200 }, features: { advanced_analytics: true, tax_report: true, unlimited_accounts: true, auto_sync: true } }, usage: { ai_extract: 0, ai_insight: 0, ai_chat: 0, broker_import: 0 }, periodResetsAt: '2026-12-01T00:00:00.000Z' };
    handler = () => envelope(ent);
    expect((await store.dispatch(billingApi.endpoints.getEntitlements.initiate())).data?.entitlements.plan).toBe('trial');
    expect(calls[0].url.pathname).toMatch(/\/me\/entitlements$/);
    handler = () => envelope({ url: 'https://checkout.stripe.test/c/1' });
    const co = await store.dispatch(billingApi.endpoints.createCheckout.initiate({ interval: 'year' }));
    expect((co as any).data.url).toMatch(/^https:/);
    expect(calls[1]).toMatchObject({ method: 'POST', body: { interval: 'year' } });
    await store.dispatch(billingApi.endpoints.openPortal.initiate());
    expect(calls[2]).toMatchObject({ method: 'POST' });
    expect(calls[2].url.pathname).toMatch(/\/billing\/portal$/);
  });
});
