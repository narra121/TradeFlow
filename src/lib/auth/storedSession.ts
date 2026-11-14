import { COGNITO_CLIENT_ID } from './authEnv';

/**
 * Synchronous, library-free reads of the session Amplify Auth keeps in localStorage, for the code that must decide
 * before Amplify is loaded (entry choice, route guard, first-paint class). Key layout (aws-amplify 6, DefaultTokenStore):
 *   CognitoIdentityServiceProvider.<clientId>.LastAuthUser              the signed-in username
 *   CognitoIdentityServiceProvider.<clientId>.<username>.accessToken | idToken | refreshToken
 * The inline script in index.html repeats the key shape; keep the two in step.
 */
const PREFIX = 'CognitoIdentityServiceProvider';

export interface StoredClaims {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  identities?: { providerName?: string; dateCreated?: string | number }[];
  'cognito:username'?: string;
  [claim: string]: unknown;
}

function lastAuthUserKeys(storage: Storage, clientId: string): string[] {
  if (clientId) return [`${PREFIX}.${clientId}.LastAuthUser`];
  const found: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(`${PREFIX}.`) && key.endsWith('.LastAuthUser')) found.push(key);
  }
  return found;
}

function readToken(storage: Storage, clientId: string, kind: 'idToken' | 'accessToken'): string | null {
  try {
    for (const key of lastAuthUserKeys(storage, clientId)) {
      const user = storage.getItem(key);
      const token = user && storage.getItem(`${key.slice(0, -'LastAuthUser'.length)}${user}.${kind}`);
      if (token) return token;
    }
  } catch {
    // storage blocked: same as signed out
  }
  return null;
}

/** True when Amplify's own record says this browser signed in through the Google redirect, which makes its `signOut()` end with a navigation to Cognito's /logout. */
export function isOAuthSession(storage: Storage = localStorage, clientId: string = COGNITO_CLIENT_ID): boolean {
  try {
    const key = clientId ? `${PREFIX}.${clientId}.oauthSignIn` : Object.keys(storage).find((k) => /^CognitoIdentityServiceProvider\.[^.]+\.oauthSignIn$/.test(k));
    return !!key && !!storage.getItem(key)?.startsWith('true');
  } catch {
    return false;
  }
}

/** Removes every key Amplify keeps for the app client: the tokens, the signed-in user and the Google sign-in flags. Without a `clientId` every pool's keys go. */
export function clearStoredSession(storage: Storage = localStorage, clientId: string = COGNITO_CLIENT_ID): void {
  try {
    const prefix = clientId ? `${PREFIX}.${clientId}.` : `${PREFIX}.`;
    Object.keys(storage).filter((key) => key.startsWith(prefix)).forEach((key) => storage.removeItem(key));
  } catch {
    // storage blocked: nothing was stored
  }
}

/** True when Amplify has a session stored; it may be expired, since Amplify renews it on first use. Without a `clientId` any pool's session counts. */
export function hasStoredSession(storage: Storage = localStorage, clientId: string = COGNITO_CLIENT_ID): boolean {
  return readToken(storage, clientId, 'accessToken') !== null;
}

/** The stored ID token as it is, expired or not; null when signed out. Prefer `getIdToken()` (authService) for requests. */
export function readStoredIdToken(storage: Storage = localStorage, clientId: string = COGNITO_CLIENT_ID): string | null {
  return readToken(storage, clientId, 'idToken');
}

/** The payload of a JWT, decoded as UTF-8 (`atob` alone breaks on non-ASCII names); null when absent or malformed. */
export function decodeClaims(token: string | null | undefined): StoredClaims | null {
  const part = token?.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as StoredClaims;
  } catch {
    return null;
  }
}

/** Claims of the stored ID token (`sub`, `email`, `name`, `identities`, `exp`); null when signed out or malformed. */
export function readStoredClaims(storage: Storage = localStorage, clientId: string = COGNITO_CLIENT_ID): StoredClaims | null {
  return decodeClaims(readStoredIdToken(storage, clientId));
}
