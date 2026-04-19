import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { deriveKey } from '../crypto';
import {
  openDatabase,
  storeTrades,
  getTrades,
  getSyncKeys,
  evictOldDays,
  clearDatabase,
  getAllSyncKeysForAccount,
  storeTradesOnly,
} from '../trade-cache';
import type { Trade } from '@/types/trade';

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

describe('cache/trade-cache', () => {
  const userId = 'test-user-123';
  let db: IDBDatabase;
  let cryptoKey: CryptoKey;

  beforeEach(async () => {
    db = await openDatabase(userId);
    cryptoKey = await deriveKey(userId);
  });

  afterEach(async () => {
    db.close();
    await clearDatabase(userId);
  });

  describe('openDatabase', () => {
    it('creates a database with trades and sync-keys stores', () => {
      expect(db.objectStoreNames.contains('trades')).toBe(true);
      expect(db.objectStoreNames.contains('sync-keys')).toBe(true);
    });

    it('does not contain month-hashes store', () => {
      expect(db.objectStoreNames.contains('month-hashes')).toBe(false);
    });

    it('uses the correct database name', () => {
      expect(db.name).toBe(`tradequt-cache-${userId}`);
    });
  });

  describe('storeTrades / getTrades', () => {
    it('stores and retrieves trades for a given account and date', async () => {
      const trades = [
        makeTrade({ id: 't1', pnl: 100 }),
        makeTrade({ id: 't2', pnl: -50 }),
      ];

      await storeTrades(db, 'acc-1', '2026-04-10', trades, 'hash-abc', cryptoKey);
      const retrieved = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);

      expect(retrieved).toHaveLength(2);
      expect(retrieved.map((t) => t.id).sort()).toEqual(['t1', 't2']);
      expect(retrieved.find((t) => t.id === 't1')?.pnl).toBe(100);
      expect(retrieved.find((t) => t.id === 't2')?.pnl).toBe(-50);
    });

    it('returns empty array for non-existent account/date', async () => {
      const retrieved = await getTrades(db, 'acc-nonexistent', '2026-01-01', cryptoKey);
      expect(retrieved).toEqual([]);
    });

    it('overwrites trades when storing same account+date again', async () => {
      const tradesV1 = [makeTrade({ id: 't1', pnl: 100 })];
      const tradesV2 = [makeTrade({ id: 't1', pnl: 200 }), makeTrade({ id: 't3', pnl: 50 })];

      await storeTrades(db, 'acc-1', '2026-04-10', tradesV1, 'hash-1', cryptoKey);
      await storeTrades(db, 'acc-1', '2026-04-10', tradesV2, 'hash-2', cryptoKey);

      const retrieved = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.find((t) => t.id === 't1')?.pnl).toBe(200);
      expect(retrieved.find((t) => t.id === 't3')?.pnl).toBe(50);
    });

    it('keeps trades from different dates separate', async () => {
      const trades1 = [makeTrade({ id: 't1' })];
      const trades2 = [makeTrade({ id: 't2' })];

      await storeTrades(db, 'acc-1', '2026-04-10', trades1, 'hash-a', cryptoKey);
      await storeTrades(db, 'acc-1', '2026-04-11', trades2, 'hash-b', cryptoKey);

      const r1 = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      const r2 = await getTrades(db, 'acc-1', '2026-04-11', cryptoKey);

      expect(r1).toHaveLength(1);
      expect(r1[0].id).toBe('t1');
      expect(r2).toHaveLength(1);
      expect(r2[0].id).toBe('t2');
    });

    it('keeps trades from different accounts separate', async () => {
      const trades1 = [makeTrade({ id: 't1' })];
      const trades2 = [makeTrade({ id: 't2' })];

      await storeTrades(db, 'acc-1', '2026-04-10', trades1, 'hash-a', cryptoKey);
      await storeTrades(db, 'acc-2', '2026-04-10', trades2, 'hash-b', cryptoKey);

      const r1 = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      const r2 = await getTrades(db, 'acc-2', '2026-04-10', cryptoKey);

      expect(r1).toHaveLength(1);
      expect(r1[0].id).toBe('t1');
      expect(r2).toHaveLength(1);
      expect(r2[0].id).toBe('t2');
    });

    it('preserves full trade object structure', async () => {
      const trade = makeTrade({
        id: 'full-trade',
        symbol: 'TSLA',
        direction: 'SHORT',
        notes: 'Test note',
        tags: ['reversal', 'earnings'],
        mistakes: ['FOMO'],
      });

      await storeTrades(db, 'acc-1', '2026-04-10', [trade], 'hash-full', cryptoKey);
      const [retrieved] = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);

      expect(retrieved).toEqual(trade);
    });
  });

  describe('getSyncKeys', () => {
    it('returns trade hashes for stored dates', async () => {
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade()], 'hash-10', cryptoKey);
      await storeTrades(db, 'acc-1', '2026-04-11', [makeTrade()], 'hash-11', cryptoKey);

      const hashes = await getSyncKeys(db, 'acc-1', ['2026-04-10', '2026-04-11', '2026-04-12']);

      expect(hashes.size).toBe(2);
      expect(hashes.get('2026-04-10')).toBe('hash-10');
      expect(hashes.get('2026-04-11')).toBe('hash-11');
      expect(hashes.has('2026-04-12')).toBe(false);
    });

    it('returns empty map for empty dates array', async () => {
      const hashes = await getSyncKeys(db, 'acc-1', []);
      expect(hashes.size).toBe(0);
    });

    it('does not mix accounts', async () => {
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade()], 'hash-acc1', cryptoKey);
      await storeTrades(db, 'acc-2', '2026-04-10', [makeTrade()], 'hash-acc2', cryptoKey);

      const hashes1 = await getSyncKeys(db, 'acc-1', ['2026-04-10']);
      const hashes2 = await getSyncKeys(db, 'acc-2', ['2026-04-10']);

      expect(hashes1.get('2026-04-10')).toBe('hash-acc1');
      expect(hashes2.get('2026-04-10')).toBe('hash-acc2');
    });
  });

  describe('evictOldDays', () => {
    it('removes oldest days when count exceeds maxDays', async () => {
      // Store 5 days with maxDays=3 => oldest 2 should be evicted
      for (let i = 1; i <= 5; i++) {
        const date = `2026-04-${String(i).padStart(2, '0')}`;
        await storeTrades(db, 'acc-1', date, [makeTrade({ id: `t${i}` })], `hash-${i}`, cryptoKey);
      }

      await evictOldDays(db, 'acc-1', 3);

      const hashes = await getSyncKeys(db, 'acc-1', [
        '2026-04-01',
        '2026-04-02',
        '2026-04-03',
        '2026-04-04',
        '2026-04-05',
      ]);

      // Oldest 2 days evicted
      expect(hashes.has('2026-04-01')).toBe(false);
      expect(hashes.has('2026-04-02')).toBe(false);
      // Newest 3 remain
      expect(hashes.has('2026-04-03')).toBe(true);
      expect(hashes.has('2026-04-04')).toBe(true);
      expect(hashes.has('2026-04-05')).toBe(true);
    });

    it('does nothing when count is within maxDays', async () => {
      await storeTrades(db, 'acc-1', '2026-04-01', [makeTrade()], 'h1', cryptoKey);
      await storeTrades(db, 'acc-1', '2026-04-02', [makeTrade()], 'h2', cryptoKey);

      await evictOldDays(db, 'acc-1', 10);

      const hashes = await getSyncKeys(db, 'acc-1', ['2026-04-01', '2026-04-02']);
      expect(hashes.size).toBe(2);
    });
  });

  describe('getAllSyncKeysForAccount', () => {
    it('returns all day hashes for an account', async () => {
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade({ id: 't1' })], 'hash-10', cryptoKey);
      await storeTrades(db, 'acc-1', '2026-04-11', [makeTrade({ id: 't2' })], 'hash-11', cryptoKey);
      await storeTrades(db, 'acc-2', '2026-04-10', [makeTrade({ id: 't3' })], 'hash-other', cryptoKey);

      const map = await getAllSyncKeysForAccount(db, 'acc-1');

      expect(map.size).toBe(2);
      expect(map.get('2026-04-10')).toBe('hash-10');
      expect(map.get('2026-04-11')).toBe('hash-11');
    });

    it('returns empty map for account with no sync keys', async () => {
      const map = await getAllSyncKeysForAccount(db, 'acc-nonexistent');
      expect(map.size).toBe(0);
    });
  });

  describe('storeTradesOnly', () => {
    it('stores trades without writing sync keys', async () => {
      const trades = [
        makeTrade({ id: 't1', pnl: 100 }),
        makeTrade({ id: 't2', pnl: -50 }),
      ];

      await storeTradesOnly(db, 'acc-1', '2026-04-10', trades, cryptoKey);

      // Trades should be retrievable
      const retrieved = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map((t) => t.id).sort()).toEqual(['t1', 't2']);

      // But sync keys should NOT be written
      const syncKeys = await getSyncKeys(db, 'acc-1', ['2026-04-10']);
      expect(syncKeys.size).toBe(0);
    });

    it('overwrites existing trades for same account+date', async () => {
      const tradesV1 = [makeTrade({ id: 't1', pnl: 100 })];
      const tradesV2 = [makeTrade({ id: 't1', pnl: 200 }), makeTrade({ id: 't3', pnl: 50 })];

      await storeTradesOnly(db, 'acc-1', '2026-04-10', tradesV1, cryptoKey);
      await storeTradesOnly(db, 'acc-1', '2026-04-10', tradesV2, cryptoKey);

      const retrieved = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.find((t) => t.id === 't1')?.pnl).toBe(200);
      expect(retrieved.find((t) => t.id === 't3')?.pnl).toBe(50);
    });

    it('does not affect trades from other dates', async () => {
      await storeTradesOnly(db, 'acc-1', '2026-04-10', [makeTrade({ id: 't1' })], cryptoKey);
      await storeTradesOnly(db, 'acc-1', '2026-04-11', [makeTrade({ id: 't2' })], cryptoKey);

      const r1 = await getTrades(db, 'acc-1', '2026-04-10', cryptoKey);
      const r2 = await getTrades(db, 'acc-1', '2026-04-11', cryptoKey);

      expect(r1).toHaveLength(1);
      expect(r1[0].id).toBe('t1');
      expect(r2).toHaveLength(1);
      expect(r2[0].id).toBe('t2');
    });

    it('does not affect existing sync keys from storeTrades', async () => {
      // First store with storeTrades (writes sync key)
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade({ id: 't1' })], 'hash-1', cryptoKey);

      // Then store with storeTradesOnly (should not touch sync key)
      await storeTradesOnly(db, 'acc-1', '2026-04-10', [makeTrade({ id: 't2' })], cryptoKey);

      // Sync key should still be the original
      const syncKeys = await getSyncKeys(db, 'acc-1', ['2026-04-10']);
      expect(syncKeys.get('2026-04-10')).toBe('hash-1');
    });
  });

  describe('clearDatabase', () => {
    it('deletes the entire database', async () => {
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade()], 'hash-1', cryptoKey);
      db.close();

      await clearDatabase(userId);

      // Re-open should create a fresh DB with no data
      const freshDb = await openDatabase(userId);
      const retrieved = await getTrades(freshDb, 'acc-1', '2026-04-10', cryptoKey);
      expect(retrieved).toEqual([]);
      freshDb.close();
      await clearDatabase(userId);
    });
  });
});
