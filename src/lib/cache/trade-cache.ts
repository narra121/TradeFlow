import type { Trade } from '@/types/trade';
import { encrypt, decrypt } from './crypto';

const DB_VERSION = 2;
const TRADES_STORE = 'trades';
const SYNC_KEYS_STORE = 'sync-keys';
const MONTH_HASHES_STORE = 'month-hashes';

function dbName(userId: string): string {
  return `tradequt-cache-${userId}`;
}

/**
 * Open (or create) the per-user IndexedDB database.
 */
export function openDatabase(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName(userId), DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRADES_STORE)) {
        db.createObjectStore(TRADES_STORE, {
          keyPath: ['accountId', 'date', 'tradeId'],
        });
      }
      if (!db.objectStoreNames.contains(SYNC_KEYS_STORE)) {
        db.createObjectStore(SYNC_KEYS_STORE, {
          keyPath: ['accountId', 'date'],
        });
      }
      if (!db.objectStoreNames.contains(MONTH_HASHES_STORE)) {
        db.createObjectStore(MONTH_HASHES_STORE, {
          keyPath: ['accountId', 'month'],
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store an array of trades for a given account + date.
 * Each trade is individually encrypted. The sync-keys store is updated
 * with the provided tradeHash and current timestamp.
 */
export async function storeTrades(
  db: IDBDatabase,
  accountId: string,
  date: string,
  trades: Trade[],
  tradeHash: string,
  cryptoKey: CryptoKey
): Promise<void> {
  // Encrypt all trades in parallel
  const encrypted = await Promise.all(
    trades.map(async (trade) => ({
      accountId,
      date,
      tradeId: trade.id,
      data: await encrypt(cryptoKey, trade),
    }))
  );

  return new Promise((resolve, reject) => {
    const tx = db.transaction([TRADES_STORE, SYNC_KEYS_STORE], 'readwrite');
    const tradesStore = tx.objectStore(TRADES_STORE);
    const syncStore = tx.objectStore(SYNC_KEYS_STORE);

    // Clear existing trades for this account+date first, then write new ones
    // Use a cursor to delete matching records
    const cursorReq = tradesStore.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const key = cursor.key as [string, string, string];
        if (key[0] === accountId && key[1] === date) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        // All old records deleted, now insert new ones
        for (const record of encrypted) {
          tradesStore.put(record);
        }

        // Update sync key
        syncStore.put({
          accountId,
          date,
          tradeHash,
          fetchedAt: new Date().toISOString(),
        });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve and decrypt all trades for a given account + date.
 */
export async function getTrades(
  db: IDBDatabase,
  accountId: string,
  date: string,
  cryptoKey: CryptoKey
): Promise<Trade[]> {
  const records = await new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(TRADES_STORE, 'readonly');
    const store = tx.objectStore(TRADES_STORE);
    const results: any[] = [];

    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const key = cursor.key as [string, string, string];
        if (key[0] === accountId && key[1] === date) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });

  // Decrypt in parallel
  const trades = await Promise.all(
    records.map((r) => decrypt(cryptoKey, r.data) as Promise<Trade>)
  );
  return trades;
}

/**
 * Get sync keys (tradeHash values) for an account across multiple dates.
 * Returns a Map of date -> tradeHash.
 */
export function getSyncKeys(
  db: IDBDatabase,
  accountId: string,
  dates: string[]
): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_KEYS_STORE, 'readonly');
    const store = tx.objectStore(SYNC_KEYS_STORE);
    const map = new Map<string, string>();
    let pending = dates.length;

    if (pending === 0) {
      resolve(map);
      return;
    }

    for (const date of dates) {
      const req = store.get([accountId, date]);
      req.onsuccess = () => {
        if (req.result?.tradeHash) {
          map.set(date, req.result.tradeHash);
        }
        pending--;
        if (pending === 0) resolve(map);
      };
      req.onerror = () => {
        pending--;
        if (pending === 0) resolve(map);
      };
    }

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Evict the oldest cached days beyond maxDays for a given account.
 */
export function evictOldDays(
  db: IDBDatabase,
  accountId: string,
  maxDays = 365
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SYNC_KEYS_STORE, TRADES_STORE], 'readwrite');
    const syncStore = tx.objectStore(SYNC_KEYS_STORE);
    const tradesStore = tx.objectStore(TRADES_STORE);

    // Collect all dates for this account from sync-keys
    const dates: string[] = [];
    const cursorReq = syncStore.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const key = cursor.key as [string, string];
        if (key[0] === accountId) {
          dates.push(key[1]);
        }
        cursor.continue();
      } else {
        // Sort dates ascending (oldest first)
        dates.sort();

        if (dates.length <= maxDays) {
          resolve();
          return;
        }

        const toEvict = dates.slice(0, dates.length - maxDays);
        for (const date of toEvict) {
          // Delete sync key
          syncStore.delete([accountId, date]);

          // Delete all trades for this account+date
          const tradeCursor = tradesStore.openCursor();
          tradeCursor.onsuccess = () => {
            const tc = tradeCursor.result;
            if (tc) {
              const tKey = tc.key as [string, string, string];
              if (tKey[0] === accountId && tKey[1] === date) {
                tc.delete();
              }
              tc.continue();
            }
          };
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Read month hashes for an account across multiple months.
 * Returns a Map of month -> monthHash.
 */
export function getMonthHashes(
  db: IDBDatabase,
  accountId: string,
  months: string[]
): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MONTH_HASHES_STORE, 'readonly');
    const store = tx.objectStore(MONTH_HASHES_STORE);
    const map = new Map<string, string>();
    let pending = months.length;
    if (pending === 0) { resolve(map); return; }
    for (const month of months) {
      const req = store.get([accountId, month]);
      req.onsuccess = () => {
        if (req.result?.monthHash) map.set(month, req.result.monthHash);
        if (--pending === 0) resolve(map);
      };
      req.onerror = () => { if (--pending === 0) resolve(map); };
    }
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Write a month hash for a given account + month.
 */
export function putMonthHash(
  db: IDBDatabase,
  accountId: string,
  month: string,
  monthHash: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MONTH_HASHES_STORE, 'readwrite');
    tx.objectStore(MONTH_HASHES_STORE).put({ accountId, month, monthHash });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all day hashes (sync keys) for an account.
 * Returns a Map of date -> tradeHash.
 */
export function getAllSyncKeysForAccount(
  db: IDBDatabase,
  accountId: string
): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_KEYS_STORE, 'readonly');
    const store = tx.objectStore(SYNC_KEYS_STORE);
    const map = new Map<string, string>();
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const key = cursor.key as [string, string];
        if (key[0] === accountId && cursor.value?.tradeHash) {
          map.set(key[1], cursor.value.tradeHash);
        }
        cursor.continue();
      } else {
        resolve(map);
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

/**
 * Store trades WITHOUT updating sync-keys (for proactive caching).
 * Unlike storeTrades, this only writes to the trades store.
 */
export async function storeTradesOnly(
  db: IDBDatabase,
  accountId: string,
  date: string,
  trades: Trade[],
  cryptoKey: CryptoKey
): Promise<void> {
  const encrypted = await Promise.all(
    trades.map(async (trade) => ({
      accountId,
      date,
      tradeId: trade.id,
      data: await encrypt(cryptoKey, trade),
    }))
  );

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRADES_STORE, 'readwrite');
    const store = tx.objectStore(TRADES_STORE);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const key = cursor.key as [string, string, string];
        if (key[0] === accountId && key[1] === date) cursor.delete();
        cursor.continue();
      } else {
        for (const record of encrypted) store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete the entire per-user database.
 */
export function clearDatabase(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName(userId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
