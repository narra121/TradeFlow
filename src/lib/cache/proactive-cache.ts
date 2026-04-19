import type { Trade } from '@/types/trade';
import { deriveKey } from './crypto';
import { openDatabase, storeTradesOnly } from './trade-cache';

function getUserIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).sub ?? null;
  } catch { return null; }
}

function groupByAccountDate(trades: Trade[]): Map<string, Trade[]> {
  const map = new Map<string, Trade[]>();
  for (const trade of trades) {
    const accountId = trade.accountId || 'unknown';
    const date = (trade.exitDate || trade.entryDate || '').slice(0, 10);
    if (!date) continue;
    const key = `${accountId}#${date}`;
    const arr = map.get(key) || [];
    arr.push(trade);
    map.set(key, arr);
  }
  return map;
}

export async function backgroundCacheStoreTrades(trades: Trade[]): Promise<void> {
  const userId = getUserIdFromToken();
  if (!userId || trades.length === 0) return;
  const db = await openDatabase(userId);
  const cryptoKey = await deriveKey(userId);
  try {
    const groups = groupByAccountDate(trades);
    for (const [key, dayTrades] of groups) {
      const [accountId, date] = key.split('#', 2);
      await storeTradesOnly(db, accountId, date, dayTrades, cryptoKey);
    }
  } finally {
    db.close();
  }
}

export async function backgroundCacheDeleteTrades(tradeIds: string[]): Promise<void> {
  const userId = getUserIdFromToken();
  if (!userId || tradeIds.length === 0) return;
  const db = await openDatabase(userId);
  try {
    const idSet = new Set(tradeIds);
    const tx = db.transaction('trades', 'readwrite');
    const store = tx.objectStore('trades');
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        if (idSet.has(cursor.value.tradeId)) cursor.delete();
        cursor.continue();
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
