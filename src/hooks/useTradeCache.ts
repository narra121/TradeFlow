import { useState, useEffect, useCallback, useRef } from 'react';
import type { Trade } from '@/types/trade';
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
 * Hook that orchestrates IndexedDB cache sync for the AI Insights page.
 *
 * Uses direct day-level hash comparison: fetches server day hashes and
 * compares against local IndexedDB hashes, then only fetches stale days.
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

  // Run sync directly — no stats dependency needed
  useEffect(() => {
    const userId = getUserIdFromToken();
    if (!userId) return;

    abortRef.current = false;
    setSyncing(true);
    setError(null);

    const doSync = async () => {
      try {
        const result = await syncTrades(
          userId,
          accountId,
          startDate,
          endDate,
        );

        if (!abortRef.current) {
          setTrades(result);
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
  }, [accountId, startDate, endDate, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  const loading = syncing;

  return { trades, loading, syncing, error, refresh };
}
