import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Trade } from '@/types/trade';
import { deriveKey } from '../crypto';
import { openDatabase, getTrades, storeTrades, clearDatabase } from '../trade-cache';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function makeJwt(sub: string): string {
  const header = btoa(JSON.stringify({ alg: 'RS256' }));
  const payload = btoa(JSON.stringify({ sub }));
  return `${header}.${payload}.signature`;
}

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

// Import after mocking localStorage so getUserIdFromToken works
import { backgroundCacheStoreTrades, backgroundCacheDeleteTrades } from '../proactive-cache';

describe('cache/proactive-cache', () => {
  const userId = 'proactive-test-user';

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'idToken') return makeJwt(userId);
      return null;
    });
  });

  afterEach(async () => {
    await clearDatabase(userId);
  });

  describe('backgroundCacheStoreTrades', () => {
    it('groups trades by account+date and stores them', async () => {
      const trades = [
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '2026-04-10T15:00:00Z' }),
        makeTrade({ id: 't2', accountId: 'acc-1', exitDate: '2026-04-10T16:00:00Z' }),
        makeTrade({ id: 't3', accountId: 'acc-2', exitDate: '2026-04-11T10:00:00Z' }),
      ];

      await backgroundCacheStoreTrades(trades);

      // Verify stored in IndexedDB
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);

      const acc1Day10 = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      expect(acc1Day10).toHaveLength(2);
      expect(acc1Day10.map((t) => t.id).sort()).toEqual(['t1', 't2']);

      const acc2Day11 = await getTrades(db, 'acc-2', '2026-04-11', cryptoKey);
      expect(acc2Day11).toHaveLength(1);
      expect(acc2Day11[0].id).toBe('t3');

      db.close();
    });

    it('uses entryDate when exitDate is missing', async () => {
      const trades = [
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '', entryDate: '2026-04-15T09:00:00Z' }),
      ];

      await backgroundCacheStoreTrades(trades);

      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      const result = await getTrades(db, 'acc-1', '2026-04-15', cryptoKey);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
      db.close();
    });

    it('uses "unknown" for trades without accountId', async () => {
      const trades = [
        makeTrade({ id: 't1', accountId: undefined, exitDate: '2026-04-10T15:00:00Z' }),
      ];

      await backgroundCacheStoreTrades(trades);

      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      const result = await getTrades(db, 'unknown', '2026-04-10', cryptoKey);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
      db.close();
    });

    it('handles empty array gracefully', async () => {
      // Should not throw and should not open a database
      await expect(backgroundCacheStoreTrades([])).resolves.toBeUndefined();
    });

    it('handles missing userId gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const trades = [makeTrade({ id: 't1' })];
      // Should not throw when no token is in localStorage
      await expect(backgroundCacheStoreTrades(trades)).resolves.toBeUndefined();
    });

    it('handles invalid JWT gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('not-a-valid-jwt');

      const trades = [makeTrade({ id: 't1' })];
      // Should not throw when JWT is malformed
      await expect(backgroundCacheStoreTrades(trades)).resolves.toBeUndefined();
    });

    it('skips trades with no date at all', async () => {
      const trades = [
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '', entryDate: '' }),
        makeTrade({ id: 't2', accountId: 'acc-1', exitDate: '2026-04-10T15:00:00Z' }),
      ];

      await backgroundCacheStoreTrades(trades);

      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      const result = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t2');
      db.close();
    });

    it('groups trades correctly when multiple accounts trade on multiple days', async () => {
      const trades = [
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '2026-04-10T15:00:00Z' }),
        makeTrade({ id: 't2', accountId: 'acc-1', exitDate: '2026-04-11T15:00:00Z' }),
        makeTrade({ id: 't3', accountId: 'acc-2', exitDate: '2026-04-10T15:00:00Z' }),
        makeTrade({ id: 't4', accountId: 'acc-2', exitDate: '2026-04-11T15:00:00Z' }),
      ];

      await backgroundCacheStoreTrades(trades);

      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);

      const a1d10 = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      const a1d11 = await getTrades(db, 'acc-1', '2026-04-11', cryptoKey);
      const a2d10 = await getTrades(db, 'acc-2', '2026-04-10', cryptoKey);
      const a2d11 = await getTrades(db, 'acc-2', '2026-04-11', cryptoKey);

      expect(a1d10).toHaveLength(1);
      expect(a1d11).toHaveLength(1);
      expect(a2d10).toHaveLength(1);
      expect(a2d11).toHaveLength(1);

      expect(a1d10[0].id).toBe('t1');
      expect(a1d11[0].id).toBe('t2');
      expect(a2d10[0].id).toBe('t3');
      expect(a2d11[0].id).toBe('t4');

      db.close();
    });
  });

  describe('backgroundCacheDeleteTrades', () => {
    it('removes matching tradeIds from the cache', async () => {
      // Pre-populate the cache
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(
        db,
        'acc-1',
        '2026-04-10',
        [
          makeTrade({ id: 't1', pnl: 100 }),
          makeTrade({ id: 't2', pnl: 200 }),
          makeTrade({ id: 't3', pnl: 300 }),
        ],
        'hash-1',
        cryptoKey
      );
      db.close();

      await backgroundCacheDeleteTrades(['t1', 't3']);

      // Verify only t2 remains
      const db2 = await openDatabase(userId);
      const remaining = await getTrades(db2, 'acc-1', '2026-04-10', cryptoKey);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('t2');
      db2.close();
    });

    it('handles empty tradeIds array gracefully', async () => {
      await expect(backgroundCacheDeleteTrades([])).resolves.toBeUndefined();
    });

    it('handles missing userId gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      await expect(backgroundCacheDeleteTrades(['t1'])).resolves.toBeUndefined();
    });

    it('does not throw when no matching trades exist', async () => {
      // Pre-populate with different trades
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(
        db,
        'acc-1',
        '2026-04-10',
        [makeTrade({ id: 't1' })],
        'hash-1',
        cryptoKey
      );
      db.close();

      // Delete non-existent trade IDs
      await expect(backgroundCacheDeleteTrades(['nonexistent-1', 'nonexistent-2'])).resolves.toBeUndefined();

      // Original trade should still be there
      const db2 = await openDatabase(userId);
      const remaining = await getTrades(db2, 'acc-1', '2026-04-10', cryptoKey);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('t1');
      db2.close();
    });

    it('removes trades across multiple accounts and dates', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(
        db,
        'acc-1',
        '2026-04-10',
        [makeTrade({ id: 't1' }), makeTrade({ id: 't2' })],
        'hash-1',
        cryptoKey
      );
      await storeTrades(
        db,
        'acc-2',
        '2026-04-11',
        [makeTrade({ id: 't3' }), makeTrade({ id: 't4' })],
        'hash-2',
        cryptoKey
      );
      db.close();

      // Delete one from each account/date
      await backgroundCacheDeleteTrades(['t1', 't4']);

      const db2 = await openDatabase(userId);
      const acc1 = await getTrades(db2, 'acc-1', '2026-04-10', cryptoKey);
      const acc2 = await getTrades(db2, 'acc-2', '2026-04-11', cryptoKey);

      expect(acc1).toHaveLength(1);
      expect(acc1[0].id).toBe('t2');
      expect(acc2).toHaveLength(1);
      expect(acc2[0].id).toBe('t3');
      db2.close();
    });
  });
});
