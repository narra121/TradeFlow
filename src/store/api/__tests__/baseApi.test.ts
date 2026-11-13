import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
const getIdToken = vi.hoisted(() => vi.fn<(opts?: { forceRefresh?: boolean }) => Promise<string | null>>());
vi.mock('@/lib/auth/authService', () => ({ getIdToken }));

import { api } from '../baseApi';
import { connectionMessage, readApiError } from '@/lib/apiError';

const probeApi = api.injectEndpoints({
  endpoints: (b) => ({
    probeSave: b.mutation<unknown, void>({ query: () => ({ url: '/probe', method: 'POST', body: {} }) }),
    probeLoad: b.query<unknown, void>({ query: () => '/probe' }),
  }),
  overrideExisting: true,
});

const makeStore = () => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const envelope = (message: string, errorCode: string, extra: Record<string, unknown> = {}) => ({ success: false, message, errorCode, errorMessage: message, ...extra });

/** jsdom's AbortSignal is not accepted by Node's Request, so the request object is a stand-in; `fetch` is what answers. */
class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

async function save(respond: () => Response | Promise<Response>) {
  vi.stubGlobal('Request', StandInRequest);
  vi.stubGlobal('fetch', vi.fn(async () => respond()));
  const store = makeStore();
  const result = await store.dispatch(probeApi.endpoints.probeSave.initiate());
  return (result as { error?: { status: unknown; data?: unknown } }).error;
}

