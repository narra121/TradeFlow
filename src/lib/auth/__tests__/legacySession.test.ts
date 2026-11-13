import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ['VITE_COGNITO_USER_POOL_ID', 'VITE_COGNITO_CLIENT_ID']) vi.stubEnv(k, env[k] ?? '');
  return import('../legacySession');
}

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const ENV = { VITE_COGNITO_USER_POOL_ID: 'us-east-1_Pool', VITE_COGNITO_CLIENT_ID: 'client1' };

describe('retireLegacySession', () => {
  it('removes the former token keys and revokes the refresh token at Cognito', async () => {
    localStorage.setItem('idToken', 'id.jwt.x');
    localStorage.setItem('refreshToken', 'refresh-secret');
    const { retireLegacySession } = await load(ENV);
    retireLegacySession();
    expect(localStorage.getItem('idToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://cognito-idp.us-east-1.amazonaws.com/');
    expect(init.headers['X-Amz-Target']).toBe('AWSCognitoIdentityProviderService.RevokeToken');
    expect(JSON.parse(init.body)).toEqual({ ClientId: 'client1', Token: 'refresh-secret' });
  });

  it('leaves the Amplify session alone and makes no request when nothing legacy is stored', async () => {
    localStorage.setItem('CognitoIdentityServiceProvider.client1.LastAuthUser', 'u');
    const { retireLegacySession } = await load(ENV);
    retireLegacySession();
    expect(localStorage.getItem('CognitoIdentityServiceProvider.client1.LastAuthUser')).toBe('u');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still clears the keys when the revoke request fails or the pool is not configured', async () => {
    localStorage.setItem('refreshToken', 'r');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { retireLegacySession } = await load(ENV);
    expect(() => retireLegacySession()).not.toThrow();
    expect(localStorage.getItem('refreshToken')).toBeNull();

    localStorage.setItem('refreshToken', 'r');
    fetchMock.mockClear();
    const unconfigured = await load({});
    unconfigured.retireLegacySession();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
