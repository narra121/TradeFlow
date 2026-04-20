import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import type { InsightsResponse } from '@/types/insights';
import { generateInsightFn } from '@/lib/firebase/functions';
import { listenToInsight, getInsightOnce, type FirestoreInsight } from '@/lib/firebase/firestore';
import { app } from '@/lib/firebase/init';
import { parseFirebaseError } from '@/lib/firebase/errors';
import type { TrimmedTradesData } from './useTrimmedTrades';

interface UseFirebaseReportResult {
  data: Partial<InsightsResponse> | null;
  streaming: boolean;
  error: string | null;
  cacheChecked: boolean;
  cacheHit: boolean;
  isStale: boolean;
  cachedInsightId: string | null;
  checkCache: (trimmedData: TrimmedTradesData, accountId?: string, period?: string) => void;
  generate: (trimmedData: TrimmedTradesData, accountId?: string, period?: string) => void;
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
  const [cacheChecked, setCacheChecked] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [cachedInsightId, setCachedInsightId] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const previousDataRef = useRef<Partial<InsightsResponse> | null>(null);

  const abort = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { unsubRef.current?.(); }, []);

  const checkCache = useCallback((trimmedData: TrimmedTradesData, accountId = 'ALL', period = 'thisMonth') => {
    unsubRef.current?.();
    unsubRef.current = null;
    setCacheChecked(false);
    setCacheHit(false);
    setIsStale(false);
    setCachedInsightId(null);
    setError(null);

    const run = async () => {
      try {
        const auth = getAuth(app);
        const userId = auth.currentUser?.uid;
        if (!userId) {
          setCacheChecked(true);
          setCacheHit(false);
          return;
        }

        const { hash: tradesHash } = trimmedData;
        const insightId = `${accountId}_${period}`;

        const existing = await getInsightOnce(userId, insightId);

        if (existing && existing.status === 'complete' && existing.tradesHash === tradesHash) {
          const mapped = mapInsightToResponse(existing);
          previousDataRef.current = mapped;
          setData(mapped);
          setCacheHit(true);
          setIsStale(false);
          setCachedInsightId(insightId);
          setCacheChecked(true);
        } else if (existing && existing.status === 'complete' && existing.tradesHash !== tradesHash) {
          const mapped = mapInsightToResponse(existing);
          previousDataRef.current = mapped;
          setData(mapped);
          setCacheHit(true);
          setIsStale(true);
          setCachedInsightId(insightId);
          setCacheChecked(true);
        } else if (existing && existing.status === 'generating') {
          setStreaming(true);
          setCacheChecked(true);
          setCacheHit(false);
          setCachedInsightId(insightId);
          const unsub = listenToInsight(userId, insightId, (insight) => {
            if (!insight) return;
            const mapped = mapInsightToResponse(insight);
            if (Object.keys(mapped).length > 0) setData(mapped);
            if (insight.status === 'complete') {
              setStreaming(false);
              setCacheHit(true);
              setIsStale(false);
            }
            if (insight.status === 'error') {
              setError(insight.error || 'Generation failed');
              setStreaming(false);
            }
          }, (err) => {
            setError(err.message);
            setStreaming(false);
          });
          unsubRef.current = unsub;
        } else {
          setData(null);
          setCacheHit(false);
          setCacheChecked(true);
        }
      } catch {
        setData(null);
        setCacheHit(false);
        setCacheChecked(true);
      }
    };

    run();
  }, []);

  const generate = useCallback((trimmedData: TrimmedTradesData, accountId = 'ALL', period = 'thisMonth') => {
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

        const { trimmed, hash: tradesHash } = trimmedData;
        const insightId = `${accountId}_${period}`;

        await generateInsightFn({ trades: trimmed, accountId, period, tradesHash });

        // Listen to Firestore for progressive updates
        const unsub = listenToInsight(userId, insightId, (insight) => {
          if (!insight) return;
          const mapped = mapInsightToResponse(insight);
          if (Object.keys(mapped).length > 0) setData(mapped);
          if (insight.status === 'complete') {
            previousDataRef.current = mapped;
            setStreaming(false);
          }
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
        setError(parseFirebaseError(err, 'Report generation failed'));
        setStreaming(false);
      }
    };

    run();
  }, []);

  return { data, streaming, error, cacheChecked, cacheHit, isStale, cachedInsightId, checkCache, generate, abort };
}
