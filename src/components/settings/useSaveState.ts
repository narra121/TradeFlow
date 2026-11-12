import { useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Runs a save; `onError` puts the control back. */
export function useSaveState() {
  const [state, setState] = useState<SaveState>('idle');
  const run = async (fn: () => Promise<unknown>, onError?: () => void) => {
    setState('saving');
    try {
      await fn();
      setState('saved');
    } catch {
      onError?.();
      setState('error');
    }
  };
  return { state, run };
}
