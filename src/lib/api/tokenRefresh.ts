/**
 * Shared token refresh module with singleton promise deduplication.
 *
 * All layers (RTK Query baseQueryWithReauth, Axios interceptor, image cache)
 * delegate to this single function so concurrent 401 handlers never fire
 * independent refresh requests.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradequt-prod/v1'
    : 'https://wastpecoi2.execute-api.us-east-1.amazonaws.com/tradequt-dev/v1');

let refreshPromise: Promise<string> | null = null;

/**
 * Refresh the auth token. Concurrent callers share the same in-flight promise
 * so only one HTTP request is made regardless of how many 401s arrive at once.
 *
 * @returns The new ID token (already persisted to localStorage).
 * @throws If no refresh token exists or the refresh endpoint fails.
 */
export async function refreshToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<string> {
  const rt = localStorage.getItem('refreshToken');
  if (!rt) throw new Error('No refresh token');

  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) throw new Error('Refresh failed');

      const json = await res.json();
      const data = json?.data ?? json;
      const newToken: string | undefined = data?.IdToken ?? data?.token;

      if (!newToken) throw new Error('No token in response');

      localStorage.setItem('idToken', newToken);
      return newToken;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTransient = lastError instanceof TypeError || lastError.message === 'Refresh failed';
      if (!isTransient) throw lastError;
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new Error('Refresh failed after retries');
}
