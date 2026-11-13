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
  body: unknown;
  headers: HeadersInit | undefined;
  constructor(body: unknown, init?: ResponseInit) {
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

// The ID token comes from the auth service: `current` is the stored one, `renewed` what a forced refresh returns (null = refused)
const auth = vi.hoisted(() => ({ current: null as string | null, renewed: null as string | null, getIdToken: vi.fn() }));
vi.mock('@/lib/auth/authService', () => ({ getIdToken: (opts?: { forceRefresh?: boolean }) => auth.getIdToken(opts) }));

// Mock fetch — returns objects with .ok, .status, .blob(), .json()
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock import.meta.env
vi.stubEnv('VITE_API_URL', 'https://api.test.com/v1');

// The endpoint builder is faked as `query: opts => opts`, so each injected endpoint is just its definition object
type EndpointBuilder = { query: (opts: unknown) => unknown };
type InjectConfig = { endpoints: (build: EndpointBuilder) => unknown };
type QueryApi = { getState: () => unknown; dispatch: unknown };
type GetImageEndpoint = {
  queryFn: (imageId: string, queryApi: QueryApi) => Promise<{ data?: string; error?: { status?: number | string; error?: string; data?: unknown } }>;
  onCacheEntryAdded: (imageId: string, lifecycle: { cacheDataLoaded: Promise<{ data: string }>; cacheEntryRemoved: Promise<void> }) => Promise<void>;
};

function injectedGetImage(injectEndpoints: unknown): GetImageEndpoint {
  const [config] = (injectEndpoints as { mock: { calls: [InjectConfig][] } }).mock.calls[0];
  return (config.endpoints({ query: (opts) => opts }) as { getImage: GetImageEndpoint }).getImage;
}

// We need to mock the RTK base api so imageCache.ts can inject endpoints
vi.mock('../baseApi', () => ({
  api: {
    injectEndpoints: vi.fn((config: InjectConfig) => {
      const endpoints = config.endpoints({
        query: (opts) => opts,
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

// ---------------------------------------------------------------------------
// Extract the queryFn from imageCache's endpoint injection
// ---------------------------------------------------------------------------
let getImageQueryFn: GetImageEndpoint['queryFn'];
let getImageCacheEntry: GetImageEndpoint['onCacheEntryAdded'];

beforeEach(async () => {
  vi.clearAllMocks();
  storage.clear();
  auth.current = null;
  auth.renewed = null;
  auth.getIdToken.mockImplementation(async (opts?: { forceRefresh?: boolean }) => (opts?.forceRefresh ? auth.renewed : auth.current));
  mockCacheMatch.mockResolvedValue(null);

  vi.resetModules();

  await import('../imageCache');
  const { api } = await import('../baseApi');
  const getImage = injectedGetImage(api.injectEndpoints);
  getImageQueryFn = getImage.queryFn;
  getImageCacheEntry = getImage.onCacheEntryAdded;
});

const fakeQueryApi = {
  getState: () => ({ auth: { token: null } }),
  dispatch: vi.fn(),
};

describe('imageCache — fetchImage with token refresh', () => {
  it('fetches image successfully with valid token', async () => {
    auth.current = 'valid-token';
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
    auth.current = 'valid-token';
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    await getImageQueryFn('images/account1/trade1/img.jpg', fakeQueryApi);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/images/account1/trade1/img.jpg',
      expect.any(Object),
    );
  });

  it('renews the ID token and retries on 401', async () => {
    auth.current = 'expired-token';
    auth.renewed = 'new-fresh-token';

    // 1st: image request -> 401, 2nd: retry with the renewed token -> success
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer expired-token');
    expect(auth.getIdToken).toHaveBeenCalledWith({ forceRefresh: true });
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.test.com/v1/images/account1/trade1/img.jpg');
    expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe('Bearer new-fresh-token');
  });

  it('returns error when the renewal is refused (no session left)', async () => {
    auth.current = 'expired-token';
    auth.renewed = null;
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Unauthorized');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns error when the renewal itself fails', async () => {
    auth.current = 'expired-token';
    auth.getIdToken.mockImplementation(async (opts?: { forceRefresh?: boolean }) => {
      if (opts?.forceRefresh) throw new Error('network');
      return auth.current;
    });
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Unauthorized');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns error when the retry after renewal still returns 401', async () => {
    auth.current = 'expired-token';
    auth.renewed = 'new-token';
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));
    mockFetch.mockResolvedValueOnce(mockImageResponse(401));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Unauthorized');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('a 401 that the renewal does not cure sends the app to login, like baseApi; a cured one does not', async () => {
    const heard = vi.fn();
    window.addEventListener('unauthorized', heard);
    try {
      auth.current = 'expired-token';
      auth.renewed = 'new-token';
      mockFetch.mockResolvedValueOnce(mockImageResponse(401));
      mockFetch.mockResolvedValueOnce(mockImageResponse(200));
      await getImageQueryFn('cured.jpg', fakeQueryApi);
      expect(heard).not.toHaveBeenCalled();

      mockFetch.mockResolvedValueOnce(mockImageResponse(401));
      mockFetch.mockResolvedValueOnce(mockImageResponse(401));
      await getImageQueryFn('refused.jpg', fakeQueryApi);
      expect(heard).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('unauthorized', heard);
    }
  });

  it('returns error when there is no session', async () => {
    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('No authentication token');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles 404 without attempting refresh', async () => {
    auth.current = 'valid-token';
    mockFetch.mockResolvedValueOnce(mockImageResponse(404));

    const result = await getImageQueryFn('account1/trade1/missing.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Image not found');
    // No refresh attempt for 404
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('reads the API message of a failed image request, and a gateway page falls back to the status message', async () => {
    auth.current = 'valid-token';
    mockFetch.mockResolvedValueOnce({ ...mockImageResponse(400), text: vi.fn().mockResolvedValue(JSON.stringify({ success: false, message: 'Invalid image ID format.', errorCode: 'VALIDATION_ERROR' })) });
    const apiError = await getImageQueryFn('account1/trade1/bad.jpg', fakeQueryApi);
    expect(apiError.error.error).toBe('Invalid image ID format.');
    expect(apiError.error.data).toBe('Invalid image ID format.');
    expect(apiError.error.status).toBe('CUSTOM_ERROR');

    mockFetch.mockResolvedValueOnce({ ...mockImageResponse(502), text: vi.fn().mockResolvedValue('<html>Bad Gateway</html>') });
    const gateway = await getImageQueryFn('account1/trade1/other.jpg', fakeQueryApi);
    expect(gateway.error.error).toMatch(/temporarily unavailable/);
  });

  it('reports a fetch that never got a response as a connection failure', async () => {
    auth.current = 'valid-token';
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const result = await getImageQueryFn('account1/trade1/offline.jpg', fakeQueryApi);
    expect(result.error.status).toBe('FETCH_ERROR');
    expect(result.error.error).toMatch(/internet connection/i);
  });

  it('handles network error during fetch', async () => {
    auth.current = 'valid-token';
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await getImageQueryFn('account1/trade1/img.jpg', fakeQueryApi);

    expect(result.error).toBeDefined();
    expect(result.error.error).toContain('Network failure');
  });

  it('uses memory cache on second call (no extra network request)', async () => {
    auth.current = 'valid-token';
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
});

// ---------------------------------------------------------------------------
// Cache API persistence layer tests
// ---------------------------------------------------------------------------
describe('imageCache — Cache API (Layer 2) persistence', () => {
  it('returns blob from Cache API when memory cache misses', async () => {
    auth.current = 'valid-token';
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
    auth.current = 'valid-token';
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
    auth.current = 'valid-token';
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
// Object URL lifetime (FE-031): RTK keeps serving a cached URL for an hour
// ---------------------------------------------------------------------------
describe('imageCache — object URLs live as long as the RTK cache entry', () => {
  const defaultUrl = () => 'blob:http://localhost/mock-url';

  it('the 200-entry memory cache evicts without revoking a URL RTK may still serve', async () => {
    auth.current = 'valid-token';
    let n = 0;
    mockCreateObjectURL.mockImplementation(() => `blob:http://localhost/img-${n++}`);
    try {
      for (let i = 0; i < 201; i++) {
        mockFetch.mockResolvedValueOnce(mockImageResponse(200));
        await getImageQueryFn(`img-${i}`, fakeQueryApi);
      }
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();
    } finally {
      mockCreateObjectURL.mockImplementation(defaultUrl);
    }
  });

  it('revokes the URL when RTK drops the cache entry', async () => {
    let remove: () => void = () => undefined;
    const removed = new Promise<void>((res) => (remove = res));
    const done = getImageCacheEntry('img', { cacheDataLoaded: Promise.resolve({ data: 'blob:http://localhost/img-x' }), cacheEntryRemoved: removed });
    await Promise.resolve();
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
    remove();
    await done;
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/img-x');
  });

  it('a failed request leaves nothing to revoke', async () => {
    await getImageCacheEntry('img', { cacheDataLoaded: Promise.reject(new Error('failed')), cacheEntryRemoved: Promise.resolve() });
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
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
    auth.current = 'valid-token';
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
    auth.current = 'valid-token';
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
    auth.current = 'valid-token';
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
    auth.current = 'valid-token';
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));
    await getImageQueryFn('clear-me', fakeQueryApi);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Graceful fallback when Cache API is unavailable
// ---------------------------------------------------------------------------
describe('imageCache — graceful fallback without Cache API', () => {
  let getImageQueryFnNoCacheApi: GetImageEndpoint['queryFn'];
  let evictImageNoCacheApi: (imageId: string) => Promise<void>;
  let clearImageCacheNoCacheApi: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.clear();
    vi.resetModules();

    // Remove caches global before importing the module so cacheApiAvailable = false
    const savedCaches = globalThis.caches;
    delete (globalThis as { caches?: CacheStorage }).caches;

    const mod = await import('../imageCache');
    evictImageNoCacheApi = mod.evictImage;
    clearImageCacheNoCacheApi = mod.clearImageCache;

    const { api } = await import('../baseApi');
    getImageQueryFnNoCacheApi = injectedGetImage(api.injectEndpoints).queryFn;

    // Restore caches global for other test suites
    globalThis.caches = savedCaches;
  });

  it('fetches from network and caches only in memory when Cache API is unavailable', async () => {
    auth.current = 'valid-token';
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    const result = await getImageQueryFnNoCacheApi('no-cache-api-image', fakeQueryApi);

    expect(result.data).toBe('blob:http://localhost/mock-url');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Cache API was never consulted
    expect(mockCachesOpen).not.toHaveBeenCalled();
    expect(mockCachePut).not.toHaveBeenCalled();
  });

  it('evictImage works without Cache API (only memory eviction)', async () => {
    auth.current = 'valid-token';
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
    auth.current = 'valid-token';
    mockFetch.mockResolvedValueOnce(mockImageResponse(200));

    await getImageQueryFnNoCacheApi('clear-no-cacheapi', fakeQueryApi);
    vi.clearAllMocks();

    await clearImageCacheNoCacheApi();

    expect(mockRevokeObjectURL).toHaveBeenCalled();
    // Cache API was never touched
    expect(mockCachesDelete).not.toHaveBeenCalled();
  });
});