beforeEach(() => {
  localStorage.clear();
  getIdToken.mockReset();
  getIdToken.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('baseApi: an HTTP error keeps its status and the API message', () => {
  it.each([
    [400, 'VALIDATION_ERROR', 'A trade can have at most 6 images'],
    [401, 'UNAUTHORIZED', 'Your session has ended. Please log in again.'],
    [403, 'FORBIDDEN', 'You do not have access to this account.'],
    [404, 'NOT_FOUND', 'Trade not found'],
    [409, 'CONFLICT', 'That name is already in use.'],
    [422, 'VALIDATION_ERROR', 'Entry price must be a number'],
    [500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.'],
  ])('%i', async (status, code, message) => {
    const error = await save(() => json(status, envelope(message, code)));
    expect(error?.status).toBe(status);
    expect(readApiError(error)).toMatchObject({ message, code, status, kind: 'http' });
  });

  it('429 keeps retryAfter from the one envelope', async () => {
    const error = await save(() => json(429, envelope('Too many attempts', 'RATE_LIMITED', { error: { code: 'RATE_LIMITED', retryAfter: 286 } })));
    expect(readApiError(error)).toMatchObject({ message: 'Too many attempts', status: 429, retryAfter: 286 });
  });

  it('the same for a query', async () => {
    vi.stubGlobal('Request', StandInRequest);
    vi.stubGlobal('fetch', vi.fn(async () => json(404, envelope('Trade not found', 'NOT_FOUND'))));
    const result = await makeStore().dispatch(probeApi.endpoints.probeLoad.initiate());
    expect(readApiError((result as { error?: unknown }).error).message).toBe('Trade not found');
  });
});

describe('baseApi: a gateway page or an empty body is still an HTTP error', () => {
  it.each([502, 503, 504])('%i with an HTML body becomes a numeric status and reads as unavailable, not as offline', async (status) => {
    const error = await save(() => new Response('<html><body>Bad Gateway</body></html>', { status, headers: { 'content-type': 'text/html' } }));
    expect(error?.status).toBe(status);
    const info = readApiError(error, 'Could not save.');
    expect(info.kind).toBe('http');
    expect(info.message).not.toMatch(/internet connection|offline/i);
  });

  it('500 with a text body shows the text, with an empty body the caller fallback', async () => {
    expect(readApiError(await save(() => new Response('Bad input', { status: 400 }))).message).toBe('Bad input');
    const empty = await save(() => new Response('', { status: 500 }));
    expect(readApiError(empty, 'Could not save the trade.')).toMatchObject({ message: 'Could not save the trade.', status: 500, kind: 'http' });
  });
});

describe('baseApi: no HTTP response reads as a connection problem', () => {
  it('a rejected fetch is FETCH_ERROR with the connection message', async () => {
    const error = await save(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(error?.status).toBe('FETCH_ERROR');
    expect(error?.data).toBe(connectionMessage('network'));
    expect(readApiError(error)).toMatchObject({ kind: 'network', message: connectionMessage('network') });
  });

  it('says offline when the browser is offline', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const error = await save(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(readApiError(error).message).toMatch(/offline/i);
  });

  it('a request that times out is TIMEOUT_ERROR with the connection message', async () => {
    const error = await save(() => Promise.reject(new DOMException('signal timed out', 'TimeoutError')));
    expect(error?.status).toBe('TIMEOUT_ERROR');
    expect(error?.data).toBe(connectionMessage('timeout'));
    expect(readApiError(error)).toMatchObject({ kind: 'timeout', message: connectionMessage('timeout') });
  });
});

describe('baseApi: the ID token and the 401 retry', () => {
  const bearer = (req: unknown) => ((req as StandInRequest).init.headers as Headers).get('authorization');

  async function load(respond: (req: unknown, call: number) => Response) {
    vi.stubGlobal('Request', StandInRequest);
    let call = 0;
    const fetchMock = vi.fn(async (req: unknown) => respond(req, call++));
    vi.stubGlobal('fetch', fetchMock);
    const result = await makeStore().dispatch(probeApi.endpoints.probeLoad.initiate());
    return { result, fetchMock };
  }

  it('sends the ID token from the auth service', async () => {
    getIdToken.mockResolvedValue('id-token-1');
    const { fetchMock } = await load(() => json(200, { success: true, data: {} }));
    expect(bearer(fetchMock.mock.calls[0][0])).toBe('Bearer id-token-1');
  });

  it('sends no Authorization header when signed out', async () => {
    const { fetchMock } = await load(() => json(200, { success: true, data: {} }));
    expect(bearer(fetchMock.mock.calls[0][0])).toBeNull();
  });

  it('renews the token once on a 401 and retries with it', async () => {
    getIdToken.mockImplementation(async (opts) => (opts?.forceRefresh ? 'renewed' : 'stale'));
    const unauthorized = vi.fn();
    window.addEventListener('unauthorized', unauthorized);
    const { result, fetchMock } = await load((_req, call) => (call === 0 ? json(401, envelope('Your session has ended.', 'UNAUTHORIZED')) : json(200, { success: true, data: { ok: true } })));
    window.removeEventListener('unauthorized', unauthorized);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bearer(fetchMock.mock.calls[0][0])).toBe('Bearer stale');
    expect(getIdToken).toHaveBeenCalledWith({ forceRefresh: true });
    expect((result as { data?: unknown }).data).toEqual({ ok: true });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('ends the session when the renewal is refused', async () => {
    getIdToken.mockResolvedValue(null);
    const unauthorized = vi.fn();
    window.addEventListener('unauthorized', unauthorized);
    const { fetchMock } = await load(() => json(401, envelope('Your session has ended.', 'UNAUTHORIZED')));
    window.removeEventListener('unauthorized', unauthorized);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the renewal cannot reach Cognito (offline): the 401 is just an error', async () => {
    getIdToken.mockImplementation(async (opts) => {
      if (opts?.forceRefresh) throw new Error('NetworkError');
      return 'stale';
    });
    const unauthorized = vi.fn();
    window.addEventListener('unauthorized', unauthorized);
    const { fetchMock } = await load(() => json(401, envelope('Your session has ended.', 'UNAUTHORIZED')));
    window.removeEventListener('unauthorized', unauthorized);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('ends the session when the retry is still a 401', async () => {
    getIdToken.mockResolvedValue('t');
    const unauthorized = vi.fn();
    window.addEventListener('unauthorized', unauthorized);
    const { fetchMock } = await load(() => json(401, envelope('Your session has ended.', 'UNAUTHORIZED')));
    window.removeEventListener('unauthorized', unauthorized);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});
