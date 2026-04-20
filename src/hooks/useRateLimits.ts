import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { listenToRateLimits } from '@/lib/firebase/firestore';
import { app } from '@/lib/firebase/init';

interface RateLimitInfo {
  insights: { used: number; limit: number; remaining: number; resetAt: Date | null };
  sessions: { used: number; limit: number; remaining: number; resetAt: Date | null };
}

const WINDOW_HOURS = 6;
const INSIGHT_LIMIT = 6;
const SESSION_LIMIT = 6;

function computeBucket(
  window: { count: number; windowStart: { toMillis: () => number } } | undefined,
  limit: number,
): { used: number; limit: number; remaining: number; resetAt: Date | null } {
  if (!window) return { used: 0, limit, remaining: limit, resetAt: null };

  const resetAtMs = window.windowStart.toMillis() + WINDOW_HOURS * 60 * 60 * 1000;
  if (Date.now() >= resetAtMs) {
    return { used: 0, limit, remaining: limit, resetAt: null };
  }

  return {
    used: window.count,
    limit,
    remaining: Math.max(0, limit - window.count),
    resetAt: new Date(resetAtMs),
  };
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

        setRateLimits({
          insights: computeBucket(data.insightGenerations, INSIGHT_LIMIT),
          sessions: computeBucket(data.chatSessions, SESSION_LIMIT),
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
