import type { Trade } from '@/types/trade';
import { deriveKey } from './crypto';
import {
  openDatabase,
  storeTrades,
  getTrades,
  getMonthHashes,
  putMonthHash,
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
 * Get unique YYYY-MM months that fall within a date range.
 */
function getMonthsInRange(startDate: string, endDate: string): string[] {
  const months = new Set<string>();
  const dates = dateRange(startDate, endDate);
  for (const d of dates) months.add(d.slice(0, 7));
  return [...months].sort();
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
 * POST to /trades/verify-hashes with local month + day hashes.
 * Returns diff: which days are stale and updated server hashes.
 * Uses apiClient directly (NOT RTK Query) to avoid stale cache.
 */
async function verifyHashesWithServer(
  accountId: string,
  startDate: string,
  endDate: string,
  clientMonthHashes: Record<string, string>,
  clientDayHashes: Record<string, string>,
): Promise<{
  batchMatch: boolean;
  staleDays: string[];
  serverMonthHashes: Record<string, string>;
  serverDayHashes: Record<string, string>;
}> {
  const response = await apiClient.post('/trades/verify-hashes', {
    accountId,
    startDate,
    endDate,
    clientMonthHashes,
    clientDayHashes,
  });
  return response as any;
}

/**
 * Sync trades between local IndexedDB cache and server using two-level
 * hash verification.
 *
 * Flow:
 * 1. Collect local month hashes + day hashes from IndexedDB
 * 2. POST to /trades/verify-hashes with client hashes
 * 3. If batchMatch=true -> read everything from IndexedDB (no server fetch!)
 * 4. If stale days -> fetch only those days from server
 * 5. Update local month hashes from server response
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
    // 1. Collect local hashes
    const months = getMonthsInRange(startDate, endDate);
    const localMonthHashes = await getMonthHashes(db, accountId, months);
    const allLocalDayHashes = await getAllSyncKeysForAccount(db, accountId);

    // Filter day hashes to the requested range
    const dates = dateRange(startDate, endDate);
    const dateSet = new Set(dates);
    const clientMonthHashes: Record<string, string> = {};
    for (const [month, hash] of localMonthHashes) {
      clientMonthHashes[`${accountId}#${month}`] = hash;
    }
    const clientDayHashes: Record<string, string> = {};
    for (const [date, hash] of allLocalDayHashes) {
      if (dateSet.has(date)) {
        clientDayHashes[`${accountId}#${date}`] = hash;
      }
    }

    // 2. Verify with server (direct POST, no RTK Query cache)
    const result = await verifyHashesWithServer(
      accountId, startDate, endDate, clientMonthHashes, clientDayHashes,
    );

    // 3. If everything matches, read all from IndexedDB
    if (result.batchMatch) {
      const allTrades: Trade[] = [];
      for (const date of dates) {
        const dayTrades = await getTrades(db, accountId, date, cryptoKey);
        allTrades.push(...dayTrades);
      }
      return allTrades;
    }

    // 4. Fetch stale days from server
    const staleDayDates = result.staleDays.map(sk => {
      const idx = sk.indexOf('#');
      return sk.slice(idx + 1);
    }).filter(d => !d.includes('MONTH'));

    if (staleDayDates.length > 0) {
      staleDayDates.sort();
      const fetchedTrades = await fetchTradesFromServer(
        accountId, staleDayDates[0], staleDayDates[staleDayDates.length - 1],
      );
      const grouped = groupByDate(fetchedTrades);

      for (const date of staleDayDates) {
        const dayTrades = grouped.get(date) || [];
        const hash = result.serverDayHashes[`${accountId}#${date}`];
        if (hash) {
          await storeTrades(db, accountId, date, dayTrades, hash, cryptoKey);
        }
      }
    }

    // 5. Update local month hashes from server
    for (const [key, hash] of Object.entries(result.serverMonthHashes)) {
      const idx = key.indexOf('#');
      const month = key.slice(idx + 1);
      await putMonthHash(db, accountId, month, hash);
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
