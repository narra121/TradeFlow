import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => storage.set(key, val)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() { return storage.size; },
  key: vi.fn(),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockJsonResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('tokenRefresh — refreshToken()', () => {
  let refreshToken: () => Promise<string>;

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.clear();
    mockFetch.mockReset();

    // Reset module state so the singleton promise is cleared between tests
    vi.resetModules();
    const mod = await import('../tokenRefresh');
    refreshToken = mod.refreshToken;
  });

  // -----------------------------------------------------------------------
  // Successful refresh
  // -----------------------------------------------------------------------
  describe('successful refresh', () => {
    it('returns the new token from the response (IdToken field)', async () => {
      storage.set('refreshToken', 'rt-valid');
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'new-id-token-123' } }),
      );

      const token = await refreshToken();

      expect(token).toBe('new-id-token-123');
    });

    it('returns the new token from the response (token field)', async () => {
      storage.set('refreshToken', 'rt-valid');
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { token: 'alt-token-456' } }),
      );

      const token = await refreshToken();

      expect(token).toBe('alt-token-456');
    });

    it('handles flat response format (no data envelope)', async () => {
      storage.set('refreshToken', 'rt-valid');
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ IdToken: 'flat-token-789' }),
      );

      const token = await refreshToken();

      expect(token).toBe('flat-token-789');
    });

    it('persists the new token to localStorage', async () => {
      storage.set('refreshToken', 'rt-valid');
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'persisted-token' } }),
      );

      await refreshToken();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('idToken', 'persisted-token');
      expect(storage.get('idToken')).toBe('persisted-token');
    });

    it('sends the refresh token in the POST body', async () => {
      storage.set('refreshToken', 'my-rt');
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'tok' } }),
      );

      await refreshToken();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/refresh');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(opts.body)).toEqual({ refreshToken: 'my-rt' });
    });
  });

  // -----------------------------------------------------------------------
  // No refresh token
  // -----------------------------------------------------------------------
  describe('no refresh token available', () => {
    it('throws immediately when no refresh token exists in localStorage', async () => {
      // storage has no refreshToken
      await expect(refreshToken()).rejects.toThrow('No refresh token');
    });

    it('does not make any network request', async () => {
      await expect(refreshToken()).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Failed refresh
  // -----------------------------------------------------------------------
  describe('failed refresh', () => {
    it('throws when the refresh endpoint returns a non-OK status', async () => {
      storage.set('refreshToken', 'rt-valid');
      // doRefresh retries transient errors (2 attempts total)
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 401));
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 401));

      await expect(refreshToken()).rejects.toThrow('Refresh failed');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws when the response contains no token', async () => {
      storage.set('refreshToken', 'rt-valid');
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { somethingElse: 'no-token-here' } }),
      );

      await expect(refreshToken()).rejects.toThrow('No token in response');
    });

    it('throws when fetch itself rejects (network error)', async () => {
      storage.set('refreshToken', 'rt-valid');
      // TypeError (network error) is transient, so doRefresh retries (2 attempts)
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(refreshToken()).rejects.toThrow('Failed to fetch');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries once on transient failure then succeeds', async () => {
      storage.set('refreshToken', 'rt-valid');
      // First attempt fails, second succeeds
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 503));
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'retried-token' } }),
      );

      const token = await refreshToken();
      expect(token).toBe('retried-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clears the singleton promise so the next call retries', async () => {
      storage.set('refreshToken', 'rt-valid');

      // First call fails (2 attempts due to retry)
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 500));
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 500));
      await expect(refreshToken()).rejects.toThrow('Refresh failed');

      // Second call should make a new request (not reuse the failed promise)
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'recovered-token' } }),
      );
      const token = await refreshToken();
      expect(token).toBe('recovered-token');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // -----------------------------------------------------------------------
  // Concurrent refresh deduplication
  // -----------------------------------------------------------------------
  describe('concurrent refresh deduplication', () => {
    it('shares the same promise for concurrent calls', async () => {
      storage.set('refreshToken', 'rt-valid');

      let fetchResolve!: (value: any) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => { fetchResolve = resolve; }),
      );

      // Fire three concurrent calls
      const p1 = refreshToken();
      const p2 = refreshToken();
      const p3 = refreshToken();

      // Only one fetch should have been initiated
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Resolve the single fetch
      fetchResolve(mockJsonResponse({ data: { IdToken: 'shared-token' } }));

      const [t1, t2, t3] = await Promise.all([p1, p2, p3]);
      expect(t1).toBe('shared-token');
      expect(t2).toBe('shared-token');
      expect(t3).toBe('shared-token');
    });

    it('all concurrent callers receive the same rejection on failure', async () => {
      storage.set('refreshToken', 'rt-valid');

      let fetchReject!: (reason: any) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((_, reject) => { fetchReject = reject; }),
      );

      const p1 = refreshToken();
      const p2 = refreshToken();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      fetchReject(new Error('Boom'));

      await expect(p1).rejects.toThrow('Boom');
      await expect(p2).rejects.toThrow('Boom');
    });

    it('allows a new request after the shared promise settles', async () => {
      storage.set('refreshToken', 'rt-valid');

      // First batch: succeeds
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'first-token' } }),
      );

      const first = await refreshToken();
      expect(first).toBe('first-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call after settlement — should trigger a new fetch
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'second-token' } }),
      );

      const second = await refreshToken();
      expect(second).toBe('second-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('allows a new request after a shared failure settles', async () => {
      storage.set('refreshToken', 'rt-valid');

      // First call fails (2 attempts due to retry)
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 500));
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 500));
      await expect(refreshToken()).rejects.toThrow('Refresh failed');

      // Singleton is cleared, so a new call triggers a fresh fetch
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { IdToken: 'retry-token' } }),
      );
      const token = await refreshToken();
      expect(token).toBe('retry-token');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
