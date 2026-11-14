/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { API_BASE_URL } from '@/lib/api/config';
import { getIdToken } from '@/lib/auth/authService';
import { classifyPlanError, emitPlanSignal } from '@/lib/planErrors';
import { readApiError } from '@/lib/apiError';
import type { ChatDonePayload, ChatStreamErrorInfo } from '@/types/chat';
import { SseParser } from './sse';

/** Typed failure of a chat turn: HTTP error before the stream, or an `event: error` frame after it started. */
export class ChatStreamError extends Error implements ChatStreamErrorInfo {
  status: number;
  code: string;
  feature?: ChatStreamErrorInfo['feature'];
  limit?: number;
  resetsAt?: string;
  currencies?: string[];

  constructor(info: ChatStreamErrorInfo) {
    super(info.message);
    this.name = 'ChatStreamError';
    this.status = info.status;
    this.code = info.code;
    this.feature = info.feature;
    this.limit = info.limit;
    this.resetsAt = info.resetsAt;
    this.currencies = info.currencies;
  }
}

export interface StreamChatOptions {
  sessionId: string;
  content: string;
  /** undefined = not sent (the session's own scope); null = all accounts */
  accountId?: string | null;
  signal?: AbortSignal;
  onToken: (text: string) => void;
  /** one call per `event: tool` frame, before that tool runs */
  onTool?: (name: string) => void;
  /** test hooks */
  fetchImpl?: typeof fetch;
  getToken?: () => string | null | Promise<string | null>;
  refresh?: () => Promise<string | null>;
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
    message: readApiError({ status: res.status, data: body }, `Request failed (${res.status})`).message,
    feature: info.feature,
    limit: info.limit,
    resetsAt: info.resetsAt,
    currencies: Array.isArray(info.currencies) ? info.currencies.filter((c: unknown): c is string => typeof c === 'string') : undefined,
  });
}

/**
 * Sends one chat message and streams the answer: `onToken` per `token` event, resolves with the `done` payload.
 * A 401 refreshes the token once and retries. Rejects with ChatStreamError (HTTP error, `event: error`, or a
 * stream that ends without `done`); an aborted request rejects with the fetch AbortError.
 */
export async function streamChat(opts: StreamChatOptions): Promise<ChatDonePayload> {
  const doFetch = opts.fetchImpl ?? fetch;
  const getToken = opts.getToken ?? (() => getIdToken());
  const refresh = opts.refresh ?? (() => getIdToken({ forceRefresh: true }));
  const url = `${API_BASE_URL}/chat/sessions/${encodeURIComponent(opts.sessionId)}/messages`;

  const attempt = (token: string | null) =>
    doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(opts.accountId === undefined ? { content: opts.content } : { content: opts.content, accountId: opts.accountId }),
      signal: opts.signal,
    });

  let res = await attempt(await getToken());
  if (res.status === 401) {
    let fresh: string | null = null;
    try {
      fresh = await refresh();
    } catch {
      // no renewed token: the 401 below is final
    }
    if (fresh) res = await attempt(fresh);
    // The same event baseApi raises: the app signs the user out and returns to login.
    if (res.status === 401) window.dispatchEvent(new CustomEvent('unauthorized'));
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
      else if (ev.event === 'tool' && typeof data?.name === 'string') opts.onTool?.(data.name);
      else if (ev.event === 'done') done = { ...data, tables: Array.isArray(data?.tables) ? data.tables : [] } as ChatDonePayload;
      else if (ev.event === 'error') throw new ChatStreamError({ status: res.status, code: data?.code ?? 'STREAM_ERROR', message: data?.message ?? 'The answer could not be completed.' });
    }
  };

  try {
    for (;;) {
      const { value, done: finished } = await reader.read();
      if (finished) break;
      handle(parser.push(decoder.decode(value, { stream: true })));
    }
    handle(parser.push(decoder.decode()));
    handle(parser.end());
  } finally {
    // An error frame or an abort leaves the connection open: stop the download so the server stops generating.
    reader.cancel().catch(() => undefined);
  }
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
