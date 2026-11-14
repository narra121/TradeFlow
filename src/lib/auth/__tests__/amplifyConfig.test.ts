import { beforeEach, describe, expect, it, vi } from 'vitest';

const configure = vi.hoisted(() => vi.fn());
vi.mock('aws-amplify', () => ({ Amplify: { configure } }));

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ['VITE_COGNITO_USER_POOL_ID', 'VITE_COGNITO_CLIENT_ID', 'VITE_COGNITO_DOMAIN']) vi.stubEnv(k, env[k] ?? '');
  return import('../amplifyConfig');
}

beforeEach(() => {
  configure.mockReset();
  vi.unstubAllEnvs();
});

const FULL = { VITE_COGNITO_USER_POOL_ID: 'us-east-1_Pool', VITE_COGNITO_CLIENT_ID: 'client1', VITE_COGNITO_DOMAIN: 'auth.example.com' };

describe('buildAuthConfig', () => {
  it('points the OAuth redirects at this origin and asks for the code flow with Google', async () => {
    const { buildAuthConfig } = await load(FULL);
    expect(buildAuthConfig('https://dev.tradequt.com')).toEqual({
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_Pool',
          userPoolClientId: 'client1',
          loginWith: {
            oauth: {
              domain: 'auth.example.com',
              scopes: ['openid', 'email', 'profile'],
              redirectSignIn: ['https://dev.tradequt.com/auth/callback'],
              redirectSignOut: ['https://dev.tradequt.com/login?view=logged-out', 'https://dev.tradequt.com/login?view=logged-out&scope=all'],
              responseType: 'code',
              providers: ['Google'],
            },
          },
        },
      },
    });
  });

  it('leaves OAuth out when no hosted-UI domain is set', async () => {
    const { buildAuthConfig } = await load({ ...FULL, VITE_COGNITO_DOMAIN: '' });
    expect(buildAuthConfig('http://localhost:8080').Auth?.Cognito).toEqual({ userPoolId: 'us-east-1_Pool', userPoolClientId: 'client1' });
  });
});

describe('configureAuth', () => {
  it('configures Amplify once, however often it is called', async () => {
    const { configureAuth } = await load(FULL);
    configureAuth('http://localhost:8080');
    configureAuth('http://localhost:8080');
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it('does nothing in tests when the pool is not set', async () => {
    const { configureAuth } = await load({});
    expect(() => configureAuth('http://localhost:8080')).not.toThrow();
    expect(configure).not.toHaveBeenCalled();
  });

  it('fails loudly outside tests when the pool is not set', async () => {
    const { configureAuth } = await load({});
    vi.stubEnv('MODE', 'production');
    expect(() => configureAuth('https://tradequt.com')).toThrow(/VITE_COGNITO_USER_POOL_ID/);
  });
});
