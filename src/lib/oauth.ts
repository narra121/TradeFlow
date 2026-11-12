const KEY = 'tq.oauth';

function base64url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export interface OAuthStart {
  state: string;
  codeChallenge: string;
}

/** Only an in-app path may be remembered as the post-login destination (no scheme, no `//host`). */
export function safeDestination(path: string | null | undefined): string | null {
  return typeof path === 'string' && /^\/app(?:[/?#]|$)/.test(path) ? path : null;
}

/** Creates `state` and a PKCE verifier (kept in sessionStorage with the page the user was heading for); returns what goes into the authorize URL. */
export async function startOAuth(from?: string | null): Promise<OAuthStart> {
  const state = randomString();
  const verifier = randomString(48);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  sessionStorage.setItem(KEY, JSON.stringify({ state, verifier, from: safeDestination(from) }));
  return { state, codeChallenge: base64url(new Uint8Array(digest)) };
}

export interface OAuthResult {
  verifier: string;
  /** The in-app destination stored when Google sign-in started; null when there was none. */
  from: string | null;
}

/** Checks the returned `state` against the stored one; null when it does not match. One use only. */
export function finishOAuth(returnedState: string | null): OAuthResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw || !returnedState) return null;
    const saved = JSON.parse(raw) as { state?: string; verifier?: string; from?: string | null };
    return saved.state === returnedState && saved.verifier ? { verifier: saved.verifier, from: safeDestination(saved.from) } : null;
  } catch {
    return null;
  }
}

/** The stored destination, consumed, for a callback that ends in an error and so never reaches `finishOAuth`'s check. */
export function takeOAuthDestination(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? safeDestination((JSON.parse(raw) as { from?: string | null }).from) : null;
  } catch {
    return null;
  }
}
