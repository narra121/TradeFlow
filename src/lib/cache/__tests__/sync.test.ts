import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Trade } from '@/types/trade';
import { syncTrades } from '../sync';
import { deriveKey } from '../crypto';
import {
  openDatabase,
  storeTrades,
  putMonthHash,
  clearDatabase,
} from '../trade-cache';

// Mock the apiClient module
vi.mock('@/lib/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/lib/api/api';
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
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
  };
}

describe('cache/sync', () => {
  const userId = 'sync-test-user';
  const accountId = 'acc-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await clearDatabase(userId);
  });

  it('reads from IndexedDB only when batchMatch is true (no GET /trades call)', async () => {
    // Pre-populate cache with trades
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    const cachedTrades = [makeTrade({ id: 'cached-1', pnl: 100 })];
    await storeTrades(db, accountId, '2026-04-10', cachedTrades, 'day-hash-1', key);
    await putMonthHash(db, accountId, '2026-04', 'month-hash-1');
    db.close();

    // Server says everything matches
    mockPost.mockResolvedValueOnce({
      batchMatch: true,
      staleDays: [],
      serverMonthHashes: {},
      serverDayHashes: {},
    } as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // verify-hashes was called
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/trades/verify-hashes', expect.objectContaining({
      accountId,
      startDate: '2026-04-10',
      endDate: '2026-04-10',
    }));

    // GET /trades was NOT called
    expect(mockGet).not.toHaveBeenCalled();

    // Trades read from IndexedDB
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cached-1');
    expect(result[0].pnl).toBe(100);
  });

  it('fetches stale days from server when verify-hashes returns stale days', async () => {
    // Pre-populate cache with day 10 (fresh) but not day 11 (stale)
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'cached-d10' })], 'hash-d10', key);
    db.close();

    // Server says day 11 is stale
    mockPost.mockResolvedValueOnce({
      batchMatch: false,
      staleDays: ['acc-1#2026-04-11'],
      serverMonthHashes: { 'acc-1#2026-04': 'new-month-hash' },
      serverDayHashes: { 'acc-1#2026-04-11': 'new-hash-d11' },
    } as any);

    const serverTrades = [
      makeTrade({ id: 'fresh-d11', exitDate: '2026-04-11T15:00:00Z' }),
    ];
    mockGet.mockResolvedValueOnce(serverTrades as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-11');

    // verify-hashes was called
    expect(mockPost).toHaveBeenCalledTimes(1);

    // GET /trades was called for stale day
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/trades', {
      params: { accountId, startDate: '2026-04-11', endDate: '2026-04-11' },
    });

    // Both cached day 10 and fetched day 11 in result
    expect(result).toHaveLength(2);
    expect(result.find(t => t.id === 'cached-d10')).toBeDefined();
    expect(result.find(t => t.id === 'fresh-d11')).toBeDefined();
  });

  it('handles mixed months: some match, some stale', async () => {
    // March is cached and matches, April has stale days
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-03-31', [makeTrade({ id: 'march-trade' })], 'hash-march', key);
    await putMonthHash(db, accountId, '2026-03', 'month-hash-march');
    db.close();

    mockPost.mockResolvedValueOnce({
      batchMatch: false,
      staleDays: ['acc-1#2026-04-01'],
      serverMonthHashes: {
        'acc-1#2026-04': 'new-april-month-hash',
      },
      serverDayHashes: {
        'acc-1#2026-04-01': 'hash-april-1',
      },
    } as any);

    const aprilTrades = [
      makeTrade({ id: 'april-trade', exitDate: '2026-04-01T15:00:00Z' }),
    ];
    mockGet.mockResolvedValueOnce(aprilTrades as any);

    const result = await syncTrades(userId, accountId, '2026-03-31', '2026-04-01');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result.find(t => t.id === 'march-trade')).toBeDefined();
    expect(result.find(t => t.id === 'april-trade')).toBeDefined();
  });

  it('fetches everything directly when cache is empty (skips verify-hashes)', async () => {
    const serverTrades = [
      makeTrade({ id: 'new-1', exitDate: '2026-04-10T15:00:00Z' }),
    ];
    mockGet.mockResolvedValueOnce(serverTrades as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // verify-hashes NOT called (no local hashes)
    expect(mockPost).not.toHaveBeenCalled();
    // GET /trades called directly
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new-1');
  });

  it('propagates verify-hashes failure when hashes exist', async () => {
    // Pre-populate cache so verify-hashes path is used
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'cached' })], 'h1', key);
    await putMonthHash(db, accountId, '2026-04', 'mh1');
    db.close();

    mockPost.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      syncTrades(userId, accountId, '2026-04-10', '2026-04-10'),
    ).rejects.toThrow('Network error');

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('propagates fetch failure when cache is empty', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      syncTrades(userId, accountId, '2026-04-10', '2026-04-10'),
    ).rejects.toThrow('Network error');

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('updates local month hashes after sync', async () => {
    // Pre-populate cache so verify-hashes path is used
    const db0 = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db0, accountId, '2026-04-10', [makeTrade({ id: 'old' })], 'old-hash', key);
    await putMonthHash(db0, accountId, '2026-04', 'old-month-hash');
    db0.close();

    mockPost.mockResolvedValueOnce({
      batchMatch: false,
      staleDays: ['acc-1#2026-04-10'],
      serverMonthHashes: { 'acc-1#2026-04': 'updated-month-hash' },
      serverDayHashes: { 'acc-1#2026-04-10': 'updated-day-hash' },
    } as any);

    mockGet.mockResolvedValueOnce([
      makeTrade({ id: 'trade-1', exitDate: '2026-04-10T15:00:00Z' }),
    ] as any);

    await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // Verify month hash was stored locally
    const db = await openDatabase(userId);
    const monthHashes = await import('../trade-cache').then(m =>
      m.getMonthHashes(db, accountId, ['2026-04'])
    );
    db.close();

    expect(monthHashes.get('2026-04')).toBe('updated-month-hash');
  });

  it('sends local month and day hashes to verify-hashes endpoint', async () => {
    // Pre-populate cache
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'cached' })], 'local-day-hash', key);
    await putMonthHash(db, accountId, '2026-04', 'local-month-hash');
    db.close();

    mockPost.mockResolvedValueOnce({
      batchMatch: true,
      staleDays: [],
      serverMonthHashes: {},
      serverDayHashes: {},
    } as any);

    await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    expect(mockPost).toHaveBeenCalledWith('/trades/verify-hashes', {
      accountId,
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      clientMonthHashes: { 'acc-1#2026-04': 'local-month-hash' },
      clientDayHashes: { 'acc-1#2026-04-10': 'local-day-hash' },
    });
  });

  it('handles server returning trades wrapped in a trades property', async () => {
    mockPost.mockResolvedValueOnce({
      batchMatch: false,
      staleDays: ['acc-1#2026-04-10'],
      serverMonthHashes: { 'acc-1#2026-04': 'mh' },
      serverDayHashes: { 'acc-1#2026-04-10': 'dh' },
    } as any);

    mockGet.mockResolvedValueOnce({ trades: [makeTrade({ id: 'wrapped' })] } as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wrapped');
  });

  it('persists fetched trades to cache for future reads', async () => {
    // First sync: empty cache, fetches directly (no verify-hashes)
    mockGet.mockResolvedValueOnce([
      makeTrade({ id: 'persist-1', exitDate: '2026-04-10T15:00:00Z' }),
    ] as any);

    await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Verify trades are stored in IndexedDB
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    const { getTrades } = await import('../trade-cache');
    const cached = await getTrades(db, accountId, '2026-04-10', key);
    db.close();

    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('persist-1');
  });

  it('filters out MONTH entries from staleDays', async () => {
    // In case server returns MONTH keys in staleDays (shouldn't, but defensive)
    mockPost.mockResolvedValueOnce({
      batchMatch: false,
      staleDays: ['acc-1#MONTH#2026-04', 'acc-1#2026-04-10'],
      serverMonthHashes: { 'acc-1#2026-04': 'mh' },
      serverDayHashes: { 'acc-1#2026-04-10': 'dh' },
    } as any);

    mockGet.mockResolvedValueOnce([
      makeTrade({ id: 'trade-1', exitDate: '2026-04-10T15:00:00Z' }),
    ] as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // Only day 2026-04-10 was fetched, MONTH entry was filtered
    expect(mockGet).toHaveBeenCalledWith('/trades', {
      params: { accountId, startDate: '2026-04-10', endDate: '2026-04-10' },
    });
    expect(result).toHaveLength(1);
  });
});
