import { useCallback, useEffect, useRef, useState } from 'react';
import { useSendInsightFeedbackMutation } from '@/store/api/insightsApi';
import { openTrialExpired } from '@/components/billing/readOnly';
import { useEntitlements } from '@/hooks/useEntitlements';
import type { FindingKey, Insight } from '@/types/insights';

/** How long a finding marked Not useful can be taken back before the answer is sent. */
export const UNDO_MS = 6000;

export interface FindingAnswer {
  useful: boolean;
  /** pending: Not useful, still inside the undo window; sending: on its way; saved: stored by the server */
  phase: 'pending' | 'sending' | 'saved';
}

/**
 * Useful / Not useful per finding key of one insight. Useful is sent at once. Not useful hides the finding at once but is
 * sent only after UNDO_MS (or when the report is left), so Undo needs no request; a failed send puts the finding back.
 */
export function useFindingFeedback(insight: Insight) {
  const [send] = useSendInsightFeedbackMutation();
  const { readOnly } = useEntitlements();
  const [local, setLocal] = useState<Record<FindingKey, FindingAnswer | null>>({});
  const [error, setError] = useState<{ key: FindingKey; message: string } | null>(null);
  const timers = useRef(new Map<FindingKey, ReturnType<typeof setTimeout>>());
  const id = insight.id;

  const answerOf = useCallback(
    (key: FindingKey): FindingAnswer | null => {
      if (key in local) return local[key];
      const stored = insight.feedback?.[key];
      return stored === undefined ? null : { useful: stored, phase: 'saved' };
    },
    [local, insight.feedback],
  );

  const transmit = useCallback(
    async (key: FindingKey, useful: boolean, before: FindingAnswer | null) => {
      setLocal((s) => ({ ...s, [key]: { useful, phase: 'sending' } }));
      try {
        await send({ id, key, useful }).unwrap();
        setLocal((s) => ({ ...s, [key]: { useful, phase: 'saved' } }));
      } catch {
        setLocal((s) => ({ ...s, [key]: before }));
        setError({ key, message: useful ? 'Couldn’t save your answer. Try again.' : 'Couldn’t hide this finding, so it is shown again. Try again.' });
      }
    },
    [id, send],
  );

  const answer = useCallback(
    (key: FindingKey, useful: boolean) => {
      if (readOnly) return openTrialExpired();
      const before = answerOf(key);
      setError(null);
      if (useful) {
        void transmit(key, true, before);
        return;
      }
      setLocal((s) => ({ ...s, [key]: { useful: false, phase: 'pending' } }));
      clearTimeout(timers.current.get(key));
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          void transmit(key, false, before);
        }, UNDO_MS),
      );
    },
    [answerOf, transmit, readOnly],
  );

  /** Inside the undo window nothing was sent: the earlier answer comes back. After it, Show again sends Useful (lifts the mute). */
  const undo = useCallback(
    (key: FindingKey) => {
      const timer = timers.current.get(key);
      setError(null);
      if (timer !== undefined) {
        clearTimeout(timer);
        timers.current.delete(key);
        setLocal((s) => {
          const next = { ...s };
          delete next[key];
          return next;
        });
        return;
      }
      if (readOnly) return openTrialExpired();
      void transmit(key, true, answerOf(key));
    },
    [answerOf, transmit, readOnly],
  );

  // Leaving the report sends the answers still inside their undo window.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [key, timer] of pending) {
        clearTimeout(timer);
        void send({ id, key, useful: false });
      }
      pending.clear();
    };
  }, [id, send]);

  return { answerOf, answer, undo, error };
}
