import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { StatusView } from '@/components/auth/StatusView';
import { COGNITO_CLIENT_ID, COGNITO_DOMAIN, isGoogleConfigured } from '@/components/auth/googleConfig';
import { useGoogleSignIn } from '@/components/auth/useGoogleSignIn';
import { trackLogin, trackSignUp } from '@/lib/analytics';
import { decodeJwtPayload } from '@/lib/jwt';
import { finishOAuth, takeOAuthDestination } from '@/lib/oauth';
import { useAppDispatch } from '@/store/hooks';
import { setGoogleAuth } from '@/store/slices/authSlice';

type Outcome = 'loading' | 'cancelled' | 'failed' | 'expired';

/** The wait after which the loading view admits it is slow and offers a way back. */
const SLOW_MS = 10_000;

/** A federated identity created in the last minute means this sign-in made the account. */
function isFirstSignIn(payload: Record<string, unknown>): boolean {
  const identities = payload.identities as { dateCreated?: string | number }[] | undefined;
  const created = Number(identities?.[0]?.dateCreated);
  return Number.isFinite(created) && Date.now() - created < 60_000;
}

/** The page never prints text taken from the URL: the outcome is read from the query, the words are ours (DESIGN-AUTH §3.8). */
export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [outcome, setOutcome] = useState<Outcome>('loading');
  const [slow, setSlow] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const started = useRef(false);
  const google = useGoogleSignIn(from);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setFrom(takeOAuthDestination());
      return setOutcome(errorParam === 'access_denied' ? 'cancelled' : 'failed');
    }
    if (!code || !isGoogleConfigured()) return setOutcome('expired');

    // The returned state must match the one stored before leaving; otherwise the callback did not start here.
    const stored = finishOAuth(searchParams.get('state'));
    if (!stored) return setOutcome('expired');
    setFrom(stored.from);
    void exchangeCodeForTokens(code, stored.verifier, stored.from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (outcome !== 'loading') return;
    const id = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(id);
  }, [outcome]);

  const exchangeCodeForTokens = async (code: string, verifier: string, destination: string | null) => {
    try {
      const res = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: COGNITO_CLIENT_ID,
          redirect_uri: `${window.location.origin}/auth/callback`,
          code_verifier: verifier,
        }),
      });
      if (!res.ok) throw new Error('Token exchange failed');

      const data = await res.json();
      const payload = decodeJwtPayload(data.id_token);
      if (!payload) throw new Error('Invalid id_token');
      localStorage.setItem('idToken', data.id_token);
      if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);

      dispatch(
        setGoogleAuth({
          user: { id: payload.sub ?? '', name: payload.name || payload['cognito:username'] || '', email: payload.email || '' },
          token: data.id_token,
          refreshToken: data.refresh_token || null,
        }),
      );
      if (isFirstSignIn(payload)) trackSignUp('google');
      else trackLogin('google');

      navigate(destination ?? '/app', { replace: true });
    } catch {
      setOutcome('failed');
    }
  };

  const useEmail = (
    <Link to="/login" replace className="link center link-touch">
      Use email and password
    </Link>
  );

  return (
    <AuthFrame scene={outcome === 'loading' ? 'opening' : 'journal'}>
      <SEO title="Logging you in – TradeQut" description="Finishing Google sign-in." path="/auth/callback" noindex />
      {outcome === 'loading' && (
        <StatusView
          icon="loading"
          live
          title="Logging you in…"
          lead={slow ? 'This is taking longer than usual.' : 'Checking your Google account with TradeQut. This takes a few seconds.'}
          actions={
            slow ? (
              <Link to="/login" replace className="btn btn-outline btn-block">
                Back to log in
              </Link>
            ) : undefined
          }
        />
      )}
      {outcome === 'cancelled' && (
        <StatusView
          icon="cancelled"
          title="Google sign-in was cancelled"
          lead="Nothing changed. Try again, or use your email and password."
          actions={
            <>
              <GoogleSignInButton google={google} />
              {useEmail}
            </>
          }
        />
      )}
      {outcome === 'failed' && (
        <StatusView
          icon="failed"
          title="Couldn't finish Google sign-in"
          lead="Something went wrong between Google and TradeQut. Nothing changed on your account."
          actions={
            <>
              <GoogleSignInButton google={google} label="Try Google again" />
              {useEmail}
            </>
          }
          footnote={
            <p>
              Still stuck? <Link to="/status" className="link">Check Status</Link> or email{' '}
              <a href="mailto:support@tradequt.com" className="link">
                support@tradequt.com
              </a>
              .
            </p>
          }
        />
      )}
      {outcome === 'expired' && (
        <StatusView
          icon="expired"
          title="This sign-in link has expired"
          lead="Start again from the log-in page."
          actions={
            <Link to="/login" replace className="btn btn-primary btn-block">
              Back to log in
            </Link>
          }
        />
      )}
    </AuthFrame>
  );
}
