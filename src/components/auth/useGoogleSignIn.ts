import { useCallback, useState } from 'react';
import { COGNITO_CLIENT_ID, COGNITO_DOMAIN } from '@/components/auth/googleConfig';
import { startOAuth } from '@/lib/oauth';

export interface GoogleSignIn {
  /** True from the click until the browser leaves for Google. */
  busy: boolean;
  start: () => void;
}

/** Starts Google sign-in with state + PKCE and remembers `from` so the callback returns the user there; `onError` runs when the start fails. */
export function useGoogleSignIn(from: string | null, onError?: () => void): GoogleSignIn {
  const [busy, setBusy] = useState(false);
  const start = useCallback(() => {
    if (busy) return;
    setBusy(true);
    startOAuth(from)
      .then(({ state, codeChallenge }) => {
        const redirectUri = `${window.location.origin}/auth/callback`;
        window.location.href =
          `https://${COGNITO_DOMAIN}/oauth2/authorize?` +
          `response_type=code&` +
          `client_id=${encodeURIComponent(COGNITO_CLIENT_ID)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `identity_provider=Google&` +
          `state=${encodeURIComponent(state)}&` +
          `code_challenge=${encodeURIComponent(codeChallenge)}&` +
          `code_challenge_method=S256&` +
          `scope=${encodeURIComponent('openid email profile')}`;
      })
      .catch(() => {
        setBusy(false);
        onError?.();
      });
  }, [busy, from, onError]);
  return { busy, start };
}
