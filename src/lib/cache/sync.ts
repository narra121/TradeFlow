import type { Trade } from '@/types/trade';
import { deriveKey } from './crypto';
import {
  openDatabase,
  storeTrades,
  getTrades,
  getSyncKeys,
  evictOldDays,
} from './trade-cache';
import apiClient from '@/lib/api/api';

/**
 * Generate an array of date strings (YYYY-MM-DD) between start and end (inclusive).
 */
function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Fetch trades for a specific account and date range from the server.
 * Uses the existing apiClient (Axios instance with auth interceptors).
 */
async function fetchTradesFromServer(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<Trade[]> {
  const response = await apiClient.get('/trades', {
    params: { accountId, startDate, endDate },
  });
  // apiClient response interceptor unwraps the envelope, so response is data directly
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'trades' in response) {
    return (response as any).trades;
  }
  return [];
}

/**
 * Group trades by their exit date (YYYY-MM-DD).
 */
function groupByDate(trades: Trade[]): Map<string, Trade[]> {
  const map = new Map<string, Trade[]>();
  for (const trade of trades) {
    // Use exitDate (closeDate) for grouping, fall back to entryDate
    const dateStr = (trade.exitDate || trade.entryDate || '').slice(0, 10);
    if (!dateStr) continue;
    const existing = map.get(dateStr) || [];
    existing.push(trade);
    map.set(dateStr, existing);
  }
  return map;
}

/**
 * Sync trades between local IndexedDB cache and server.
 *
 * Compares local tradeHashes against server-provided hashes for each day.
 * Only fetches from server when hashes differ or local cache is missing.
 * Deletes local data when server has no record for a day.
 *
 * @param userId - Current user ID (for per-user DB isolation)
 * @param accountId - Trading account to sync
 * @param startDate - Start of range (YYYY-MM-DD)
 * @param endDate - End of range (YYYY-MM-DD)
 * @param serverHashes - Map of "date" -> tradeHash from get-stats response
 * @returns Merged array of all trades in the date range
 */
export async function syncTrades(
  userId: string,
  accountId: string,
  startDate: string,
  endDate: string,
  serverHashes: Record<string, string>
): Promise<Trade[]> {
  const db = await openDatabase(userId);
  const cryptoKey = await deriveKey(userId);

  try {
    const dates = dateRange(startDate, endDate);
    const localHashes = await getSyncKeys(db, accountId, dates);

    const staleDates: string[] = [];
    const deleteDates: string[] = [];
    const freshDates: string[] = [];

    for (const date of dates) {
      const serverHash = serverHashes[date];
      const localHash = localHashes.get(date);

      if (!serverHash) {
        // Server has no data for this day - delete local if present
        if (localHash) {
          deleteDates.push(date);
        }
        // No trades for this day either way, skip
      } else if (localHash === serverHash) {
        // Hashes match, use cached data
        freshDates.push(date);
      } else {
        // Hash mismatch or missing local - fetch from server
        staleDates.push(date);
      }
    }

    // Read fresh trades from cache
    const allTrades: Trade[] = [];

    const cachedResults = await Promise.all(
      freshDates.map((date) => getTrades(db, accountId, date, cryptoKey))
    );
    for (const trades of cachedResults) {
      allTrades.push(...trades);
    }

    // Fetch stale dates from server (batch into contiguous ranges for efficiency)
    if (staleDates.length > 0) {
      // Sort stale dates
      staleDates.sort();

      // Fetch all stale trades at once (single request covering full range)
      const fetchedTrades = await fetchTradesFromServer(
        accountId,
        staleDates[0],
        staleDates[staleDates.length - 1]
      );

      const grouped = groupByDate(fetchedTrades);

      // Store each stale day in the cache
      for (const date of staleDates) {
        const dayTrades = grouped.get(date) || [];
        const hash = serverHashes[date];
        if (hash) {
          await storeTrades(db, accountId, date, dayTrades, hash, cryptoKey);
        }
        allTrades.push(...dayTrades);
      }
    }

    // Delete local data for days the server no longer has
    if (deleteDates.length > 0) {
      const tx = db.transaction(['trades', 'sync-keys'], 'readwrite');
      const tradesStore = tx.objectStore('trades');
      const syncStore = tx.objectStore('sync-keys');

      for (const date of deleteDates) {
        syncStore.delete([accountId, date]);
        // Delete trades by cursor (compound key match)
        const cursorReq = tradesStore.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const key = cursor.key as [string, string, string];
            if (key[0] === accountId && key[1] === date) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    // Evict old days beyond 365-day limit
    await evictOldDays(db, accountId);

    return allTrades;
  } finally {
    db.close();
  }
}
