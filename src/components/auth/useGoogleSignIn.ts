import { useCallback, useState } from 'react';
import { startGoogleSignIn } from '@/lib/auth/authService';

export interface GoogleSignIn {
  /** True from the click until the browser leaves for Google. */
  busy: boolean;
  start: () => void;
}

/** Starts Google sign-in (Amplify: code + PKCE) and remembers `from` so the callback returns the user there; `onError` runs when the start fails. */
export function useGoogleSignIn(from: string | null, onError?: () => void): GoogleSignIn {
  const [busy, setBusy] = useState(false);
  const start = useCallback(() => {
    if (busy) return;
    setBusy(true);
    startGoogleSignIn(from).catch(() => {
      setBusy(false);
      onError?.();
    });
  }, [busy, from, onError]);
  return { busy, start };
}
