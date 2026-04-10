import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _setDirect: (key: string, value: string) => { store[key] = value; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock window.dispatchEvent
const dispatchEventSpy = vi.fn();
Object.defineProperty(globalThis, 'dispatchEvent', { value: dispatchEventSpy, writable: true });

// Helper: create a JWT-like token with a given expiration time
function createMockJWT(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: expSeconds, sub: 'user-123' }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('tokenRefreshScheduler', () => {
  let scheduler: any;
  let axios: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorageMock.clear();
    dispatchEventSpy.mockClear();

    vi.resetModules();
    const mod = await import('../tokenRefreshScheduler');
    scheduler = mod.tokenRefreshScheduler;
    const axiosMod = await import('axios');
    axios = axiosMod.default;
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe('start()', () => {
    it('does not start when no token is in localStorage', () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('starts when a token is present in localStorage', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    it('does not double-start when already scheduled', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      scheduler.start();
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });
  });

  describe('stop()', () => {
    it('stops a running scheduler', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('is safe to call when not running', () => {
      expect(scheduler.isRunning()).toBe(false);
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('isRunning()', () => {
    it('returns false initially', () => {
      expect(scheduler.isRunning()).toBe(false);
    });

    it('returns true after start', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    it('returns false after stop', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      scheduler.start();
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('token refresh scheduling', () => {
    it('schedules refresh 2 minutes before token expiry', async () => {
      const now = Date.now();
      const expiresInSeconds = 3600; // 1 hour
      const futureExp = Math.floor(now / 1000) + expiresInSeconds;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      const newToken = createMockJWT(Math.floor(now / 1000) + 7200);
      axios.post.mockResolvedValue({ data: { data: { IdToken: newToken } } });

      scheduler.start();

      // Advance to just before refresh time (58 minutes)
      const refreshTime = (expiresInSeconds * 1000) - (2 * 60 * 1000);
      await vi.advanceTimersByTimeAsync(refreshTime - 1000);
      expect(axios.post).not.toHaveBeenCalled();

      // Advance past the refresh point — use a small step to trigger just one refresh
      await vi.advanceTimersByTimeAsync(1500);
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('refreshes immediately when token is expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      localStorageMock._setDirect('idToken', createMockJWT(pastExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      axios.post.mockResolvedValue({
        data: { data: { IdToken: createMockJWT(Math.floor(Date.now() / 1000) + 3600) } },
      });

      scheduler.start();
      // Flush only the immediate microtask, not the re-scheduled timer
      await vi.advanceTimersByTimeAsync(50);
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('refreshes immediately when token expires within 2 minutes', async () => {
      const soonExp = Math.floor(Date.now() / 1000) + 60;
      localStorageMock._setDirect('idToken', createMockJWT(soonExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      axios.post.mockResolvedValue({
        data: { data: { IdToken: createMockJWT(Math.floor(Date.now() / 1000) + 3600) } },
      });

      scheduler.start();
      await vi.advanceTimersByTimeAsync(50);
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('stores the new token in localStorage after successful refresh', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 60;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      const newToken = createMockJWT(Math.floor(Date.now() / 1000) + 3600);
      axios.post.mockResolvedValue({ data: { data: { IdToken: newToken } } });

      scheduler.start();
      await vi.advanceTimersByTimeAsync(50);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('idToken', newToken);
    });
  });

  describe('error handling', () => {
    it('stops scheduler and clears tokens when refresh fails', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 60;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      axios.post.mockRejectedValue(new Error('Network error'));

      scheduler.start();
      await vi.advanceTimersByTimeAsync(50);

      expect(scheduler.isRunning()).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('idToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('dispatches unauthorized event on refresh failure', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 60;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      axios.post.mockRejectedValue(new Error('Unauthorized'));

      scheduler.start();
      await vi.advanceTimersByTimeAsync(50);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'unauthorized' })
      );
    });

    it('stops scheduler when no refresh token is available', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 60;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      // No refreshToken

      scheduler.start();
      await vi.advanceTimersByTimeAsync(50);

      expect(scheduler.isRunning()).toBe(false);
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('unparseable token handling', () => {
    it('uses default refresh time for non-JWT tokens', () => {
      localStorageMock._setDirect('idToken', 'not-a-jwt-token');
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    it('uses default refresh time for tokens without exp claim', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const payload = btoa(JSON.stringify({ sub: 'user-123' }));
      localStorageMock._setDirect('idToken', `${header}.${payload}.sig`);
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });
  });

  describe('scheduling after successful refresh', () => {
    it('remains running after a successful token refresh', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 60;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      const newExp = Math.floor(Date.now() / 1000) + 3600;
      axios.post.mockResolvedValue({ data: { data: { IdToken: createMockJWT(newExp) } } });

      scheduler.start();
      await vi.advanceTimersByTimeAsync(50);

      expect(scheduler.isRunning()).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('extended – expired / malformed tokens', () => {
    it('schedules immediate refresh for an already-expired token', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 300; // expired 5 min ago
      localStorageMock._setDirect('idToken', createMockJWT(pastExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      const newExp = Math.floor(Date.now() / 1000) + 3600;
      axios.post.mockResolvedValue({ data: { data: { IdToken: createMockJWT(newExp) } } });

      scheduler.start();
      await vi.advanceTimersByTimeAsync(50);

      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(scheduler.isRunning()).toBe(true);
    });

    it('handles token without exp claim by using default schedule', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: 'user-456' })); // no exp
      const token = `${header}.${payload}.mock-signature`;

      localStorageMock._setDirect('idToken', token);
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    it('handles completely malformed JWT (single segment)', () => {
      localStorageMock._setDirect('idToken', 'totally-broken');
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      scheduler.start();
      // Should still schedule with the default refresh time
      expect(scheduler.isRunning()).toBe(true);
    });

    it('handles malformed JWT with invalid base64 payload', () => {
      localStorageMock._setDirect('idToken', 'header.!!!invalid!!!.sig');
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });
  });

  describe('extended – stop / logout behaviour', () => {
    it('stops the scheduler and prevents further refreshes on logout', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      localStorageMock._setDirect('refreshToken', 'mock-refresh-token');

      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);

      // Advance past the original refresh time – should NOT call the API
      const refreshTime = (3600 * 1000) - (2 * 60 * 1000);
      await vi.advanceTimersByTimeAsync(refreshTime + 5000);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('does not schedule when no token is present in localStorage', () => {
      // Ensure localStorage is empty
      localStorageMock.clear();

      scheduler.start();
      expect(scheduler.isRunning()).toBe(false);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('calling stop multiple times is safe', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      localStorageMock._setDirect('idToken', createMockJWT(futureExp));
      scheduler.start();

      scheduler.stop();
      scheduler.stop();
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });
  });
});
