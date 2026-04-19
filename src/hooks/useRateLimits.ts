import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { listenToRateLimits, type RateLimitData } from '@/lib/firebase/firestore';
import { app } from '@/lib/firebase/init';

interface RateLimitInfo {
  insights: { used: number; limit: number; remaining: number; resetAt: Date | null };
  sessions: { used: number; limit: number; remaining: number; resetAt: Date | null };
}

const WINDOW_HOURS = 6;
const INSIGHT_LIMIT = 6;
const SESSION_LIMIT = 6;

function computeResetAt(windowStart: { toMillis: () => number }): Date | null {
  const resetMs = windowStart.toMillis() + WINDOW_HOURS * 60 * 60 * 1000;
  return new Date(resetMs);
}

/**
 * Hook that listens to Firestore for real-time rate limit data.
 *
 * Subscribes to /users/{userId}/rateLimits/current via onSnapshot.
 * Reacts to Firebase auth state changes — returns null when unauthenticated.
 * Computes remaining quota and reset time from the Firestore document.
 */
export function useRateLimits(): RateLimitInfo | null {
  const [rateLimits, setRateLimits] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    const auth = getAuth(app);
    let unsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      unsub?.();
      unsub = null;

      if (!user) {
        setRateLimits(null);
        return;
      }

      unsub = listenToRateLimits(user.uid, (data) => {
        if (!data) {
          setRateLimits({
            insights: { used: 0, limit: INSIGHT_LIMIT, remaining: INSIGHT_LIMIT, resetAt: null },
            sessions: { used: 0, limit: SESSION_LIMIT, remaining: SESSION_LIMIT, resetAt: null },
          });
          return;
        }

        const ig = data.insightGenerations;
        const cs = data.chatSessions;
        setRateLimits({
          insights: {
            used: ig?.count ?? 0,
            limit: INSIGHT_LIMIT,
            remaining: Math.max(0, INSIGHT_LIMIT - (ig?.count ?? 0)),
            resetAt: ig ? computeResetAt(ig.windowStart) : null,
          },
          sessions: {
            used: cs?.count ?? 0,
            limit: SESSION_LIMIT,
            remaining: Math.max(0, SESSION_LIMIT - (cs?.count ?? 0)),
            resetAt: cs ? computeResetAt(cs.windowStart) : null,
          },
        });
      });
    });

    return () => {
      authUnsub();
      unsub?.();
    };
  }, []);

  return rateLimits;
}
