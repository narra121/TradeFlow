import { useState, useEffect, useCallback, useRef } from 'react';
import type { Trade } from '@/types/trade';
import { useGetStatsQuery } from '@/store/api';
import { syncTrades } from '@/lib/cache/sync';

interface UseTradeCacheParams {
  accountId: string;
  startDate: string;
  endDate: string;
}

interface UseTradeCacheResult {
  trades: Trade[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Parse the userId (sub claim) from the Cognito JWT stored in localStorage.
 */
function getUserIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('idToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract per-account daily hashes from the combined dailyTradeHashes map.
 *
 * The stats response returns hashes keyed as "accountId#date".
 * When accountId is "ALL", we return all hashes grouped by account.
 * Otherwise, we filter to the specific account and strip the prefix.
 */
function extractAccountHashes(
  dailyTradeHashes: Record<string, string> | undefined,
  accountId: string,
): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>();
  if (!dailyTradeHashes) return result;

  for (const [key, hash] of Object.entries(dailyTradeHashes)) {
    const separatorIdx = key.indexOf('#');
    if (separatorIdx === -1) continue;

    const accId = key.slice(0, separatorIdx);
    const date = key.slice(separatorIdx + 1);

    if (accountId !== 'ALL' && accId !== accountId) continue;

    const existing = result.get(accId) ?? {};
    existing[date] = hash;
    result.set(accId, existing);
  }

  return result;
}

/**
 * Hook that orchestrates IndexedDB cache sync for the AI Insights page.
 *
 * Uses the stats endpoint (which returns dailyTradeHashes) to determine
 * which days are stale, then calls syncTrades to fetch only the changed data.
 */
export function useTradeCache({
  accountId,
  startDate,
  endDate,
}: UseTradeCacheParams): UseTradeCacheResult {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track refresh trigger
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Abort controller ref for cleanup
  const abortRef = useRef(false);

  const { data: statsData, isLoading: statsLoading } = useGetStatsQuery({
    accountId: accountId === 'ALL' ? undefined : accountId,
    startDate,
    endDate,
  });

  const dailyTradeHashes = (statsData as any)?.dailyTradeHashes as
    | Record<string, string>
    | undefined;

  // Run sync when stats data arrives or refresh is triggered
  useEffect(() => {
    const userId = getUserIdFromToken();
    if (!userId || !dailyTradeHashes || statsLoading) return;

    abortRef.current = false;
    setSyncing(true);
    setError(null);

    const accountHashes = extractAccountHashes(dailyTradeHashes, accountId);

    // If no accounts have hashes, nothing to sync
    if (accountHashes.size === 0) {
      setTrades([]);
      setSyncing(false);
      return;
    }

    const doSync = async () => {
      try {
        const allTrades: Trade[] = [];

        // Sync each account's trades
        const syncPromises = Array.from(accountHashes.entries()).map(
          async ([accId, hashes]) => {
            const result = await syncTrades(
              userId,
              accId,
              startDate,
              endDate,
              hashes,
            );
            return result;
          },
        );

        const results = await Promise.all(syncPromises);
        for (const result of results) {
          allTrades.push(...result);
        }

        if (!abortRef.current) {
          setTrades(allTrades);
          setSyncing(false);
        }
      } catch (err) {
        if (!abortRef.current) {
          setError(
            err instanceof Error ? err.message : 'Failed to sync trades',
          );
          setSyncing(false);
        }
      }
    };

    doSync();

    return () => {
      abortRef.current = true;
    };
  }, [dailyTradeHashes, statsLoading, accountId, startDate, endDate, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  const loading = statsLoading || syncing;

  return { trades, loading, syncing, error, refresh };
}
