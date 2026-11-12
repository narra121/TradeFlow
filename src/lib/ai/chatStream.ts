/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { API_BASE_URL } from '@/lib/api/config';
import { refreshToken } from '@/lib/api/tokenRefresh';
import { classifyPlanError, emitPlanSignal } from '@/lib/planErrors';
import type { ChatDonePayload, ChatStreamErrorInfo } from '@/types/chat';
import { SseParser } from './sse';

/** Typed failure of a chat turn: HTTP error before the stream, or an `event: error` frame after it started. */
export class ChatStreamError extends Error implements ChatStreamErrorInfo {
  status: number;
  code: string;
  feature?: ChatStreamErrorInfo['feature'];
  limit?: number;
  resetsAt?: string;

  constructor(info: ChatStreamErrorInfo) {
    super(info.message);
    this.name = 'ChatStreamError';
    this.status = info.status;
    this.code = info.code;
    this.feature = info.feature;
    this.limit = info.limit;
    this.resetsAt = info.resetsAt;
  }
}

export interface StreamChatOptions {
  sessionId: string;
  content: string;
  signal?: AbortSignal;
  onToken: (text: string) => void;
  /** test hooks */
  fetchImpl?: typeof fetch;
  getToken?: () => string | null;
  refresh?: () => Promise<string>;
}

async function errorFromResponse(res: Response): Promise<ChatStreamError> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const info = body?.error && typeof body.error === 'object' ? body.error : {};
  if (res.status === 402) {
    const signal = classifyPlanError(402, body, 'mutation');
    if (signal) emitPlanSignal(signal);
  }
  return new ChatStreamError({
    status: res.status,
    code: body?.errorCode ?? info.code ?? 'REQUEST_FAILED',
    message: body?.errorMessage ?? body?.message ?? `Request failed (${res.status})`,
    feature: info.feature,
    limit: info.limit,
    resetsAt: info.resetsAt,
  });
}

/**
 * Sends one chat message and streams the answer: `onToken` per `token` event, resolves with the `done` payload.
 * A 401 refreshes the token once and retries. Rejects with ChatStreamError (HTTP error, `event: error`, or a
 * stream that ends without `done`); an aborted request rejects with the fetch AbortError.
 */
export async function streamChat(opts: StreamChatOptions): Promise<ChatDonePayload> {
  const doFetch = opts.fetchImpl ?? fetch;
  const getToken = opts.getToken ?? (() => localStorage.getItem('idToken'));
  const refresh = opts.refresh ?? refreshToken;
  const url = `${API_BASE_URL}/chat/sessions/${encodeURIComponent(opts.sessionId)}/messages`;

  const attempt = (token: string | null) =>
    doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ content: opts.content }),
      signal: opts.signal,
    });

  let res = await attempt(getToken());
  if (res.status === 401) {
    let fresh: string;
    try {
      fresh = await refresh();
    } catch {
      throw await errorFromResponse(res);
    }
    res = await attempt(fresh);
  }
  if (!res.ok) throw await errorFromResponse(res);
  if (!res.body) throw new ChatStreamError({ status: res.status, code: 'NO_STREAM', message: 'The server did not return a stream.' });

  const parser = new SseParser();
  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let done: ChatDonePayload | null = null;

  const handle = (events: { event: string; data: string }[]) => {
    for (const ev of events) {
      let data: any;
      try {
        data = JSON.parse(ev.data);
      } catch {
        continue;
      }
      if (ev.event === 'token' && typeof data?.t === 'string') opts.onToken(data.t);
      else if (ev.event === 'done') done = data as ChatDonePayload;
      else if (ev.event === 'error') throw new ChatStreamError({ status: res.status, code: data?.code ?? 'STREAM_ERROR', message: data?.message ?? 'The answer could not be completed.' });
    }
  };

  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    handle(parser.push(decoder.decode(value, { stream: true })));
  }
  handle(parser.push(decoder.decode()));
  handle(parser.end());
  if (!done) throw new ChatStreamError({ status: res.status, code: 'STREAM_ENDED', message: 'The answer was cut off. Please ask again.' });
  return done;
}

/** `[#tradeId]` references in an assistant answer, split into text and trade parts (for chips). */
export function splitTradeRefs(text: string, knownIds?: readonly string[]): ({ type: 'text'; text: string } | { type: 'trade'; id: string })[] {
  const known = knownIds ? new Set(knownIds) : null;
  const out: ({ type: 'text'; text: string } | { type: 'trade'; id: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[#([^\]\s]{1,64})\]/g)) {
    if (known && !known.has(m[1])) continue;
    if (m.index! > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    out.push({ type: 'trade', id: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}
