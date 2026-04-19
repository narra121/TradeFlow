import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Trade } from '@/types/trade';
import { syncTrades } from '../sync';
import { deriveKey } from '../crypto';
import {
  openDatabase,
  storeTrades,
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

  it('reads from IndexedDB only when all day hashes match (no GET /trades call)', async () => {
    // Pre-populate cache with trades
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    const cachedTrades = [makeTrade({ id: 'cached-1', pnl: 100 })];
    await storeTrades(db, accountId, '2026-04-10', cachedTrades, 'day-hash-1', key);
    db.close();

    // Server day-hashes returns matching hash
    mockGet
      .mockResolvedValueOnce({ 'acc-1#2026-04-10': 'day-hash-1' } as any) // day-hashes
    ;

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // day-hashes was called
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/trades/day-hashes', {
      params: { accountId, startDate: '2026-04-10', endDate: '2026-04-10' },
    });

    // Trades read from IndexedDB
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cached-1');
    expect(result[0].pnl).toBe(100);
  });

  it('fetches stale days from server when day hashes differ', async () => {
    // Pre-populate cache with day 10 (fresh) but day 11 has no local hash
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'cached-d10' })], 'hash-d10', key);
    db.close();

    // Server returns hashes for both days - day 10 matches, day 11 is new
    mockGet
      .mockResolvedValueOnce({
        'acc-1#2026-04-10': 'hash-d10',
        'acc-1#2026-04-11': 'new-hash-d11',
      } as any) // day-hashes
      .mockResolvedValueOnce([
        makeTrade({ id: 'fresh-d11', exitDate: '2026-04-11T15:00:00Z' }),
      ] as any); // trades fetch

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-11');

    // day-hashes was called, then GET /trades for stale day
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenCalledWith('/trades/day-hashes', {
      params: { accountId, startDate: '2026-04-10', endDate: '2026-04-11' },
    });
    expect(mockGet).toHaveBeenCalledWith('/trades', {
      params: { accountId, startDate: '2026-04-11', endDate: '2026-04-11' },
    });

    // Both cached day 10 and fetched day 11 in result
    expect(result).toHaveLength(2);
    expect(result.find(t => t.id === 'cached-d10')).toBeDefined();
    expect(result.find(t => t.id === 'fresh-d11')).toBeDefined();
  });

  it('fetches everything directly when cache is empty (skips day-hashes)', async () => {
    const serverTrades = [
      makeTrade({ id: 'new-1', exitDate: '2026-04-10T15:00:00Z' }),
    ];
    // First call: GET /trades (direct fetch)
    // Second call: GET /trades/day-hashes (to store hashes alongside trades)
    mockGet
      .mockResolvedValueOnce(serverTrades as any) // trades
      .mockResolvedValueOnce({ 'acc-1#2026-04-10': 'server-hash' } as any); // day-hashes

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // GET /trades called directly (+ day-hashes for storing)
    expect(mockGet).toHaveBeenCalledWith('/trades', {
      params: { accountId, startDate: '2026-04-10', endDate: '2026-04-10' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new-1');
  });

  it('propagates day-hashes failure when local hashes exist', async () => {
    // Pre-populate cache so day-hashes path is used
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'cached' })], 'h1', key);
    db.close();

    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      syncTrades(userId, accountId, '2026-04-10', '2026-04-10'),
    ).rejects.toThrow('Network error');
  });

  it('propagates fetch failure when cache is empty', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      syncTrades(userId, accountId, '2026-04-10', '2026-04-10'),
    ).rejects.toThrow('Network error');
  });

  it('handles server returning trades wrapped in a trades property', async () => {
    // Pre-populate so day-hashes path is used
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'old' })], 'old-hash', key);
    db.close();

    mockGet
      .mockResolvedValueOnce({ 'acc-1#2026-04-10': 'new-hash' } as any) // day-hashes (hash changed)
      .mockResolvedValueOnce({ trades: [makeTrade({ id: 'wrapped' })] } as any); // trades

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wrapped');
  });

  it('persists fetched trades to cache for future reads', async () => {
    // First sync: empty cache, fetches directly
    mockGet
      .mockResolvedValueOnce([
        makeTrade({ id: 'persist-1', exitDate: '2026-04-10T15:00:00Z' }),
      ] as any) // trades
      .mockResolvedValueOnce({ 'acc-1#2026-04-10': 'server-hash' } as any); // day-hashes

    await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // Verify trades are stored in IndexedDB
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    const { getTrades } = await import('../trade-cache');
    const cached = await getTrades(db, accountId, '2026-04-10', key);
    db.close();

    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('persist-1');
  });

  it('detects stale days when local hash differs from server hash', async () => {
    // Pre-populate cache with old hash
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'old-trade' })], 'old-hash', key);
    db.close();

    // Server returns a different hash for the same day
    mockGet
      .mockResolvedValueOnce({ 'acc-1#2026-04-10': 'new-hash' } as any) // day-hashes
      .mockResolvedValueOnce([
        makeTrade({ id: 'updated-trade', exitDate: '2026-04-10T15:00:00Z' }),
      ] as any); // trades for stale day

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    // Should have fetched trades for the stale day
    expect(mockGet).toHaveBeenCalledWith('/trades', {
      params: { accountId, startDate: '2026-04-10', endDate: '2026-04-10' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('updated-trade');
  });

  it('handles multi-day range with mixed fresh and stale days', async () => {
    // Day 10 cached and fresh, day 11 cached but stale, day 12 missing
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'd10' })], 'hash-10', key);
    await storeTrades(db, accountId, '2026-04-11', [makeTrade({ id: 'd11-old' })], 'hash-11-old', key);
    db.close();

    mockGet
      .mockResolvedValueOnce({
        'acc-1#2026-04-10': 'hash-10',       // matches local
        'acc-1#2026-04-11': 'hash-11-new',   // differs from local
        'acc-1#2026-04-12': 'hash-12',       // no local hash
      } as any) // day-hashes
      .mockResolvedValueOnce([
        makeTrade({ id: 'd11-new', exitDate: '2026-04-11T15:00:00Z' }),
        makeTrade({ id: 'd12', exitDate: '2026-04-12T15:00:00Z' }),
      ] as any); // trades for stale days (11 and 12)

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-12');

    // GET /trades called for stale range (11 to 12)
    expect(mockGet).toHaveBeenCalledWith('/trades', {
      params: { accountId, startDate: '2026-04-11', endDate: '2026-04-12' },
    });

    expect(result).toHaveLength(3);
    expect(result.find(t => t.id === 'd10')).toBeDefined();
    expect(result.find(t => t.id === 'd11-new')).toBeDefined();
    expect(result.find(t => t.id === 'd12')).toBeDefined();
  });
});
