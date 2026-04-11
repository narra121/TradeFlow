import { api } from './baseApi';

const CACHE_NAME = 'tradequt-images-v1';

// ---------------------------------------------------------------------------
// LRU Cache — bounded in-memory cache with automatic eviction
// Uses Map insertion-order semantics: delete + re-insert moves to "newest".
// On eviction the blob object URL is revoked to free browser memory.
// ---------------------------------------------------------------------------
class LRUCache {
  private cache: Map<string, string>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    // Move to most-recently-used (end of Map iteration order)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: string): void {
    // If key already exists, remove it first so re-insert moves it to the end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict the least-recently-used entry (first in iteration order)
      const firstEntry = this.cache.entries().next();
      if (!firstEntry.done) {
        const [evictedKey, evictedUrl] = firstEntry.value;
        URL.revokeObjectURL(evictedUrl);
        this.cache.delete(evictedKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.forEach((url) => URL.revokeObjectURL(url));
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

const MAX_MEMORY_CACHE_SIZE = 200;

// ---------------------------------------------------------------------------
// Layer 1 — In-memory LRU cache (instant, per-session)
// Stores object URLs created from blobs. Fastest possible lookup.
// Bounded to MAX_MEMORY_CACHE_SIZE entries; evicts LRU and revokes blob URLs.
// ---------------------------------------------------------------------------
const memoryCache = new LRUCache(MAX_MEMORY_CACHE_SIZE);

// ---------------------------------------------------------------------------
// Layer 2 — Browser Cache API (persistent across sessions)
// Stores raw Response objects keyed by imageId. Survives tab/browser close.
// Falls back gracefully when Cache API is unavailable (e.g. opaque origins).
// ---------------------------------------------------------------------------
const cacheApiAvailable = typeof caches !== 'undefined';

async function readFromCacheApi(imageId: string): Promise<string | null> {
  if (!cacheApiAvailable) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(imageId);
    if (!cached) return null;
    const blob = await cached.blob();
    if (blob.size === 0) return null;
    const objectUrl = URL.createObjectURL(blob);
    memoryCache.set(imageId, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}

async function writeToCacheApi(imageId: string, blob: Blob): Promise<void> {
  if (!cacheApiAvailable) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const headers = new Headers({ 'Content-Type': blob.type || 'image/jpeg' });
    await cache.put(imageId, new Response(blob, { headers }));
  } catch {
    // Quota exceeded or storage access denied — non-critical, skip silently
  }
}

// ---------------------------------------------------------------------------
// Dedup concurrent fetches for the same imageId
// Without this, multiple components requesting the same image simultaneously
// would each trigger a separate network call before any cache is populated.
// ---------------------------------------------------------------------------
const inflightRequests = new Map<string, Promise<string>>();

// ---------------------------------------------------------------------------
// RTK Query endpoint
// ---------------------------------------------------------------------------
export const imageApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getImage: builder.query<string, string>({
      queryFn: async (imageId, queryApi) => {
        try {
          // L1: in-memory
          const mem = memoryCache.get(imageId);
          if (mem) return { data: mem };

          // L2: Cache API (persistent)
          const persisted = await readFromCacheApi(imageId);
          if (persisted) return { data: persisted };

          // Dedup: if a fetch for this imageId is already in-flight, wait for it
          const inflight = inflightRequests.get(imageId);
          if (inflight) {
            const url = await inflight;
            return { data: url };
          }

          // L3: Network fetch
          const fetchPromise = fetchImage(imageId, queryApi);
          inflightRequests.set(imageId, fetchPromise);

          try {
            const objectUrl = await fetchPromise;
            return { data: objectUrl };
          } finally {
            inflightRequests.delete(imageId);
          }
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error instanceof Error ? error.message : 'Failed to fetch image',
            },
          };
        }
      },
      // Keep unsubscribed entries for 1 hour; the Browser Cache API still
      // provides persistence across sessions for longer-term caching.
      keepUnusedDataFor: 3600,
    }),
  }),
});

// ---------------------------------------------------------------------------
// Network fetch + cache population
// ---------------------------------------------------------------------------
async function fetchImage(imageId: string, queryApi: any): Promise<string> {
  const baseUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === 'production'
      ? 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradequt-prod/v1'
      : 'https://wastpecoi2.execute-api.us-east-1.amazonaws.com/tradequt-dev/v1');

  const cleanImageId = imageId.startsWith('images/')
    ? imageId.substring('images/'.length)
    : imageId;

  const url = `${baseUrl}/images/${cleanImageId}`;

  // Try fetching with current token, refresh and retry once on 401
  let token = localStorage.getItem('idToken');
  if (!token) throw new Error('No authentication token available');

  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    // Token expired — attempt refresh and retry
    const newToken = await refreshTokenAndGet();
    if (newToken) {
      token = newToken;
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  if (!response.ok) {
    if (response.status === 404) throw new Error('Image not found');
    if (response.status === 401) throw new Error('Unauthorized - please log in again');
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();

  // Populate both caches
  const objectUrl = URL.createObjectURL(blob);
  memoryCache.set(imageId, objectUrl);
  await writeToCacheApi(imageId, blob);

  return objectUrl;
}

/**
 * Refresh the auth token and return the new token, or null on failure.
 * Reuses the same /auth/refresh endpoint that baseQueryWithReauth uses.
 */
async function refreshTokenAndGet(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const baseUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === 'production'
      ? 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradequt-prod/v1'
      : 'https://wastpecoi2.execute-api.us-east-1.amazonaws.com/tradequt-dev/v1');

  try {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const newToken: string | undefined = json?.data?.IdToken ?? json?.data?.token ?? json?.IdToken;
    if (!newToken) return null;

    localStorage.setItem('idToken', newToken);
    return newToken;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export const { useGetImageQuery } = imageApi;

/**
 * Evict a single image from all cache layers (e.g. after deletion).
 */
export async function evictImage(imageId: string): Promise<void> {
  const objectUrl = memoryCache.get(imageId);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    memoryCache.delete(imageId);
  }
  if (cacheApiAvailable) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(imageId);
    } catch { /* non-critical */ }
  }
}

/**
 * Clear the entire image cache (e.g. on logout).
 */
export async function clearImageCache(): Promise<void> {
  // LRUCache.clear() revokes all object URLs internally
  memoryCache.clear();
  if (cacheApiAvailable) {
    try {
      await caches.delete(CACHE_NAME);
    } catch { /* non-critical */ }
  }
}
