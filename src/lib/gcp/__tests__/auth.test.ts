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
function makeStsResponse(accessToken: string, expiresIn = 3600) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ access_token: accessToken, expires_in: expiresIn }),
    text: vi.fn().mockResolvedValue(''),
  };
}

function makeErrorResponse(status = 400, body = 'Bad Request') {
  return {
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('not json')),
    text: vi.fn().mockResolvedValue(body),
  };
}

describe('GCP auth — getGoogleAccessToken()', () => {
  let getGoogleAccessToken: () => Promise<string>;
  let clearGoogleToken: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.clear();
    mockFetch.mockReset();

    // Reset module state so the singleton promise and cache are cleared
    vi.resetModules();
    const mod = await import('../auth');
    getGoogleAccessToken = mod.getGoogleAccessToken;
    clearGoogleToken = mod.clearGoogleToken;
  });

  // -----------------------------------------------------------------------
  // Successful exchange
  // -----------------------------------------------------------------------
  describe('successful exchange', () => {
    it('returns a Google access token from STS', async () => {
      storage.set('idToken', 'cognito-jwt-token');
      mockFetch.mockResolvedValueOnce(makeStsResponse('gcp-access-token-123'));

      const token = await getGoogleAccessToken();

      expect(token).toBe('gcp-access-token-123');
    });

    it('sends correct STS request parameters', async () => {
      storage.set('idToken', 'my-cognito-token');
      mockFetch.mockResolvedValueOnce(makeStsResponse('tok'));

      await getGoogleAccessToken();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://sts.googleapis.com/v1/token');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const body = new URLSearchParams(opts.body);
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:token-exchange');
      expect(body.get('subject_token')).toBe('my-cognito-token');
      expect(body.get('subject_token_type')).toBe('urn:ietf:params:oauth:token-type:jwt');
      expect(body.get('requested_token_type')).toBe('urn:ietf:params:oauth:token-type:access_token');
      expect(body.get('scope')).toBe('https://www.googleapis.com/auth/cloud-platform');
      expect(body.get('audience')).toContain('workloadIdentityPools');
    });
  });

  // -----------------------------------------------------------------------
  // No Cognito token
  // -----------------------------------------------------------------------
  describe('no Cognito token', () => {
    it('throws when no idToken exists in localStorage', async () => {
      // storage has no idToken
      await expect(getGoogleAccessToken()).rejects.toThrow('No Cognito ID token available');
    });

    it('does not make any network request', async () => {
      await expect(getGoogleAccessToken()).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // STS errors
  // -----------------------------------------------------------------------
  describe('STS errors', () => {
    it('throws when STS returns a non-OK status', async () => {
      storage.set('idToken', 'cognito-jwt');
      mockFetch.mockResolvedValueOnce(makeErrorResponse(400, 'invalid_grant'));

      await expect(getGoogleAccessToken()).rejects.toThrow('STS token exchange failed (400)');
    });

    it('throws when STS response has no access_token', async () => {
      storage.set('idToken', 'cognito-jwt');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ token_type: 'Bearer' }),
        text: vi.fn().mockResolvedValue(''),
      });

      await expect(getGoogleAccessToken()).rejects.toThrow('No access_token in STS response');
    });

    it('throws when fetch itself rejects (network error)', async () => {
      storage.set('idToken', 'cognito-jwt');
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(getGoogleAccessToken()).rejects.toThrow('Failed to fetch');
    });
  });

  // -----------------------------------------------------------------------
  // Token caching
  // -----------------------------------------------------------------------
  describe('token caching', () => {
    it('returns cached token on second call without fetching again', async () => {
      storage.set('idToken', 'cognito-jwt');
      mockFetch.mockResolvedValueOnce(makeStsResponse('cached-token', 3600));

      const first = await getGoogleAccessToken();
      const second = await getGoogleAccessToken();

      expect(first).toBe('cached-token');
      expect(second).toBe('cached-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('refetches when token is near expiry (within 5 min buffer)', async () => {
      storage.set('idToken', 'cognito-jwt');

      // First call: token expires in 4 minutes (240s) — already within the 5-min buffer on next call
      mockFetch.mockResolvedValueOnce(makeStsResponse('short-lived-token', 240));

      const first = await getGoogleAccessToken();
      expect(first).toBe('short-lived-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should refetch because 240s < 300s buffer
      mockFetch.mockResolvedValueOnce(makeStsResponse('refreshed-token', 3600));
      const second = await getGoogleAccessToken();
      expect(second).toBe('refreshed-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clearGoogleToken clears the cached token', async () => {
      storage.set('idToken', 'cognito-jwt');
      mockFetch.mockResolvedValueOnce(makeStsResponse('token-to-clear', 3600));

      await getGoogleAccessToken();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      clearGoogleToken();

      // Next call should fetch again
      mockFetch.mockResolvedValueOnce(makeStsResponse('new-token-after-clear', 3600));
      const token = await getGoogleAccessToken();
      expect(token).toBe('new-token-after-clear');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // Singleton deduplication
  // -----------------------------------------------------------------------
  describe('singleton deduplication', () => {
    it('shares the same promise for concurrent calls', async () => {
      storage.set('idToken', 'cognito-jwt');

      let fetchResolve!: (value: any) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => { fetchResolve = resolve; }),
      );

      // Fire three concurrent calls
      const p1 = getGoogleAccessToken();
      const p2 = getGoogleAccessToken();
      const p3 = getGoogleAccessToken();

      // Only one fetch should have been initiated
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Resolve the single fetch
      fetchResolve(makeStsResponse('shared-token'));

      const [t1, t2, t3] = await Promise.all([p1, p2, p3]);
      expect(t1).toBe('shared-token');
      expect(t2).toBe('shared-token');
      expect(t3).toBe('shared-token');
    });

    it('all concurrent callers receive the same rejection on failure', async () => {
      storage.set('idToken', 'cognito-jwt');

      let fetchReject!: (reason: any) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((_, reject) => { fetchReject = reject; }),
      );

      const p1 = getGoogleAccessToken();
      const p2 = getGoogleAccessToken();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      fetchReject(new Error('Network boom'));

      await expect(p1).rejects.toThrow('Network boom');
      await expect(p2).rejects.toThrow('Network boom');
    });

    it('allows a new request after the shared promise settles', async () => {
      storage.set('idToken', 'cognito-jwt');

      // First call succeeds
      mockFetch.mockResolvedValueOnce(makeStsResponse('first-token', 1));
      const first = await getGoogleAccessToken();
      expect(first).toBe('first-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Token has 1s expiry, which is within the 5-min buffer, so next call re-fetches
      mockFetch.mockResolvedValueOnce(makeStsResponse('second-token', 3600));
      const second = await getGoogleAccessToken();
      expect(second).toBe('second-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clears singleton promise after failure so retries work', async () => {
      storage.set('idToken', 'cognito-jwt');

      // First call fails
      mockFetch.mockResolvedValueOnce(makeErrorResponse(500, 'Internal'));
      await expect(getGoogleAccessToken()).rejects.toThrow('STS token exchange failed');

      // Second call should trigger a new fetch
      mockFetch.mockResolvedValueOnce(makeStsResponse('recovered-token', 3600));
      const token = await getGoogleAccessToken();
      expect(token).toBe('recovered-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
