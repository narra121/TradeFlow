import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';
import { trimTrades } from '@/lib/firebase/trades';
import { generateInsightFn } from '@/lib/firebase/functions';
import { listenToInsight, type FirestoreInsight } from '@/lib/firebase/firestore';
import { sha256Hex } from '@/lib/cache/hash';
import { app } from '@/lib/firebase/init';

// -------------------------------------------------------------------------
// useFirebaseReport -- structured report generation via Cloud Functions
// -------------------------------------------------------------------------

interface UseFirebaseReportResult {
  data: Partial<InsightsResponse> | null;
  streaming: boolean;
  error: string | null;
  generate: (trades: Trade[], accountId?: string, period?: string) => void;
  abort: () => void;
}

function mapInsightToResponse(insight: FirestoreInsight): Partial<InsightsResponse> {
  const result: Partial<InsightsResponse> = {};
  if (insight.summary) result.summary = insight.summary;
  if (insight.profile) result.profile = insight.profile;
  if (insight.scores) result.scores = insight.scores;
  if (insight.insights) result.insights = insight.insights;
  if (insight.tradeSpotlights) result.tradeSpotlights = insight.tradeSpotlights;
  if (insight.patterns) result.patterns = insight.patterns as InsightsResponse['patterns'];
  return result;
}

/**
 * Hook for generating trading performance reports via Cloud Functions + Firestore.
 *
 * Calls the generateInsight Cloud Function which writes progressively to Firestore.
 * A Firestore listener (onSnapshot) provides real-time updates so the UI can render
 * sections as they arrive.
 */
export function useFirebaseReport(): UseFirebaseReportResult {
  const [data, setData] = useState<Partial<InsightsResponse> | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const abort = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { unsubRef.current?.(); }, []);

  const generate = useCallback((trades: Trade[], accountId = 'ALL', period = 'thisMonth') => {
    // Abort any in-flight request
    unsubRef.current?.();
    unsubRef.current = null;
    setData(null);
    setError(null);
    setStreaming(true);

    const run = async () => {
      try {
        const auth = getAuth(app);
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Not authenticated with Firebase');

        const trimmed = trimTrades(trades);
        const tradesHash = await sha256Hex(JSON.stringify(trimmed));
        const insightId = `${accountId}_${period}`;

        // Call Cloud Function to trigger generation (or return cached)
        await generateInsightFn({ trades: trimmed, accountId, period, tradesHash });

        // Listen to Firestore for progressive updates
        const unsub = listenToInsight(userId, insightId, (insight) => {
          if (!insight) return;
          const mapped = mapInsightToResponse(insight);
          if (Object.keys(mapped).length > 0) setData(mapped);
          if (insight.status === 'complete') setStreaming(false);
          if (insight.status === 'error') {
            setError(insight.error || 'Generation failed');
            setStreaming(false);
          }
        }, (err) => {
          setError(err.message);
          setStreaming(false);
        });

        unsubRef.current = unsub;
      } catch (err: unknown) {
        // Parse Firebase callable error
        if (typeof err === 'object' && err !== null && 'code' in err) {
          const fbErr = err as { code: string; message: string };
          if (fbErr.code === 'functions/resource-exhausted') {
            setError('Rate limit exceeded. Please try again later.');
          } else {
            setError(fbErr.message || 'Report generation failed');
          }
        } else {
          setError(err instanceof Error ? err.message : 'Report generation failed');
        }
        setStreaming(false);
      }
    };

    run();
  }, []);

  return { data, streaming, error, generate, abort };
}
