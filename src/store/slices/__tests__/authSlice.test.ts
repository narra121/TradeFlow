/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for RTK actions */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hasStoredSession = vi.hoisted(() => vi.fn(() => false));
vi.mock('@/lib/auth/storedSession', () => ({ hasStoredSession }));

// RTK's addMatcher expects matchFulfilled to be an action matcher (a function with a .match property)
vi.mock('../../api/authApi', () => {
  const createMatcher = (type: string) => {
    const matcher = (action: any) => action?.type === type;
    matcher.match = matcher;
    matcher.type = type;
    return matcher;
  };
  return {
    authApi: {
      endpoints: {
        signup: { matchFulfilled: createMatcher('authApi/signup/fulfilled') },
        login: { matchFulfilled: createMatcher('authApi/login/fulfilled') },
        logout: { matchFulfilled: createMatcher('authApi/logout/fulfilled') },
        logoutEverywhere: { matchFulfilled: createMatcher('authApi/logoutEverywhere/fulfilled') },
      },
    },
  };
});

import authReducer, { clearAuth, clearSignupSuccess, setUser, type AuthState } from '../authSlice';

const user = { id: '123', name: 'John Doe', email: 'john@example.com' };
const signedOut: AuthState = { user: null, isAuthenticated: false, signupSuccess: false };
const signedIn: AuthState = { user, isAuthenticated: true, signupSuccess: false };

describe('authSlice', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('initial state', () => {
    it('is signed out with no stored Amplify session', async () => {
      hasStoredSession.mockReturnValue(false);
      vi.resetModules();
      const fresh = (await import('../authSlice')).default;
      expect(fresh(undefined, { type: '@@INIT' })).toEqual({ user: null, isAuthenticated: false, signupSuccess: false });
    });

    it('is signed in (user not yet known) when Amplify has a stored session', async () => {
      hasStoredSession.mockReturnValue(true);
      vi.resetModules();
      const fresh = (await import('../authSlice')).default;
      expect(fresh(undefined, { type: '@@INIT' })).toEqual({ user: null, isAuthenticated: true, signupSuccess: false });
    });

    it('holds no tokens: Amplify keeps them', () => {
      expect(authReducer(undefined, { type: '@@INIT' })).not.toHaveProperty('token');
      expect(authReducer(undefined, { type: '@@INIT' })).not.toHaveProperty('refreshToken');
    });
  });

  describe('clearSignupSuccess', () => {
    it('resets the flag and leaves the rest alone', () => {
      const state = authReducer({ ...signedIn, signupSuccess: true }, clearSignupSuccess());
      expect(state).toEqual(signedIn);
    });
  });

  describe('setUser', () => {
    it('sets the user and marks the session authenticated', () => {
      expect(authReducer(signedOut, setUser(user))).toEqual({ user, isAuthenticated: true, signupSuccess: false });
    });

    it('replaces an earlier user', () => {
      const other = { id: 'old', name: 'Old', email: 'old@test.com' };
      expect(authReducer({ ...signedIn, user: other }, setUser(user)).user).toEqual(user);
    });
  });

  describe('clearAuth', () => {
    it('clears the user and the authenticated flag', () => {
      expect(authReducer(signedIn, clearAuth())).toEqual(signedOut);
    });

    it('keeps signupSuccess', () => {
      expect(authReducer({ ...signedIn, signupSuccess: true }, clearAuth()).signupSuccess).toBe(true);
    });
  });

  describe('auth API results', () => {
    it('signup fulfilled sets signupSuccess and changes nothing else', () => {
      const state = authReducer(signedOut, { type: 'authApi/signup/fulfilled', payload: {} });
      expect(state).toEqual({ ...signedOut, signupSuccess: true });
    });

    it('login fulfilled sets the user from the payload', () => {
      const state = authReducer(signedOut, { type: 'authApi/login/fulfilled', payload: { user } });
      expect(state).toEqual(signedIn);
    });

    it.each(['authApi/logout/fulfilled', 'authApi/logoutEverywhere/fulfilled'])('%s signs out', (type) => {
      expect(authReducer(signedIn, { type, payload: undefined })).toEqual(signedOut);
    });

    it('ignores unrelated actions', () => {
      expect(authReducer(signedIn, { type: 'something/else' })).toBe(signedIn);
    });
  });
});
