import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockOnAuthStateChanged = vi.fn();
const mockGetAuth = vi.fn();
const mockListenToRateLimits = vi.fn();

vi.mock('firebase/auth', () => ({
  getAuth: (...args: any[]) => mockGetAuth(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  listenToRateLimits: (...args: any[]) => mockListenToRateLimits(...args),
}));

vi.mock('@/lib/firebase/init', () => ({
  app: { name: 'mock-app' },
}));

describe('useRateLimits', () => {
  let useRateLimits: typeof import('../useRateLimits').useRateLimits;
  const mockAuthUnsub = vi.fn();
  const mockRateLimitUnsub = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    mockGetAuth.mockReturnValue({ name: 'mock-auth' });
    mockOnAuthStateChanged.mockReturnValue(mockAuthUnsub);
    mockListenToRateLimits.mockReturnValue(mockRateLimitUnsub);

    const mod = await import('../useRateLimits');
    useRateLimits = mod.useRateLimits;
  });

  it('returns null when user is unauthenticated', () => {
    // Simulate onAuthStateChanged calling with null user
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      cb(null);
      return mockAuthUnsub;
    });

    const { result } = renderHook(() => useRateLimits());

    expect(result.current).toBeNull();
    expect(mockListenToRateLimits).not.toHaveBeenCalled();
  });

  it('returns default values when no rate limit document exists', () => {
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      cb({ uid: 'user-1' });
      return mockAuthUnsub;
    });
    mockListenToRateLimits.mockImplementation((_uid: string, cb: any) => {
      cb(null);
      return mockRateLimitUnsub;
    });

    const { result } = renderHook(() => useRateLimits());

    expect(result.current).toEqual({
      insights: { used: 0, limit: 6, remaining: 6, resetAt: null },
      sessions: { used: 0, limit: 6, remaining: 6, resetAt: null },
    });
  });

  it('parses insight rate limits correctly', () => {
    const windowStartMs = Date.now() - 3600000; // 1 hour ago
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      cb({ uid: 'user-1' });
      return mockAuthUnsub;
    });
    mockListenToRateLimits.mockImplementation((_uid: string, cb: any) => {
      cb({
        insightGenerations: { count: 3, windowStart: { toMillis: () => windowStartMs } },
      });
      return mockRateLimitUnsub;
    });

    const { result } = renderHook(() => useRateLimits());

    expect(result.current!.insights.used).toBe(3);
    expect(result.current!.insights.limit).toBe(6);
    expect(result.current!.insights.remaining).toBe(3);
    expect(result.current!.insights.resetAt).toBeInstanceOf(Date);
    // chatSessions should be defaults when not in the data
    expect(result.current!.sessions.used).toBe(0);
    expect(result.current!.sessions.remaining).toBe(6);
    expect(result.current!.sessions.resetAt).toBeNull();
  });

  it('parses session rate limits correctly', () => {
    const windowStartMs = Date.now() - 7200000; // 2 hours ago
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      cb({ uid: 'user-1' });
      return mockAuthUnsub;
    });
    mockListenToRateLimits.mockImplementation((_uid: string, cb: any) => {
      cb({
        chatSessions: { count: 5, windowStart: { toMillis: () => windowStartMs } },
      });
      return mockRateLimitUnsub;
    });

    const { result } = renderHook(() => useRateLimits());

    expect(result.current!.sessions.used).toBe(5);
    expect(result.current!.sessions.limit).toBe(6);
    expect(result.current!.sessions.remaining).toBe(1);
    expect(result.current!.sessions.resetAt).toBeInstanceOf(Date);
  });

  it('computes resetAt from windowStart + 6 hours', () => {
    const windowStartMs = 1700000000000; // fixed timestamp
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      cb({ uid: 'user-1' });
      return mockAuthUnsub;
    });
    mockListenToRateLimits.mockImplementation((_uid: string, cb: any) => {
      cb({
        insightGenerations: { count: 1, windowStart: { toMillis: () => windowStartMs } },
        chatSessions: { count: 2, windowStart: { toMillis: () => windowStartMs } },
      });
      return mockRateLimitUnsub;
    });

    const { result } = renderHook(() => useRateLimits());

    const expectedResetMs = windowStartMs + 6 * 60 * 60 * 1000;
    expect(result.current!.insights.resetAt!.getTime()).toBe(expectedResetMs);
    expect(result.current!.sessions.resetAt!.getTime()).toBe(expectedResetMs);
  });

  it('cleans up listeners on unmount', () => {
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      cb({ uid: 'user-1' });
      return mockAuthUnsub;
    });
    mockListenToRateLimits.mockReturnValue(mockRateLimitUnsub);

    const { unmount } = renderHook(() => useRateLimits());

    unmount();

    expect(mockAuthUnsub).toHaveBeenCalled();
    expect(mockRateLimitUnsub).toHaveBeenCalled();
  });

  it('re-subscribes when auth state changes', () => {
    let authCallback: any;
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      authCallback = cb;
      return mockAuthUnsub;
    });

    renderHook(() => useRateLimits());

    // User logs in
    act(() => {
      authCallback({ uid: 'user-1' });
    });

    expect(mockListenToRateLimits).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
    );

    // User logs out
    act(() => {
      authCallback(null);
    });

    expect(mockRateLimitUnsub).toHaveBeenCalled();

    // User logs in as different user
    act(() => {
      authCallback({ uid: 'user-2' });
    });

    expect(mockListenToRateLimits).toHaveBeenCalledWith(
      'user-2',
      expect.any(Function),
    );
  });

  it('clamps remaining to 0 when count exceeds limit', () => {
    mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
      cb({ uid: 'user-1' });
      return mockAuthUnsub;
    });
    mockListenToRateLimits.mockImplementation((_uid: string, cb: any) => {
      cb({
        insightGenerations: { count: 10, windowStart: { toMillis: () => Date.now() } },
        chatSessions: { count: 8, windowStart: { toMillis: () => Date.now() } },
      });
      return mockRateLimitUnsub;
    });

    const { result } = renderHook(() => useRateLimits());

    expect(result.current!.insights.remaining).toBe(0);
    expect(result.current!.sessions.remaining).toBe(0);
  });
});
