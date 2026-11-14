import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredSession, decodeClaims, hasStoredSession, isOAuthSession, readStoredClaims, readStoredIdToken } from '../storedSession';

const CLIENT = 'client123';
const P = 'CognitoIdentityServiceProvider';
const b64url = (o: object) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (claims: object) => `${b64url({ alg: 'RS256' })}.${b64url(claims)}.sig`;

function store(clientId: string, user: string, tokens: Record<string, string>) {
  localStorage.setItem(`${P}.${clientId}.LastAuthUser`, user);
  Object.entries(tokens).forEach(([k, v]) => localStorage.setItem(`${P}.${clientId}.${user}.${k}`, v));
}

beforeEach(() => localStorage.clear());

describe('stored Amplify session', () => {
  it('is absent on an empty storage', () => {
    expect(hasStoredSession(localStorage, CLIENT)).toBe(false);
    expect(readStoredIdToken(localStorage, CLIENT)).toBeNull();
    expect(readStoredClaims(localStorage, CLIENT)).toBeNull();
  });

  it('is present when LastAuthUser points at stored tokens, and decodes non-ASCII claims', () => {
    store(CLIENT, 'user-uuid', { accessToken: 'a.b.c', idToken: jwt({ sub: 's1', email: 'e@x.io', name: 'Zoë Ünal' }), refreshToken: 'r' });
    expect(hasStoredSession(localStorage, CLIENT)).toBe(true);
    expect(readStoredClaims(localStorage, CLIENT)).toMatchObject({ sub: 's1', email: 'e@x.io', name: 'Zoë Ünal' });
  });

  it('ignores another client id when one is given', () => {
    store('other-client', 'u', { accessToken: 'a.b.c' });
    expect(hasStoredSession(localStorage, CLIENT)).toBe(false);
  });

  it('finds any pool session when no client id is given', () => {
    store('other-client', 'u', { accessToken: 'a.b.c', idToken: jwt({ sub: 'x' }) });
    expect(hasStoredSession(localStorage, '')).toBe(true);
    expect(readStoredClaims(localStorage, '')?.sub).toBe('x');
  });

  it('needs the access token, and handles a username that contains dots', () => {
    localStorage.setItem(`${P}.${CLIENT}.LastAuthUser`, 'u');
    expect(hasStoredSession(localStorage, CLIENT)).toBe(false);
    store(CLIENT, 'first.last@x.io', { accessToken: 'a.b.c' });
    expect(hasStoredSession(localStorage, CLIENT)).toBe(true);
  });

  it('counts an expired token as a session (Amplify renews it on first use)', () => {
    store(CLIENT, 'u', { accessToken: 'a.b.c', idToken: jwt({ sub: 's', exp: 1 }) });
    expect(hasStoredSession(localStorage, CLIENT)).toBe(true);
    expect(readStoredClaims(localStorage, CLIENT)?.exp).toBe(1);
  });

  it('is signed out again once Amplify clears LastAuthUser and the tokens', () => {
    store(CLIENT, 'u', { accessToken: 'a.b.c', idToken: jwt({ sub: 's' }) });
    localStorage.clear();
    expect(hasStoredSession(localStorage, CLIENT)).toBe(false);
  });

  it('returns null claims for a malformed ID token', () => {
    store(CLIENT, 'u', { accessToken: 'a.b.c', idToken: 'not-a-jwt' });
    expect(readStoredClaims(localStorage, CLIENT)).toBeNull();
  });
});

describe('clearStoredSession', () => {
  it("removes every key of the app client (tokens, user, Google flags) and nothing else", () => {
    store(CLIENT, 'u', { accessToken: 'a.b.c', idToken: jwt({ sub: 's' }), refreshToken: 'r', oauthMetadata: '{}' });
    ['oauthSignIn', 'inflightOAuth', 'oauthPKCE', 'oauthState'].forEach((k) => localStorage.setItem(`${P}.${CLIENT}.${k}`, 'x'));
    store('other-client', 'v', { accessToken: 'z.z.z' });
    localStorage.setItem('ui.timeZone', 'Asia/Kolkata');
    clearStoredSession(localStorage, CLIENT);
    expect(Object.keys(localStorage).sort()).toEqual([`${P}.other-client.LastAuthUser`, `${P}.other-client.v.accessToken`, 'ui.timeZone'].sort());
    expect(hasStoredSession(localStorage, CLIENT)).toBe(false);
  });

  it('removes every pool when no client id is given', () => {
    store('a', 'u', { accessToken: 'a.b.c' });
    store('b', 'v', { accessToken: 'a.b.c' });
    clearStoredSession(localStorage, '');
    expect(localStorage).toHaveLength(0);
  });
});

describe('isOAuthSession', () => {
  it("reads Amplify's Google sign-in flag", () => {
    expect(isOAuthSession(localStorage, CLIENT)).toBe(false);
    localStorage.setItem(`${P}.${CLIENT}.oauthSignIn`, 'true,false');
    expect(isOAuthSession(localStorage, CLIENT)).toBe(true);
    expect(isOAuthSession(localStorage, 'other-client')).toBe(false);
    expect(isOAuthSession(localStorage, '')).toBe(true);
    localStorage.setItem(`${P}.${CLIENT}.oauthSignIn`, 'false,false');
    expect(isOAuthSession(localStorage, CLIENT)).toBe(false);
  });
});

describe('decodeClaims', () => {
  it('decodes non-ASCII names and base64url characters', () => {
    expect(decodeClaims(jwt({ sub: 'u1', name: 'Zoë Müller' }))?.name).toBe('Zoë Müller');
    const payload = { sub: 'u2', note: '>>>???~~~' };
    expect(decodeClaims(jwt(payload))).toEqual(payload);
  });

  it('returns null for absent or malformed input', () => {
    expect(decodeClaims(null)).toBeNull();
    expect(decodeClaims(undefined)).toBeNull();
    expect(decodeClaims('nope')).toBeNull();
    expect(decodeClaims('a.!!!.c')).toBeNull();
  });
});
