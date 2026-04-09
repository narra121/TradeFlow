import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage before any imports that use it
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock tokenRefreshScheduler
vi.mock('@/lib/tokenRefreshScheduler', () => ({
  tokenRefreshScheduler: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

// Mock the authApi endpoints with matchers
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
      },
    },
  };
});

import authReducer, { clearSignupSuccess, setAuth, clearAuth, type AuthState } from '../authSlice';

describe('authSlice', () => {
  const baseInitialState: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    signupSuccess: false,
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has the correct shape with no tokens in localStorage', () => {
      // reducer called with undefined state returns initial state
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(expect.objectContaining({
        user: null,
        isAuthenticated: expect.any(Boolean),
        signupSuccess: false,
      }));
    });

    it('has correct property types', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state).toHaveProperty('user');
      expect(state).toHaveProperty('token');
      expect(state).toHaveProperty('refreshToken');
      expect(state).toHaveProperty('isAuthenticated');
      expect(state).toHaveProperty('signupSuccess');
    });
  });

  describe('clearSignupSuccess', () => {
    it('sets signupSuccess to false', () => {
      const stateWithSignup: AuthState = { ...baseInitialState, signupSuccess: true };
      const state = authReducer(stateWithSignup, clearSignupSuccess());
      expect(state.signupSuccess).toBe(false);
    });

    it('does not affect other state properties', () => {
      const stateWithUser: AuthState = {
        ...baseInitialState,
        user: { id: '1', name: 'Test', email: 'test@test.com' },
        signupSuccess: true,
      };
      const state = authReducer(stateWithUser, clearSignupSuccess());
      expect(state.signupSuccess).toBe(false);
      expect(state.user).toEqual({ id: '1', name: 'Test', email: 'test@test.com' });
    });

    it('is idempotent when signupSuccess is already false', () => {
      const state = authReducer(baseInitialState, clearSignupSuccess());
      expect(state.signupSuccess).toBe(false);
    });
  });

  describe('setAuth', () => {
    const authPayload = {
      user: { id: '123', name: 'John Doe', email: 'john@example.com' },
      token: 'test-token',
      refreshToken: 'test-refresh-token',
    };

    it('sets user, token, refreshToken, and isAuthenticated', () => {
      const state = authReducer(baseInitialState, setAuth(authPayload));
      expect(state.user).toEqual(authPayload.user);
      expect(state.token).toBe('test-token');
      expect(state.refreshToken).toBe('test-refresh-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('overwrites existing auth state', () => {
      const existingState: AuthState = {
        user: { id: 'old', name: 'Old', email: 'old@test.com' },
        token: 'old-token',
        refreshToken: 'old-refresh',
        isAuthenticated: true,
        signupSuccess: false,
      };
      const state = authReducer(existingState, setAuth(authPayload));
      expect(state.user).toEqual(authPayload.user);
      expect(state.token).toBe('test-token');
    });

    it('does not affect signupSuccess', () => {
      const stateWithSignup: AuthState = { ...baseInitialState, signupSuccess: true };
      const state = authReducer(stateWithSignup, setAuth(authPayload));
      expect(state.signupSuccess).toBe(true);
    });
  });

  describe('clearAuth', () => {
    it('clears user, token, refreshToken, and sets isAuthenticated to false', () => {
      const authenticatedState: AuthState = {
        user: { id: '123', name: 'John', email: 'john@example.com' },
        token: 'some-token',
        refreshToken: 'some-refresh',
        isAuthenticated: true,
        signupSuccess: false,
      };
      const state = authReducer(authenticatedState, clearAuth());
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('is idempotent on already cleared state', () => {
      const state = authReducer(baseInitialState, clearAuth());
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('does not affect signupSuccess', () => {
      const stateWithSignup: AuthState = {
        ...baseInitialState,
        signupSuccess: true,
        user: { id: '1', name: 'Test', email: 'test@test.com' },
        isAuthenticated: true,
      };
      const state = authReducer(stateWithSignup, clearAuth());
      expect(state.signupSuccess).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('handles full login -> logout cycle', () => {
      let state = authReducer(baseInitialState, setAuth({
        user: { id: '1', name: 'User', email: 'user@test.com' },
        token: 'tok',
        refreshToken: 'ref',
      }));
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).not.toBeNull();

      state = authReducer(state, clearAuth());
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('handles signup success -> clear signup success', () => {
      let state: AuthState = { ...baseInitialState, signupSuccess: true };
      state = authReducer(state, clearSignupSuccess());
      expect(state.signupSuccess).toBe(false);
    });

    it('handles setAuth followed by clearSignupSuccess preserving auth', () => {
      let state = authReducer(baseInitialState, setAuth({
        user: { id: '1', name: 'User', email: 'user@test.com' },
        token: 'tok',
        refreshToken: 'ref',
      }));
      state = { ...state, signupSuccess: true };
      state = authReducer(state, clearSignupSuccess());
      expect(state.isAuthenticated).toBe(true);
      expect(state.signupSuccess).toBe(false);
    });
  });
});
