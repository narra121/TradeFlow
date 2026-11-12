/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles read untyped fetch and stream bodies */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLAN_SIGNAL_EVENT } from '@/lib/planErrors';
import { ChatStreamError, splitTradeRefs, streamChat } from '../chatStream';
import { SseParser } from '../sse';

const enc = new TextEncoder();
const sseResponse = (chunks: string[], init: ResponseInit = { status: 200 }) =>
  new Response(
    new ReadableStream({
      start(c) {
        for (const ch of chunks) c.enqueue(enc.encode(ch));
        c.close();
      },
    }),
    { ...init, headers: { 'content-type': 'text/event-stream' } },
  );
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const FRAMES =
  'event: token\ndata: {"t":"Hello "}\n\n: ping\n\nevent: token\ndata: {"t":"world [#t1]"}\n\n' +
  'event: done\ndata: {"messageId":"m1","usage":{"promptTokens":10,"outputTokens":5,"remaining":9},"disclaimer":"d","tradeIds":["t1"]}\n\n';

describe('SseParser', () => {
  it('parses frames split at every possible byte boundary', () => {
    const expected = [
      { event: 'token', data: '{"t":"Hello "}' },
      { event: 'token', data: '{"t":"world [#t1]"}' },
      { event: 'done', data: expect.stringContaining('"messageId":"m1"') },
    ];
    for (let i = 1; i < FRAMES.length; i++) {
      const p = new SseParser();
      expect([...p.push(FRAMES.slice(0, i)), ...p.push(FRAMES.slice(i)), ...p.end()]).toEqual(expected);
    }
  });

  it('handles CRLF (also split between \\r and \\n), multi-line data and a missing final blank line', () => {
    const p = new SseParser();
    const out = [...p.push('event: a\r'), ...p.push('\ndata: one\r\ndata: two\r\n\r\n'), ...p.push('data: tail'), ...p.end()];
    expect(out).toEqual([
      { event: 'a', data: 'one\ntwo' },
      { event: 'message', data: 'tail' },
    ]);
  });
});

describe('streamChat', () => {
  afterEach(() => vi.restoreAllMocks());
  const base = { sessionId: 's1', content: 'hi', getToken: () => 'tok', refresh: vi.fn(async () => 'fresh') };

  it('emits tokens in order and resolves with the done payload', async () => {
    const tokens: string[] = [];
    const fetchImpl = vi.fn(async () => sseResponse([FRAMES.slice(0, 30), FRAMES.slice(30, 90), FRAMES.slice(90)]));
    const done = await streamChat({ ...base, fetchImpl: fetchImpl as any, onToken: (t) => tokens.push(t) });
    expect(tokens).toEqual(['Hello ', 'world [#t1]']);
    expect(done).toMatchObject({ messageId: 'm1', tradeIds: ['t1'], usage: { remaining: 9 } });
    const [url, init] = fetchImpl.mock.calls[0] as any;
    expect(url).toMatch(/\/chat\/sessions\/s1\/messages$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ content: 'hi' });
  });

  it('refreshes the token once on 401 and retries', async () => {
    const refresh = vi.fn(async () => 'fresh');
    const fetchImpl = vi.fn().mockResolvedValueOnce(json(401, { message: 'Unauthorized' })).mockResolvedValueOnce(sseResponse([FRAMES]));
    await streamChat({ ...base, refresh, fetchImpl: fetchImpl as any, onToken: () => {} });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[1] as any)[1].headers.Authorization).toBe('Bearer fresh');
  });

  it('does not loop: a second 401 is an error', async () => {
    const fetchImpl = vi.fn(async () => json(401, { message: 'Unauthorized' }));
    await expect(streamChat({ ...base, fetchImpl: fetchImpl as any, onToken: () => {} })).rejects.toMatchObject({ status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('402 becomes a typed error with feature/limit/resetsAt and raises the plan signal', async () => {
    const heard = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, heard);
    const fetchImpl = vi.fn(async () =>
      json(402, { success: false, errorCode: 'QUOTA_EXCEEDED', message: 'Monthly limit reached for ai_chat (10).', error: { code: 'QUOTA_EXCEEDED', feature: 'ai_chat', limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' } }),
    );
    const err = await streamChat({ ...base, fetchImpl: fetchImpl as any, onToken: () => {} }).catch((e) => e);
    window.removeEventListener(PLAN_SIGNAL_EVENT, heard);
    expect(err).toBeInstanceOf(ChatStreamError);
    expect(err).toMatchObject({ status: 402, code: 'QUOTA_EXCEEDED', feature: 'ai_chat', limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('an error frame after tokens rejects (tokens already delivered)', async () => {
    const tokens: string[] = [];
    const fetchImpl = vi.fn(async () => sseResponse(['event: token\ndata: {"t":"Part"}\n\n', 'event: error\ndata: {"code":"AI_UNAVAILABLE","message":"cut"}\n\n']));
    await expect(streamChat({ ...base, fetchImpl: fetchImpl as any, onToken: (t) => tokens.push(t) })).rejects.toMatchObject({ code: 'AI_UNAVAILABLE', message: 'cut' });
    expect(tokens).toEqual(['Part']);
  });

  it('a stream that ends without done rejects', async () => {
    const fetchImpl = vi.fn(async () => sseResponse(['event: token\ndata: {"t":"x"}\n\n']));
    await expect(streamChat({ ...base, fetchImpl: fetchImpl as any, onToken: () => {} })).rejects.toMatchObject({ code: 'STREAM_ENDED' });
  });

  it('abort rejects with the AbortError', async () => {
    const ac = new AbortController();
    const fetchImpl = vi.fn(async (_u: string, init: RequestInit) => {
      ac.abort();
      if (init.signal?.aborted) throw new DOMException('aborted', 'AbortError');
      return sseResponse([FRAMES]);
    });
    await expect(streamChat({ ...base, signal: ac.signal, fetchImpl: fetchImpl as any, onToken: () => {} })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('splitTradeRefs', () => {
  it('turns [#id] into trade parts and keeps the text around them', () => {
    expect(splitTradeRefs('Best was [#a1] and worst [#b2].')).toEqual([
      { type: 'text', text: 'Best was ' },
      { type: 'trade', id: 'a1' },
      { type: 'text', text: ' and worst ' },
      { type: 'trade', id: 'b2' },
      { type: 'text', text: '.' },
    ]);
  });

  it('leaves ids not in done.tradeIds as plain text so a foreign id is never linked', () => {
    const parts = splitTradeRefs('See [#a1] and [#zz].', ['a1']);
    expect(parts.filter((p) => p.type === 'trade')).toEqual([{ type: 'trade', id: 'a1' }]);
    expect(parts.map((p) => (p.type === 'text' ? p.text : '')).join('')).toContain('[#zz]');
  });
});
