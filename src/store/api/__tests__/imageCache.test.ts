import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// imageCache.ts uses module-level globals (LRU cache, caches API, etc.)
// We mock everything the module touches so we can test the fetch + retry flow.
// ---------------------------------------------------------------------------

// Mock URL.createObjectURL / revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/mock-url');
const mockRevokeObjectURL = vi.fn();
globalThis.URL.createObjectURL = mockCreateObjectURL;
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock Cache API (caches.open / cache.match / cache.put)
const mockCachePut = vi.fn();
const mockCacheMatch = vi.fn().mockResolvedValue(null);
const mockCachesOpen = vi.fn().mockResolvedValue({
  match: mockCacheMatch,
  put: mockCachePut,
  delete: vi.fn(),
});
vi.stubGlobal('caches', { open: mockCachesOpen, delete: vi.fn() });

// Mock localStorage
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

// Mock fetch — returns objects with .ok, .status, .blob(), .json()
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock import.meta.env
vi.stubEnv('VITE_API_URL', 'https://api.test.com/v1');

// We need to mock the RTK base api so imageCache.ts can inject endpoints
vi.mock('../baseApi', () => ({
  api: {
    injectEndpoints: vi.fn((config: any) => {
      const endpoints = config.endpoints({
        query: (opts: any) => opts,
      });
      return { endpoints, ...config };
    }),
    util: { invalidateTags: vi.fn() },
  },
}));

// Helper: create a mock fetch response for images
function mockImageResponse(status = 200) {
  const fakeBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    blob: vi.fn().mockResolvedValue(fakeBlob),
    json: vi.fn().mockRejectedValue(new Error('not json')),
  };
}

// Helper: create a mock fetch response for JSON endpoints
function mockJsonResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    blob: vi.fn().mockRejectedValue(new Error('not a blob')),
    json: vi.fn().mockResolvedValue(body),
  };
}

// ---------------------------------------------------------------------------
// Extract the queryFn from imageCache's endpoint injection
// ---------------------------------------------------------------------------
let getImageQueryFn: (imageId: string, queryApi: any) => Promise<{ data?: string; error?: any }>;

beforeEach(async () => {
  vi.clearAllMocks();
  storage.clear();
  mockCacheMatch.mockResolvedValue(null);

  vi.resetModules();

  await import('../imageCache');
  const { api } = await import('../baseApi');
  const injectCall = (api.injectEndpoints as any).mock.calls[0][0];
  const endpoints = injectCall.endpoints({
    query: (opts: any) => opts,
  });
  getImageQueryFn = endpoints.getImage.queryFn;
});

const fakeQueryApi = {
  getState: () => ({ auth: { token: null } }),
  dispatch: vi.fn(),
};

describe('imageCache — fetchImage with token refresh', () => {
  it('fetches image successfully with valid token', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/images/account1/trade1/img.jpg',
      { headers: { Authorization: 'Bearer valid-token' } },
    );
  });

  it('strips images/ prefix from imageId', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    await getImageQueryFn('images/account1/trade1/img.jpg', fakeQueryApi);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/images/account1/trade1/img.jpg',
      expect.any(Object),
    );
  });

  it('refreshes token and retries on 401', async () => {
    storage.set('idToken', 'expired-token');
    storage.set('refreshToken', 'my-refresh-token');

    // 1st: image request → 401
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));
    // 2nd: refresh endpoint → new token
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: { IdToken: 'new-fresh-token' } }, 200),
    );
    // 3rd: retry image → success
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // 1st call: original image request with expired token
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.com/v1/images/account1/trade1/img.jpg');
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer expired-token');

    // 2nd call: refresh token
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.test.com/v1/auth/refresh');
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({ refreshToken: 'my-refresh-token' });

    // 3rd call: retry image with new token
    expect(mockFetch.mock.calls[2][0]).toBe('https://api.test.com/v1/images/account1/trade1/img.jpg');
    expect(mockFetch.mock.calls[2][1].headers.Authorization).toBe('Bearer new-fresh-token');

    // Token saved to localStorage
    expect(storage.get('idToken')).toBe('new-fresh-token');
  });

  it('returns error when 401 and no refresh token available', async () => {
    storage.set('idToken', 'expired-token');
    // No refreshToken in storage

    mockFetch.mockResolvedValueOnce(mockImageResponse(401));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Unauthorized');
    // No refresh attempt — only the original request
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns error when refresh endpoint fails', async () => {
    storage.set('idToken', 'expired-token');
    storage.set('refreshToken', 'bad-refresh-token');

    // 401 on image
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));
    // Refresh returns 401
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 401));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Unauthorized');
    // Image + refresh, no retry
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns error when retry after refresh still returns 401', async () => {
    storage.set('idToken', 'expired-token');
    storage.set('refreshToken', 'my-refresh-token');

    // 401 on image
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));
    // Refresh succeeds
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: { IdToken: 'new-token' } }, 200),
    );
    // Retry still 401
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Unauthorized');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns error when no idToken is available', async () => {
    // No tokens at all
    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('No authentication token');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles 404 without attempting refresh', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(404));

    const result = await getImageQueryFn('account1/trade1/missing.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Image not found');
    // No refresh attempt for 404
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles network error during fetch', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Network failure');
  });

  it('uses memory cache on second call (no extra network request)', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    // First call — fetches from network
    const result1 = await getImageQueryFn('same-image-key', fakeQueryApi);
    expect(result1.data).toBe('blob:http://localhost/mock-url');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call — hits memory cache
    const result2 = await getImageQueryFn('same-image-key', fakeQueryApi);
    expect(result2.data).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
  });

  it('handles refresh endpoint returning token in alternate field', async () => {
    storage.set('idToken', 'expired-token');
    storage.set('refreshToken', 'my-refresh-token');

    mockFetch.mockResolvedValueOnce(mockImageResponse(401));
    // Some backends return { data: { token: '...' } } instead of { data: { IdToken: '...' } }
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: { token: 'alt-field-token' } }, 200),
    );
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    expect(storage.get('idToken')).toBe('alt-field-token');
  });
});
