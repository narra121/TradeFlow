import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Trade } from '@/types/trade';
import { syncTrades } from '../sync';
import { deriveKey } from '../crypto';
import { openDatabase, storeTrades, getTrades, clearDatabase } from '../trade-cache';

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/api';
const mockPost = vi.mocked(apiClient.post);

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1', symbol: 'AAPL', direction: 'LONG',
    entryPrice: 150, exitPrice: 155, stopLoss: 148, takeProfit: 160,
    size: 100, entryDate: '2026-04-10T09:30:00Z', exitDate: '2026-04-10T15:00:00Z',
    outcome: 'TP', pnl: 500, riskRewardRatio: 2.5,
    ...overrides,
  };
}

describe('cache/sync', () => {
  const userId = 'sync-test-user';
  const accountId = 'acc-1';

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(async () => { await clearDatabase(userId); });

  it('sends clientHashes from IndexedDB and calls POST /trades/sync', async () => {
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade()], 'hash-1', key);
    db.close();

    mockPost.mockResolvedValueOnce({
      serverHashes: { '2026-04-10': 'hash-1' }, staleDays: [], trades: [],
    });

    await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    expect(mockPost).toHaveBeenCalledWith('/trades/sync', {
      accountId, startDate: '2026-04-10', endDate: '2026-04-10',
      clientHashes: { '2026-04-10': 'hash-1' },
    });
  });

  it('reads from IndexedDB when all hashes match', async () => {
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'cached' })], 'h1', key);
    db.close();

    mockPost.mockResolvedValueOnce({
      serverHashes: { '2026-04-10': 'h1' }, staleDays: [], trades: [],
    });

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cached');
  });

  it('stores stale trades then reads ALL from IndexedDB', async () => {
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'd10' })], 'h10', key);
    db.close();

    mockPost.mockResolvedValueOnce({
      serverHashes: { '2026-04-10': 'h10', '2026-04-11': 'h11' },
      staleDays: ['2026-04-11'],
      trades: [makeTrade({ id: 'd11', exitDate: '2026-04-11T15:00:00Z' })],
    });

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-11');
    expect(result).toHaveLength(2);
    expect(result.find(t => t.id === 'd10')).toBeDefined();
    expect(result.find(t => t.id === 'd11')).toBeDefined();
  });

  it('handles first visit — stores then reads from IndexedDB', async () => {
    mockPost.mockResolvedValueOnce({
      serverHashes: { '2026-04-10': 'h1' },
      staleDays: ['2026-04-10'],
      trades: [makeTrade({ id: 'first-visit' })],
    });

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('first-visit');

    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    const cached = await getTrades(db, accountId, '2026-04-10', key);
    db.close();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('first-visit');
  });

  it('sends empty clientHashes when cache is empty', async () => {
    mockPost.mockResolvedValueOnce({
      serverHashes: { '2026-04-10': 'h1' }, staleDays: ['2026-04-10'],
      trades: [makeTrade()],
    });

    await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');

    expect(mockPost).toHaveBeenCalledWith('/trades/sync', {
      accountId, startDate: '2026-04-10', endDate: '2026-04-10', clientHashes: {},
    });
  });

  it('propagates API errors', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));
    await expect(syncTrades(userId, accountId, '2026-04-10', '2026-04-10')).rejects.toThrow('Network error');
  });

  it('handles stale day with empty trades (deleted on server)', async () => {
    const db = await openDatabase(userId);
    const key = await deriveKey(userId);
    await storeTrades(db, accountId, '2026-04-10', [makeTrade({ id: 'old' })], 'old-h', key);
    db.close();

    mockPost.mockResolvedValueOnce({ serverHashes: {}, staleDays: ['2026-04-10'], trades: [] });

    const result = await syncTrades(userId, accountId, '2026-04-10', '2026-04-10');
    expect(result).toHaveLength(0);
  });

  it('respects AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();

    mockPost.mockResolvedValueOnce({
      serverHashes: { '2026-04-10': 'h1' }, staleDays: ['2026-04-10'],
      trades: [makeTrade()],
    });

    await expect(
      syncTrades(userId, accountId, '2026-04-10', '2026-04-10', controller.signal),
    ).rejects.toThrow('Aborted');
  });
});
