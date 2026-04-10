import { api } from './baseApi';

const CACHE_NAME = 'tradeflow-images-v1';

// ---------------------------------------------------------------------------
// Layer 1 — In-memory Map (instant, per-session)
// Stores object URLs created from blobs. Fastest possible lookup.
// ---------------------------------------------------------------------------
const memoryCache = new Map<string, string>();

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
      // Keep in RTK Query cache indefinitely — S3 images are immutable
      keepUnusedDataFor: Infinity,
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
      ? 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradeflow-prod/v1'
      : 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradeflow-dev/v1');

  const state = queryApi.getState() as any;
  const token = state.auth?.token || localStorage.getItem('idToken');
  if (!token) throw new Error('No authentication token available');

  const cleanImageId = imageId.startsWith('images/')
    ? imageId.substring('images/'.length)
    : imageId;

  const response = await fetch(`${baseUrl}/images/${cleanImageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

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
  memoryCache.forEach((url) => URL.revokeObjectURL(url));
  memoryCache.clear();
  if (cacheApiAvailable) {
    try {
      await caches.delete(CACHE_NAME);
    } catch { /* non-critical */ }
  }
}
