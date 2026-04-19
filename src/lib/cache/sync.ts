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

interface SyncResponse {
  serverHashes: Record<string, string>;
  staleDays: string[];
  trades: Trade[];
}

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

function groupByDate(trades: Trade[]): Map<string, Trade[]> {
  const map = new Map<string, Trade[]>();
  for (const trade of trades) {
    const dateStr = (trade.exitDate || trade.entryDate || '').slice(0, 10);
    if (!dateStr) {
      console.warn('Trade missing date, skipping cache storage:', trade.id);
      continue;
    }
    const existing = map.get(dateStr) || [];
    existing.push(trade);
    map.set(dateStr, existing);
  }
  return map;
}

export async function syncTrades(
  userId: string,
  accountId: string,
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<Trade[]> {
  const db = await openDatabase(userId);
  const cryptoKey = await deriveKey(userId);

  try {
    const localHashMap = await getAllSyncKeysForAccount(db, accountId);
    const clientHashes: Record<string, string> = {};
    for (const [date, hash] of localHashMap) {
      clientHashes[date] = hash;
    }

    const response = await apiClient.post('/trades/sync', {
      accountId, startDate, endDate, clientHashes,
    });
    const { serverHashes, staleDays, trades: staleTrades } = response as SyncResponse;

    if (staleDays.length > 0) {
      const grouped = groupByDate(staleTrades);
      for (const day of staleDays) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const dayTrades = grouped.get(day) || [];
        const hash = serverHashes[day] ?? '';
        await storeTrades(db, accountId, day, dayTrades, hash, cryptoKey);
      }
    }

    const dates = dateRange(startDate, endDate);
    const allTrades: Trade[] = [];
    for (const date of dates) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const dayTrades = await getTrades(db, accountId, date, cryptoKey);
      allTrades.push(...dayTrades);
    }

    await evictOldDays(db, accountId);
    return allTrades;
  } finally {
    db.close();
  }
}
