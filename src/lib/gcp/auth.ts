/**
 * GCP auth module — exchanges Cognito JWT for Google federated access token
 * via Security Token Service (STS) using Workload Identity Federation.
 *
 * Token is cached in memory (NOT localStorage) with proactive refresh
 * 5 minutes before expiry. Uses singleton promise deduplication so
 * concurrent callers share a single in-flight STS request.
 */

const GCP_PROJECT_NUMBER = import.meta.env.VITE_GCP_PROJECT_NUMBER;
const GCP_WIF_POOL_ID = import.meta.env.VITE_GCP_WIF_POOL_ID;
const GCP_WIF_PROVIDER_ID = import.meta.env.VITE_GCP_WIF_PROVIDER_ID;

const STS_URL = 'https://sts.googleapis.com/v1/token';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

// In-memory cache (never stored in localStorage)
let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

// Singleton promise deduplication
let exchangePromise: Promise<string> | null = null;

/**
 * Get a Google access token by exchanging the Cognito ID token via STS.
 * Concurrent callers share the same in-flight promise so only one HTTP
 * request is made regardless of how many callers invoke this at once.
 *
 * @returns A valid Google access token.
 * @throws If no Cognito token exists or the STS exchange fails.
 */
export async function getGoogleAccessToken(): Promise<string> {
  // Return cached token if still valid (with buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - REFRESH_BUFFER_MS) {
    return cachedToken;
  }

  // Deduplicate concurrent calls
  if (exchangePromise) return exchangePromise;

  exchangePromise = doExchange().finally(() => {
    exchangePromise = null;
  });

  return exchangePromise;
}

/**
 * Clear the cached Google token. Call on logout or when the Cognito
 * session is invalidated.
 */
export function clearGoogleToken(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
  exchangePromise = null;
}

async function doExchange(): Promise<string> {
  const cognitoIdToken = localStorage.getItem('idToken');
  if (!cognitoIdToken) {
    throw new Error('No Cognito ID token available');
  }

  const audience = `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WIF_POOL_ID}/providers/${GCP_WIF_PROVIDER_ID}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: cognitoIdToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    audience,
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  });

  const res = await fetch(STS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`STS token exchange failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const accessToken: string | undefined = json.access_token;
  const expiresIn: number | undefined = json.expires_in;

  if (!accessToken) {
    throw new Error('No access_token in STS response');
  }

  // Cache in memory with expiry tracking
  cachedToken = accessToken;
  tokenExpiresAt = Date.now() + (expiresIn ?? 3600) * 1000;

  return accessToken;
}
