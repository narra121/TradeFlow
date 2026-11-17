import { useState } from 'react';
import { readApiError } from '@/lib/apiError';
import { isPlanRefusal } from '@/lib/planErrors';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Runs a save; `onError` puts the control back and `reason` holds the API's message for the failure (empty when it gave
 * none). A save the plan refused is put back silently: the upgrade dialog reports it.
 */
export function useSaveState() {
  const [state, setState] = useState<SaveState>('idle');
  const [reason, setReason] = useState('');
  const run = async (fn: () => Promise<unknown>, onError?: () => void) => {
    setState('saving');
    try {
      await fn();
      setState('saved');
    } catch (err) {
      onError?.();
      if (isPlanRefusal(err)) return setState('idle');
      setReason(readApiError(err, '').message);
      setState('error');
    }
  };
  return { state, reason, run };
}
