import { useState } from 'react';
import { readApiError } from '@/lib/apiError';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Runs a save; `onError` puts the control back and `reason` holds the API's message for the failure (empty when it gave none). */
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
      setReason(readApiError(err, '').message);
      setState('error');
    }
  };
  return { state, reason, run };
}
