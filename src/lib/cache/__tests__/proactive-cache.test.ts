import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Trade } from '@/types/trade';
import { deriveKey } from '../crypto';
import { openDatabase, storeTrades, getAllSyncKeysForAccount, clearDatabase } from '../trade-cache';

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
    id: 'trade-1', symbol: 'AAPL', direction: 'LONG',
    entryPrice: 150, exitPrice: 155, stopLoss: 148, takeProfit: 160,
    size: 100, entryDate: '2026-04-10T09:30:00Z', exitDate: '2026-04-10T15:00:00Z',
    outcome: 'TP', pnl: 500, riskRewardRatio: 2.5,
    ...overrides,
  };
}

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
    it('invalidates sync-keys for affected account+date pairs', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade()], 'old-hash', cryptoKey);
      db.close();

      await backgroundCacheStoreTrades([
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '2026-04-10T15:00:00Z' }),
      ]);

      const db2 = await openDatabase(userId);
      const keys = await getAllSyncKeysForAccount(db2, 'acc-1');
      expect(keys.size).toBe(0);
      db2.close();
    });

    it('also invalidates ALL account sync-keys', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(db, 'ALL', '2026-04-10', [makeTrade()], 'all-hash', cryptoKey);
      db.close();

      await backgroundCacheStoreTrades([
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '2026-04-10T15:00:00Z' }),
      ]);

      const db2 = await openDatabase(userId);
      const keys = await getAllSyncKeysForAccount(db2, 'ALL');
      expect(keys.size).toBe(0);
      db2.close();
    });

    it('invalidates multiple days across accounts', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade()], 'h1', cryptoKey);
      await storeTrades(db, 'acc-2', '2026-04-11', [makeTrade()], 'h2', cryptoKey);
      await storeTrades(db, 'acc-1', '2026-04-12', [makeTrade()], 'h3', cryptoKey);
      db.close();

      await backgroundCacheStoreTrades([
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '2026-04-10T15:00:00Z' }),
        makeTrade({ id: 't2', accountId: 'acc-2', exitDate: '2026-04-11T15:00:00Z' }),
      ]);

      const db2 = await openDatabase(userId);
      const acc1Keys = await getAllSyncKeysForAccount(db2, 'acc-1');
      const acc2Keys = await getAllSyncKeysForAccount(db2, 'acc-2');
      expect(acc1Keys.has('2026-04-10')).toBe(false);
      expect(acc1Keys.has('2026-04-12')).toBe(true);
      expect(acc2Keys.has('2026-04-11')).toBe(false);
      db2.close();
    });

    it('uses entryDate when exitDate is missing', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(db, 'acc-1', '2026-04-15', [makeTrade()], 'h1', cryptoKey);
      db.close();

      await backgroundCacheStoreTrades([
        makeTrade({ id: 't1', accountId: 'acc-1', exitDate: '', entryDate: '2026-04-15T09:00:00Z' }),
      ]);

      const db2 = await openDatabase(userId);
      const keys = await getAllSyncKeysForAccount(db2, 'acc-1');
      expect(keys.has('2026-04-15')).toBe(false);
      db2.close();
    });

    it('handles empty array gracefully', async () => {
      await expect(backgroundCacheStoreTrades([])).resolves.toBeUndefined();
    });

    it('handles missing userId gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      await expect(backgroundCacheStoreTrades([makeTrade()])).resolves.toBeUndefined();
    });

    it('skips trades with no date', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(db, 'acc-1', '2026-04-10', [makeTrade()], 'h1', cryptoKey);
      db.close();

      await backgroundCacheStoreTrades([
        makeTrade({ id: 't1', accountId: 'acc-1', entryDate: '', exitDate: '' }),
      ]);

      const db2 = await openDatabase(userId);
      const keys = await getAllSyncKeysForAccount(db2, 'acc-1');
      expect(keys.has('2026-04-10')).toBe(true);
      db2.close();
    });
  });

  describe('backgroundCacheDeleteTrades', () => {
    it('invalidates sync-keys for affected days', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(db, 'acc-1', '2026-04-10',
        [makeTrade({ id: 't1' }), makeTrade({ id: 't2' })], 'h1', cryptoKey);
      db.close();

      await backgroundCacheDeleteTrades(['t1']);

      const db2 = await openDatabase(userId);
      const keys = await getAllSyncKeysForAccount(db2, 'acc-1');
      expect(keys.has('2026-04-10')).toBe(false);
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
      await expect(backgroundCacheDeleteTrades(['nonexistent'])).resolves.toBeUndefined();
    });

    it('invalidates sync-keys across multiple accounts and dates', async () => {
      const db = await openDatabase(userId);
      const cryptoKey = await deriveKey(userId);
      await storeTrades(db, 'acc-1', '2026-04-10',
        [makeTrade({ id: 't1' })], 'h1', cryptoKey);
      await storeTrades(db, 'acc-2', '2026-04-11',
        [makeTrade({ id: 't3' })], 'h2', cryptoKey);
      db.close();

      await backgroundCacheDeleteTrades(['t1', 't3']);

      const db2 = await openDatabase(userId);
      const acc1Keys = await getAllSyncKeysForAccount(db2, 'acc-1');
      const acc2Keys = await getAllSyncKeysForAccount(db2, 'acc-2');
      expect(acc1Keys.has('2026-04-10')).toBe(false);
      expect(acc2Keys.has('2026-04-11')).toBe(false);
      db2.close();
    });
  });
});
