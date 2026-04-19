import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Trade } from '@/types/trade';
import { syncTrades } from '../sync';
import { deriveKey } from '../crypto';
import { openDatabase, storeTrades, clearDatabase } from '../trade-cache';

// Mock the apiClient module
vi.mock('@/lib/api/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import apiClient from '@/lib/api/api';
const mockGet = vi.mocked(apiClient.get);

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

  it('fetches all trades from server when cache is empty', async () => {
    const serverTrades = [
      makeTrade({ id: 't1', exitDate: '2026-04-10T15:00:00Z' }),
      makeTrade({ id: 't2', exitDate: '2026-04-10T16:00:00Z' }),
    ];

    mockGet.mockResolvedValueOnce(serverTrades as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10', {
      '2026-04-10': 'server-hash-1',
    });

    expect(mockGet).toHaveBeenCalledWith('/trades', {
      params: { accountId, startDate: '2026-04-10', endDate: '2026-04-10' },
    });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('uses cached trades when hashes match', async () => {
    // Pre-populate the cache
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    const cachedTrades = [makeTrade({ id: 'cached-1', pnl: 100 })];
    await storeTrades(db, accountId, '2026-04-10', cachedTrades, 'matching-hash', key);
    db.close();

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10', {
      '2026-04-10': 'matching-hash',
    });

    // Should not have called the server
    expect(mockGet).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cached-1');
    expect(result[0].pnl).toBe(100);
  });

  it('fetches from server when hashes differ', async () => {
    // Pre-populate cache with old data
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    const oldTrades = [makeTrade({ id: 'old-1', pnl: 50 })];
    await storeTrades(db, accountId, '2026-04-10', oldTrades, 'old-hash', key);
    db.close();

    const newTrades = [makeTrade({ id: 'new-1', pnl: 200 })];
    mockGet.mockResolvedValueOnce(newTrades as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10', {
      '2026-04-10': 'new-hash',
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new-1');
    expect(result[0].pnl).toBe(200);
  });

  it('handles multi-day range with mixed cache states', async () => {
    // Day 1: cached and matching
    // Day 2: cached but stale
    // Day 3: not in server at all (no hash)
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'cached-d1' })], 'hash-d1', key);
    await storeTrades(db, accountId, '2026-04-11', [makeTrade({ id: 'old-d2' })], 'old-hash-d2', key);
    db.close();

    const serverTrades = [
      makeTrade({ id: 'fresh-d2', exitDate: '2026-04-11T15:00:00Z' }),
    ];
    mockGet.mockResolvedValueOnce(serverTrades as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-12', {
      '2026-04-10': 'hash-d1',       // matches cache
      '2026-04-11': 'new-hash-d2',    // stale - will fetch
      // '2026-04-12' not in server hashes -> no trades
    });

    // Day 1 from cache + Day 2 from server
    expect(result).toHaveLength(2);
    expect(result.find((t) => t.id === 'cached-d1')).toBeDefined();
    expect(result.find((t) => t.id === 'fresh-d2')).toBeDefined();
    // Server was called only for stale day
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when server has no hashes and cache is empty', async () => {
    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10', {});
    expect(result).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('handles server returning trades wrapped in a trades property', async () => {
    mockGet.mockResolvedValueOnce({ trades: [makeTrade({ id: 'wrapped' })] } as any);

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10', {
      '2026-04-10': 'hash-x',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wrapped');
  });

  it('persists fetched trades to cache for future sync', async () => {
    const serverTrades = [makeTrade({ id: 'persist-1', exitDate: '2026-04-10T15:00:00Z' })];
    mockGet.mockResolvedValueOnce(serverTrades as any);

    // First sync: fetches from server
    await syncTrades(userId, accountId, '2026-04-10', '2026-04-10', {
      '2026-04-10': 'persist-hash',
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Second sync with same hash: should use cache
    mockGet.mockClear();
    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10', {
      '2026-04-10': 'persist-hash',
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('persist-1');
  });
});
