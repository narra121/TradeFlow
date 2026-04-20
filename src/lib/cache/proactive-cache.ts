import type { Trade } from '@/types/trade';
import { openDatabase, deleteSyncKeys } from './trade-cache';

function getUserIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).sub ?? null;
  } catch { return null; }
}

function getAffectedDays(trades: Trade[]): Array<{ accountId: string; date: string }> {
  const seen = new Set<string>();
  const keys: Array<{ accountId: string; date: string }> = [];
  for (const trade of trades) {
    const accountId = trade.accountId || 'unknown';
    const date = (trade.exitDate || trade.entryDate || '').slice(0, 10);
    if (!date) continue;

    const specificKey = `${accountId}#${date}`;
    if (!seen.has(specificKey)) {
      seen.add(specificKey);
      keys.push({ accountId, date });
    }

    const allKey = `ALL#${date}`;
    if (!seen.has(allKey)) {
      seen.add(allKey);
      keys.push({ accountId: 'ALL', date });
    }
  }
  return keys;
}

export async function backgroundCacheStoreTrades(trades: Trade[]): Promise<void> {
  const userId = getUserIdFromToken();
  if (!userId || trades.length === 0) return;
  const db = await openDatabase(userId);
  try {
    const affected = getAffectedDays(trades);
    await deleteSyncKeys(db, affected);
  } finally {
    db.close();
  }
}

export async function backgroundCacheDeleteTrades(tradeIds: string[]): Promise<void> {
  const userId = getUserIdFromToken();
  if (!userId || tradeIds.length === 0) return;
  const db = await openDatabase(userId);
  try {
    const tx = db.transaction('trades', 'readonly');
    const store = tx.objectStore('trades');
    const affectedDays = new Set<string>();
    const cursorReq = store.openCursor();

    await new Promise<void>((resolve) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const key = cursor.key as [string, string, string];
          if (tradeIds.includes(key[2])) {
            affectedDays.add(`${key[0]}#${key[1]}`);
            affectedDays.add(`ALL#${key[1]}`);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    const keys = Array.from(affectedDays).map(k => {
      const [accountId, date] = k.split('#', 2);
      return { accountId, date };
    });
    await deleteSyncKeys(db, keys);
  } finally {
    db.close();
  }
}
