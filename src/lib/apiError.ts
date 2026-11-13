/**
 * `network` and `timeout`: no HTTP response reached the browser. `http`: the API (or a gateway) answered with a status.
 * `unknown`: anything else thrown (plain Error, abort).
 */
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'unknown';

export interface ApiErrorInfo {
  message: string;
  code?: string;
  status?: number;
  kind: ApiErrorKind;
  /** Seconds to wait before retrying (429). */
  retryAfter?: number;
}

const CONNECTION_MESSAGE = {
  offline: 'You appear to be offline. Check your internet connection and try again.',
  network: "Can't reach TradeQut. Check your internet connection and try again.",
  timeout: 'The request timed out. Check your internet connection and try again.',
} as const;

/** The only place that words a failure with no HTTP response; baseApi puts it in RTK's `FETCH_ERROR` / `TIMEOUT_ERROR` data. */
export function connectionMessage(kind: 'network' | 'timeout'): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return CONNECTION_MESSAGE.offline;
  return CONNECTION_MESSAGE[kind];
}

/** Answers from a gateway (CloudFront, the Lambda endpoint) are HTML or text, so their body is never shown. */
const GATEWAY_MESSAGES: Record<number, string> = {
  413: 'That is too large to send.',
  429: 'Too many requests. Wait a moment and try again.',
  502: 'TradeQut is temporarily unavailable. Please try again in a moment.',
  503: 'TradeQut is temporarily unavailable. Please try again in a moment.',
  504: 'TradeQut took too long to answer. Please try again.',
};

const FETCH_FAILURE = /failed to fetch|networkerror|load failed|network request failed/i;
const MAX_TEXT_BODY = 200;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function noResponseKind(e: Record<string, unknown>, hasResponse: boolean): 'network' | 'timeout' | undefined {
  if (e.status === 'TIMEOUT_ERROR' || e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT' || e.name === 'TimeoutError') return 'timeout';
  if (e.status === 'FETCH_ERROR' || e.code === 'ERR_NETWORK') return 'network';
  if (!hasResponse && e instanceof TypeError && FETCH_FAILURE.test(e.message)) return 'network';
  return undefined;
}

function plainTextBody(data: unknown): string | undefined {
  const text = str(data);
  if (!text || text.length > MAX_TEXT_BODY || /[<\n]/.test(text) || /^[[{]/.test(text)) return undefined;
  return text;
}

/**
 * The one reader for anything thrown by RTK Query, axios or fetch: `{ status, data }` where data is the API envelope
 * `{ message, errorCode, error?: { code, retryAfter } }` or text, `{ response: { status, data } }`, or a plain Error.
 * A failure with an HTTP response reads the API's message; only a failure without one reads as a connection problem.
 */
export function readApiError(err: unknown, fallback = 'Something went wrong'): ApiErrorInfo {
  const e = (err ?? {}) as Record<string, unknown>;
  const response = (e.response ?? {}) as Record<string, unknown>;
  const data = e.data ?? response.data;
  const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const nested = (body.error && typeof body.error === 'object' ? body.error : {}) as Record<string, unknown>;
  const first = (Array.isArray(body.errors) ? body.errors[0] : undefined) as Record<string, unknown> | undefined;
  const status = num(e.status) ?? num(e.originalStatus) ?? num(response.status);

  const noResponse = noResponseKind(e, status !== undefined);
  const code =
    str(body.errorCode) ?? str(nested.code) ?? str(body.code) ?? str(typeof body.error === 'string' ? body.error : undefined) ?? str(e.errorCode) ?? str(typeof e.code === 'string' ? e.code : undefined);
  if (noResponse) return { message: connectionMessage(noResponse), code, status, kind: noResponse };

  const retryAfter = num(nested.retryAfter) ?? num(first?.retryAfter) ?? num((nested.details as Record<string, unknown> | undefined)?.retryAfter) ?? num(body.retryAfter);
  const fromBody = str(body.message) ?? str(body.errorMessage) ?? str(nested.message) ?? str(body.error) ?? str(first?.message);
  const gateway = status !== undefined ? GATEWAY_MESSAGES[status] : undefined;
  const message = fromBody ?? gateway ?? plainTextBody(data) ?? str(e.message) ?? fallback;
  return {
    message,
    code,
    status,
    kind: status !== undefined ? 'http' : 'unknown',
    ...(retryAfter && retryAfter > 0 ? { retryAfter: Math.ceil(retryAfter) } : {}),
  };
}

/** The same reading for a `fetch` Response that is not ok, for code that calls `fetch` directly. */
export async function readResponseError(res: Response, fallback?: string): Promise<ApiErrorInfo> {
  const text = await (res.text?.() ?? Promise.resolve('')).catch(() => '');
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* plain text or empty body */
  }
  return readApiError({ status: res.status, data }, fallback);
}
