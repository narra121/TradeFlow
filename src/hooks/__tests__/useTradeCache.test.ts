import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Trade } from '@/types/trade';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => storage.set(key, val)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() { return storage.size; },
  key: vi.fn(),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Mock syncTrades
const mockSyncTrades = vi.fn();
vi.mock('@/lib/cache/sync', () => ({
  syncTrades: (...args: any[]) => mockSyncTrades(...args),
}));

// Import after mocks are set up
import { useTradeCache } from '../useTradeCache';

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

// Mock JWT token with a known sub claim
const mockUserId = 'user-abc-123';
const mockPayload = { sub: mockUserId, exp: Math.floor(Date.now() / 1000) + 3600 };
const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;

describe('useTradeCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    storage.set('idToken', mockToken);
  });

  it('calls syncTrades with correct params (no serverHashes)', async () => {
    const mockTrades = [makeTrade({ id: 'trade-1' }), makeTrade({ id: 'trade-2' })];
    mockSyncTrades.mockResolvedValue(mockTrades);

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });

    // syncTrades called with 4 args only (no serverHashes)
    expect(mockSyncTrades).toHaveBeenCalledWith(
      mockUserId,
      'acc-1',
      '2026-04-01',
      '2026-04-30',
    );

    expect(result.current.trades).toEqual(mockTrades);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('starts in syncing state when userId is available', () => {
    mockSyncTrades.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(result.current.syncing).toBe(true);
    expect(result.current.loading).toBe(true);
    expect(result.current.trades).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sets error when syncTrades fails', async () => {
    mockSyncTrades.mockRejectedValue(new Error('IndexedDB quota exceeded'));

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });

    expect(result.current.error).toBe('IndexedDB quota exceeded');
    expect(result.current.trades).toEqual([]);
  });

  it('sets generic error message for non-Error throws', async () => {
    mockSyncTrades.mockRejectedValue('string error');

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to sync trades');
    });
  });

  it('refresh re-triggers the sync', async () => {
    const firstTrades = [makeTrade({ id: 'trade-1' })];
    const secondTrades = [makeTrade({ id: 'trade-1' }), makeTrade({ id: 'trade-3' })];

    mockSyncTrades.mockResolvedValueOnce(firstTrades).mockResolvedValueOnce(secondTrades);

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    // Wait for first sync
    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });

    expect(result.current.trades).toEqual(firstTrades);

    // Trigger refresh
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockSyncTrades).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.trades).toEqual(secondTrades);
    });
  });

  it('does not sync when no idToken is in localStorage', () => {
    storage.clear();

    renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(mockSyncTrades).not.toHaveBeenCalled();
  });

  it('does not sync when idToken payload is invalid', () => {
    storage.set('idToken', 'not.a.valid.jwt');

    renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(mockSyncTrades).not.toHaveBeenCalled();
  });

  it('exposes all required fields in the return value', async () => {
    mockSyncTrades.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });

    expect(result.current).toHaveProperty('trades');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('syncing');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refresh');
    expect(typeof result.current.refresh).toBe('function');
  });

  it('re-syncs when accountId changes', async () => {
    mockSyncTrades.mockResolvedValue([]);

    const { rerender } = renderHook(
      (props) => useTradeCache(props),
      { initialProps: { accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' } },
    );

    await waitFor(() => {
      expect(mockSyncTrades).toHaveBeenCalledTimes(1);
    });

    rerender({ accountId: 'acc-2', startDate: '2026-04-01', endDate: '2026-04-30' });

    await waitFor(() => {
      expect(mockSyncTrades).toHaveBeenCalledTimes(2);
    });

    expect(mockSyncTrades).toHaveBeenLastCalledWith(
      mockUserId,
      'acc-2',
      '2026-04-01',
      '2026-04-30',
    );
  });

  it('re-syncs when date range changes', async () => {
    mockSyncTrades.mockResolvedValue([]);

    const { rerender } = renderHook(
      (props) => useTradeCache(props),
      { initialProps: { accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' } },
    );

    await waitFor(() => {
      expect(mockSyncTrades).toHaveBeenCalledTimes(1);
    });

    rerender({ accountId: 'acc-1', startDate: '2026-03-01', endDate: '2026-03-31' });

    await waitFor(() => {
      expect(mockSyncTrades).toHaveBeenCalledTimes(2);
    });
  });
});
