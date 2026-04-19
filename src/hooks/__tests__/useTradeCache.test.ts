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

// Mock useGetStatsQuery
const mockUseGetStatsQuery = vi.fn();
vi.mock('@/store/api', () => ({
  useGetStatsQuery: (...args: any[]) => mockUseGetStatsQuery(...args),
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

    mockUseGetStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
  });

  it('returns loading=true while stats are loading', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.trades).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns empty trades when stats have no dailyTradeHashes', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: { totalTrades: 5 },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    // No dailyTradeHashes means nothing to sync
    expect(result.current.error).toBeNull();
  });

  it('triggers syncTrades when stats data arrives with dailyTradeHashes', async () => {
    const mockTrades = [makeTrade({ id: 'trade-1' }), makeTrade({ id: 'trade-2' })];
    mockSyncTrades.mockResolvedValue(mockTrades);

    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 5,
        dailyTradeHashes: {
          'acc-1#2026-04-10': 'hash-abc',
          'acc-1#2026-04-11': 'hash-def',
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });

    expect(mockSyncTrades).toHaveBeenCalledWith(
      mockUserId,
      'acc-1',
      '2026-04-01',
      '2026-04-30',
      { '2026-04-10': 'hash-abc', '2026-04-11': 'hash-def' },
    );

    expect(result.current.trades).toEqual(mockTrades);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles "ALL" accountId by syncing multiple accounts', async () => {
    const tradesAcc1 = [makeTrade({ id: 'trade-1', accountId: 'acc-1' })];
    const tradesAcc2 = [makeTrade({ id: 'trade-2', accountId: 'acc-2' })];

    mockSyncTrades
      .mockResolvedValueOnce(tradesAcc1)
      .mockResolvedValueOnce(tradesAcc2);

    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 2,
        dailyTradeHashes: {
          'acc-1#2026-04-10': 'hash-1',
          'acc-2#2026-04-10': 'hash-2',
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'ALL', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });

    expect(mockSyncTrades).toHaveBeenCalledTimes(2);
    expect(result.current.trades).toHaveLength(2);
  });

  it('sets error when syncTrades fails', async () => {
    mockSyncTrades.mockRejectedValue(new Error('IndexedDB quota exceeded'));

    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 1,
        dailyTradeHashes: {
          'acc-1#2026-04-10': 'hash-abc',
        },
      },
      isLoading: false,
    });

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

    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 1,
        dailyTradeHashes: {
          'acc-1#2026-04-10': 'hash-abc',
        },
      },
      isLoading: false,
    });

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

    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 1,
        dailyTradeHashes: {
          'acc-1#2026-04-10': 'hash-abc',
        },
      },
      isLoading: false,
    });

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

    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 1,
        dailyTradeHashes: {
          'acc-1#2026-04-10': 'hash-abc',
        },
      },
      isLoading: false,
    });

    renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(mockSyncTrades).not.toHaveBeenCalled();
  });

  it('does not sync when idToken payload is invalid', () => {
    storage.set('idToken', 'not.a.valid.jwt');

    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 1,
        dailyTradeHashes: {
          'acc-1#2026-04-10': 'hash-abc',
        },
      },
      isLoading: false,
    });

    renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(mockSyncTrades).not.toHaveBeenCalled();
  });

  it('passes correct params to useGetStatsQuery for specific account', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(mockUseGetStatsQuery).toHaveBeenCalledWith({
      accountId: 'acc-1',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    });
  });

  it('passes undefined accountId to useGetStatsQuery when accountId is "ALL"', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderHook(() =>
      useTradeCache({ accountId: 'ALL', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(mockUseGetStatsQuery).toHaveBeenCalledWith({
      accountId: undefined,
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    });
  });

  it('returns empty trades when hashes have no entries for selected account', async () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: {
        totalTrades: 1,
        dailyTradeHashes: {
          'acc-2#2026-04-10': 'hash-for-other-account',
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    // No hashes match acc-1, so no sync should happen
    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });

    expect(mockSyncTrades).not.toHaveBeenCalled();
    expect(result.current.trades).toEqual([]);
  });

  it('exposes all required fields in the return value', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useTradeCache({ accountId: 'acc-1', startDate: '2026-04-01', endDate: '2026-04-30' }),
    );

    expect(result.current).toHaveProperty('trades');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('syncing');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refresh');
    expect(typeof result.current.refresh).toBe('function');
  });
});
