import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/api/tokenRefresh', () => ({ refreshToken: vi.fn() }));

const amplify = vi.hoisted(() => ({ signOut: vi.fn(), fetchAuthSession: vi.fn() }));
vi.mock('aws-amplify/auth', () => ({ ...amplify, confirmResetPassword: vi.fn(), confirmSignUp: vi.fn(), resendSignUpCode: vi.fn(), resetPassword: vi.fn(), signIn: vi.fn(), signInWithRedirect: vi.fn(), signUp: vi.fn() }));
vi.mock('aws-amplify/utils', () => ({ Hub: { listen: vi.fn() } }));
vi.mock('@/lib/auth/amplifyConfig', () => ({ configureAuth: vi.fn() }));
const clearDatabase = vi.hoisted(() => vi.fn(async (_userId: string) => undefined));
vi.mock('@/lib/cache/trade-cache', () => ({ clearDatabase }));
vi.mock('../imageCache', () => ({ clearImageCache: vi.fn() }));

import { api } from '../baseApi';
import { authApi } from '../authApi';

const P = 'CognitoIdentityServiceProvider.c1';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(`${P}.LastAuthUser`, 'Google_1');
  localStorage.setItem(`${P}.Google_1.accessToken`, 'a.b.c');
  localStorage.setItem(`${P}.Google_1.idToken`, `h.${b64({ sub: 'u-1' })}.s`);
  localStorage.setItem(`${P}.oauthSignIn`, 'true,false');
});

describe('clearDeletedSession (the session of a deleted account)', () => {
  it('clears the user caches and the browser keys, and never calls signOut, whose Google redirect would skip /goodbye', async () => {
    const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });
    const res = await store.dispatch(authApi.endpoints.clearDeletedSession.initiate());
    expect(res).not.toHaveProperty('error');
    expect(clearDatabase).toHaveBeenCalledWith('u-1');
    expect(amplify.signOut).not.toHaveBeenCalled();
    expect(localStorage).toHaveLength(0);
  });
});
