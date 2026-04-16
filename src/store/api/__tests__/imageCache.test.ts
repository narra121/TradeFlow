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

// Mock Cache API (caches.open / cache.match / cache.put / cache.delete / caches.delete)
const mockCachePut = vi.fn();
const mockCacheMatch = vi.fn().mockResolvedValue(null);
const mockCacheDelete = vi.fn().mockResolvedValue(true);
const mockCachesDelete = vi.fn().mockResolvedValue(true);
const mockCachesOpen = vi.fn().mockResolvedValue({
  match: mockCacheMatch,
  put: mockCachePut,
  delete: mockCacheDelete,
});
vi.stubGlobal('caches', { open: mockCachesOpen, delete: mockCachesDelete });

// Stub Response constructor — jsdom Blob lacks .stream(), causing
// `new Response(blob, opts)` to throw "object.stream is not a function".
// We replace it with a lightweight stub that writeToCacheApi can construct.
class FakeResponse {
  body: any;
  headers: any;
  constructor(body: any, init?: any) {
    this.body = body;
    this.headers = init?.headers;
  }
}
vi.stubGlobal('Response', FakeResponse);

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

// ---------------------------------------------------------------------------
// Cache API persistence layer tests
// ---------------------------------------------------------------------------
describe('imageCache — Cache API (Layer 2) persistence', () => {
  it('returns blob from Cache API when memory cache misses', async () => {
    storage.set('idToken', 'valid-token');
    const cachedBlob = new Blob(['cached-image-data'], { type: 'image/png' });
    // Simulate a Cache API hit — cache.match returns a Response with a blob
    mockCacheMatch.mockResolvedValueOnce({
      blob: vi.fn().mockResolvedValue(cachedBlob),
    });

    const result = await getImageQueryFn('cached-image-key', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    // Cache API was consulted
    expect(mockCachesOpen).toHaveBeenCalledWith('tradequt-images-v1');
    expect(mockCacheMatch).toHaveBeenCalledWith('cached-image-key');
    // No network fetch was made
    expect(mockFetch).not.toHaveBeenCalled();
    // Object URL was created from the cached blob
    expect(mockCreateObjectURL).toHaveBeenCalledWith(cachedBlob);
  });

  it('skips Cache API hit when cached response has empty blob', async () => {
    storage.set('idToken', 'valid-token');
    const emptyBlob = new Blob([], { type: 'image/jpeg' });
    mockCacheMatch.mockResolvedValueOnce({
      blob: vi.fn().mockResolvedValue(emptyBlob),
    });
    // Should fall through to network fetch
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    const result = await getImageQueryFn('empty-cached-key', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    // Network fetch was made because cached blob was empty
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('stores fetched image in both memory cache and Cache API', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    await getImageQueryFn('new-image-key', fakeQueryApi);

    // writeToCacheApi opens the cache store for the write pass
    // caches.open is called once for readFromCacheApi and once for writeToCacheApi
    expect(mockCachesOpen).toHaveBeenCalledWith('tradequt-images-v1');
    expect(mockCachesOpen.mock.calls.length).toBeGreaterThanOrEqual(2);

    // cache.put is called with the imageId and a Response wrapping the blob
    expect(mockCachePut).toHaveBeenCalledTimes(1);
    expect(mockCachePut.mock.calls[0][0]).toBe('new-image-key');

    // Verify memory cache was populated (second call should not fetch)
    const result2 = await getImageQueryFn('new-image-key', fakeQueryApi);
    expect(result2.data).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1); // No additional network call
  });
});

// ---------------------------------------------------------------------------
// evictImage / clearImageCache tests
// ---------------------------------------------------------------------------
describe('imageCache — evictImage and clearImageCache', () => {
  let evictImage: (imageId: string) => Promise<void>;
  let clearImageCache: () => Promise<void>;

  beforeEach(async () => {
    // Re-import to get fresh exports after module reset
    const mod = await import('../imageCache');
    evictImage = mod.evictImage;
    clearImageCache = mod.clearImageCache;
  });

  it('evictImage removes from memory cache and Cache API', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    // Populate caches via a fetch
    await getImageQueryFn('evict-me', fakeQueryApi);
    expect(mockCreateObjectURL).toHaveBeenCalled();

    // Clear mock call counts so we can assert eviction-specific calls
    vi.clearAllMocks();

    await evictImage('evict-me');

    // Object URL was revoked
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url');
    // Cache API entry was deleted
    expect(mockCachesOpen).toHaveBeenCalledWith('tradequt-images-v1');
    expect(mockCacheDelete).toHaveBeenCalledWith('evict-me');

    // Next request should go to network again (not memory cache)
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));
    await getImageQueryFn('evict-me', fakeQueryApi);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('evictImage is a no-op for non-existent keys', async () => {
    await evictImage('never-cached');

    // Should not throw, and cache.delete is still called (Cache API side)
    expect(mockCachesOpen).toHaveBeenCalledWith('tradequt-images-v1');
    expect(mockCacheDelete).toHaveBeenCalledWith('never-cached');
    // No URL.revokeObjectURL since nothing was in memory
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
  });

  it('clearImageCache clears memory cache and deletes Cache API store', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    // Populate caches
    await getImageQueryFn('clear-me', fakeQueryApi);

    vi.clearAllMocks();

    await clearImageCache();

    // Object URLs were revoked (LRUCache.clear does this)
    expect(mockRevokeObjectURL).toHaveBeenCalled();
    // Entire Cache API store was deleted
    expect(mockCachesDelete).toHaveBeenCalledWith('tradequt-images-v1');

    // Subsequent request should go to network
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));
    await getImageQueryFn('clear-me', fakeQueryApi);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Graceful fallback when Cache API is unavailable
// ---------------------------------------------------------------------------
describe('imageCache — graceful fallback without Cache API', () => {
  let getImageQueryFnNoCacheApi: (imageId: string, queryApi: any) => Promise<{ data?: string; error?: any }>;
  let evictImageNoCacheApi: (imageId: string) => Promise<void>;
  let clearImageCacheNoCacheApi: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.clear();
    vi.resetModules();

    // Remove caches global before importing the module so cacheApiAvailable = false
    const savedCaches = globalThis.caches;
    // @ts-expect-error — intentionally removing for test
    delete globalThis.caches;

    const mod = await import('../imageCache');
    evictImageNoCacheApi = mod.evictImage;
    clearImageCacheNoCacheApi = mod.clearImageCache;

    const { api } = await import('../baseApi');
    const injectCall = (api.injectEndpoints as any).mock.calls[0][0];
    const endpoints = injectCall.endpoints({
      query: (opts: any) => opts,
    });
    getImageQueryFnNoCacheApi = endpoints.getImage.queryFn;

    // Restore caches global for other test suites
    globalThis.caches = savedCaches;
  });

  it('fetches from network and caches only in memory when Cache API is unavailable', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    const result = await getImageQueryFnNoCacheApi('no-cache-api-image', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Cache API was never consulted
    expect(mockCachesOpen).not.toHaveBeenCalled();
    expect(mockCachePut).not.toHaveBeenCalled();
  });

  it('evictImage works without Cache API (only memory eviction)', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    // Populate memory cache
    await getImageQueryFnNoCacheApi('evict-no-cacheapi', fakeQueryApi);
    vi.clearAllMocks();

    await evictImageNoCacheApi('evict-no-cacheapi');

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url');
    // Cache API was never touched
    expect(mockCachesOpen).not.toHaveBeenCalled();
    expect(mockCacheDelete).not.toHaveBeenCalled();
  });

  it('clearImageCache works without Cache API (only memory cleared)', async () => {
    storage.set('idToken', 'valid-token');
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    await getImageQueryFnNoCacheApi('clear-no-cacheapi', fakeQueryApi);
    vi.clearAllMocks();

    await clearImageCacheNoCacheApi();

    expect(mockRevokeObjectURL).toHaveBeenCalled();
    // Cache API was never touched
    expect(mockCachesDelete).not.toHaveBeenCalled();
  });
});
