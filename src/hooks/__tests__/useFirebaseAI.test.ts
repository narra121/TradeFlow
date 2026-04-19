import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Trade } from '@/types/trade';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGenerateInsightFn = vi.fn();
const mockListenToInsight = vi.fn();
const mockTrimTrades = vi.fn();
const mockSha256Hex = vi.fn();

vi.mock('@/lib/firebase/functions', () => ({
  generateInsightFn: (...args: any[]) => mockGenerateInsightFn(...args),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  listenToInsight: (...args: any[]) => mockListenToInsight(...args),
}));

vi.mock('@/lib/firebase/trades', () => ({
  trimTrades: (...args: any[]) => mockTrimTrades(...args),
}));

vi.mock('@/lib/cache/hash', () => ({
  sha256Hex: (...args: any[]) => mockSha256Hex(...args),
}));

vi.mock('@/lib/firebase/init', () => ({
  app: { name: 'mock-app' },
}));

const mockGetAuth = vi.fn();
vi.mock('firebase/auth', () => ({
  getAuth: (...args: any[]) => mockGetAuth(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-1',
  symbol: 'AAPL',
  direction: 'LONG',
  entryPrice: 150,
  exitPrice: 155,
  stopLoss: 148,
  takeProfit: 160,
  size: 100,
  entryDate: '2026-04-10T09:30:00Z',
  exitDate: '2026-04-10T15:00:00Z',
  outcome: 'TP',
  pnl: 500,
  riskRewardRatio: 2.5,
  ...overrides,
});

describe('useFirebaseReport', () => {
  let useFirebaseReport: typeof import('../useFirebaseAI').useFirebaseReport;
  const mockUnsubscribe = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    mockGetAuth.mockReturnValue({ currentUser: { uid: 'user-123' } });
    mockTrimTrades.mockImplementation((trades: Trade[]) => trades.map((t) => ({ tradeId: t.id })));
    mockSha256Hex.mockResolvedValue('abc123hash');
    mockGenerateInsightFn.mockResolvedValue({ data: { cached: false, insightId: 'ALL_thisMonth' } });
    mockListenToInsight.mockReturnValue(mockUnsubscribe);

    const mod = await import('../useFirebaseAI');
    useFirebaseReport = mod.useFirebaseReport;
  });

  it('returns initial state with null data and streaming=false', () => {
    const { result } = renderHook(() => useFirebaseReport());

    expect(result.current.data).toBeNull();
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.generate).toBe('function');
    expect(typeof result.current.abort).toBe('function');
  });

  it('sets streaming=true when generate is called', async () => {
    // Make the Cloud Function call hang
    mockGenerateInsightFn.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    expect(result.current.streaming).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('calls Cloud Function with trimmed trades, accountId, period, and hash', async () => {
    const trades = [makeTrade()];
    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate(trades, 'acc-1', 'thisWeek');
    });

    await waitFor(() => {
      expect(mockGenerateInsightFn).toHaveBeenCalledWith({
        trades: [{ tradeId: 'trade-1' }],
        accountId: 'acc-1',
        period: 'thisWeek',
        tradesHash: 'abc123hash',
      });
    });
  });

  it('sets up Firestore listener after Cloud Function resolves', async () => {
    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(mockListenToInsight).toHaveBeenCalledWith(
        'user-123',
        'ALL_thisMonth',
        expect.any(Function),
        expect.any(Function),
      );
    });
  });

  it('updates data progressively from Firestore listener', async () => {
    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(mockListenToInsight).toHaveBeenCalled();
    });

    // Get the callback passed to listenToInsight
    const dataCallback = mockListenToInsight.mock.calls[0][2];

    // Simulate partial data
    act(() => {
      dataCallback({ status: 'generating', summary: 'Partial summary' });
    });

    expect(result.current.data).toEqual({ summary: 'Partial summary' });
    expect(result.current.streaming).toBe(true);
  });

  it('stops streaming when status is complete', async () => {
    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(mockListenToInsight).toHaveBeenCalled();
    });

    const dataCallback = mockListenToInsight.mock.calls[0][2];

    act(() => {
      dataCallback({
        status: 'complete',
        summary: 'Full report',
        profile: { type: 'day_trader' },
      });
    });

    expect(result.current.streaming).toBe(false);
    expect(result.current.data).toEqual({
      summary: 'Full report',
      profile: { type: 'day_trader' },
    });
  });

  it('sets error when status is error', async () => {
    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(mockListenToInsight).toHaveBeenCalled();
    });

    const dataCallback = mockListenToInsight.mock.calls[0][2];

    act(() => {
      dataCallback({ status: 'error', error: 'Model overloaded' });
    });

    expect(result.current.error).toBe('Model overloaded');
    expect(result.current.streaming).toBe(false);
  });

  it('abort unsubscribes the Firestore listener', async () => {
    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(mockListenToInsight).toHaveBeenCalled();
    });

    act(() => {
      result.current.abort();
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(result.current.streaming).toBe(false);
  });

  it('sets rate limit error message for resource-exhausted code', async () => {
    mockGenerateInsightFn.mockRejectedValue({
      code: 'functions/resource-exhausted',
      message: 'Too many requests',
    });

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Rate limit exceeded. Please try again later.');
    });

    expect(result.current.streaming).toBe(false);
  });

  it('sets error for non-Error throws from Cloud Function', async () => {
    mockGenerateInsightFn.mockRejectedValue({
      code: 'functions/internal',
      message: 'Server error',
    });

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
    });

    expect(result.current.streaming).toBe(false);
  });

  it('sets error when user is not authenticated', async () => {
    mockGetAuth.mockReturnValue({ currentUser: null });

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Not authenticated with Firebase');
    });

    expect(result.current.streaming).toBe(false);
  });

  it('handles Firestore listener error callback', async () => {
    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(mockListenToInsight).toHaveBeenCalled();
    });

    const errorCallback = mockListenToInsight.mock.calls[0][3];

    act(() => {
      errorCallback(new Error('Permission denied'));
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.streaming).toBe(false);
  });

  it('clears previous data and error when generate is called again', async () => {
    const { result } = renderHook(() => useFirebaseReport());

    // First generate
    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(mockListenToInsight).toHaveBeenCalled();
    });

    // Simulate complete
    const dataCallback = mockListenToInsight.mock.calls[0][2];
    act(() => {
      dataCallback({ status: 'complete', summary: 'First report' });
    });

    expect(result.current.data).toBeTruthy();

    // Second generate should clear state
    act(() => {
      result.current.generate([makeTrade()]);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.streaming).toBe(true);
  });
});
