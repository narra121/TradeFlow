import type { Trade } from '@/types/trade';
import { deriveKey } from './crypto';
import {
  openDatabase,
  storeTrades,
  getTrades,
  getAllSyncKeysForAccount,
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
 * Fetch server day hashes for an account and date range.
 * Returns a map of date (YYYY-MM-DD) -> tradeHash.
 */
async function fetchServerDayHashes(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, string>> {
  const response = await apiClient.get('/trades/day-hashes', {
    params: { accountId, startDate, endDate },
  });
  return (response as any) ?? {};
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
 * Sync trades between local IndexedDB cache and server using direct
 * day-level hash comparison.
 *
 * Flow:
 * 1. Collect local day hashes from IndexedDB
 * 2. Fetch server day hashes
 * 3. Compare day-by-day to find stale days
 * 4. If no stale days -> read all from IndexedDB
 * 5. If stale days -> fetch only those days from server, store in cache
 * 6. Read all trades from cache
 *
 * @param userId - Current user ID (for per-user DB isolation)
 * @param accountId - Trading account to sync
 * @param startDate - Start of range (YYYY-MM-DD)
 * @param endDate - End of range (YYYY-MM-DD)
 * @returns Merged array of all trades in the date range
 */
export async function syncTrades(
  userId: string,
  accountId: string,
  startDate: string,
  endDate: string,
): Promise<Trade[]> {
  const db = await openDatabase(userId);
  const cryptoKey = await deriveKey(userId);

  try {
    const dates = dateRange(startDate, endDate);

    // 1. Collect local day hashes
    const allLocalDayHashes = await getAllSyncKeysForAccount(db, accountId);
    const dateSet = new Set(dates);
    const localDayHashes: Record<string, string> = {};
    for (const [date, hash] of allLocalDayHashes) {
      if (dateSet.has(date)) {
        localDayHashes[date] = hash;
      }
    }

    const hasLocalHashes = Object.keys(localDayHashes).length > 0;

    // No local cache — fetch trades directly
    if (!hasLocalHashes) {
      const fetchedTrades = await fetchTradesFromServer(accountId, startDate, endDate);
      const grouped = groupByDate(fetchedTrades);

      // Also fetch server hashes to store alongside trades
      let serverHashes: Record<string, string> = {};
      try {
        serverHashes = await fetchServerDayHashes(accountId, startDate, endDate);
      } catch {
        // If day-hashes endpoint fails, store with empty hash
      }

      for (const [date, dayTrades] of grouped) {
        const hash = serverHashes[`${accountId}#${date}`] ?? serverHashes[date] ?? '';
        await storeTrades(db, accountId, date, dayTrades, hash, cryptoKey);
      }

      await evictOldDays(db, accountId);
      return fetchedTrades;
    }

    // 2. Fetch server day hashes
    const serverHashesRaw = await fetchServerDayHashes(accountId, startDate, endDate);

    // Normalize server hashes: strip accountId# prefix if present
    const serverDayHashes: Record<string, string> = {};
    for (const [key, hash] of Object.entries(serverHashesRaw)) {
      const idx = key.indexOf('#');
      const date = idx >= 0 ? key.slice(idx + 1) : key;
      if (dateSet.has(date)) {
        serverDayHashes[date] = hash;
      }
    }

    // 3. Compare day-by-day: find days where hashes differ
    const staleDays: string[] = [];
    for (const date of dates) {
      const localHash = localDayHashes[date];
      const serverHash = serverDayHashes[date];
      if (localHash !== serverHash) {
        staleDays.push(date);
      }
    }

    // 4. If everything matches, read all from IndexedDB
    if (staleDays.length === 0) {
      const allTrades: Trade[] = [];
      for (const date of dates) {
        const dayTrades = await getTrades(db, accountId, date, cryptoKey);
        allTrades.push(...dayTrades);
      }
      return allTrades;
    }

    // 5. Fetch stale days from server
    staleDays.sort();
    const fetchedTrades = await fetchTradesFromServer(
      accountId, staleDays[0], staleDays[staleDays.length - 1],
    );
    const grouped = groupByDate(fetchedTrades);

    for (const date of staleDays) {
      const dayTrades = grouped.get(date) || [];
      const hash = serverDayHashes[date] ?? '';
      await storeTrades(db, accountId, date, dayTrades, hash, cryptoKey);
    }

    // 6. Read all trades from cache (now updated)
    const allTrades: Trade[] = [];
    for (const date of dates) {
      const dayTrades = await getTrades(db, accountId, date, cryptoKey);
      allTrades.push(...dayTrades);
    }

    await evictOldDays(db, accountId);
    return allTrades;
  } finally {
    db.close();
  }
}
