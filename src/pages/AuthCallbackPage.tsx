import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { StatusView } from '@/components/auth/StatusView';
import { isGoogleConfigured } from '@/components/auth/googleConfig';
import { useGoogleSignIn } from '@/components/auth/useGoogleSignIn';
import { trackLogin, trackSignUp } from '@/lib/analytics';
import { finishGoogleSignIn } from '@/lib/auth/authService';
import { destinationFromOAuthState } from '@/lib/auth/destination';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';

type Outcome = 'loading' | 'cancelled' | 'failed' | 'expired';

/** The wait after which the loading view admits it is slow and offers a way back. */
const SLOW_MS = 10_000;

/** What the URL alone settles, so the first paint is already the right view and nothing below it moves. */
function outcomeFromUrl(params: URLSearchParams): Outcome {
  const error = params.get('error');
  if (error) return error === 'access_denied' ? 'cancelled' : 'failed';
  return params.get('code') && isGoogleConfigured() ? 'loading' : 'expired';
}

/** The page never prints text taken from the URL: the outcome is read from the query, the words are ours (DESIGN-AUTH §3.8). */
export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [outcome, setOutcome] = useState<Outcome>(() => outcomeFromUrl(searchParams));
  const [slow, setSlow] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const started = useRef(false);
  const google = useGoogleSignIn(from);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const errorParam = searchParams.get('error');
    if (errorParam) {
      setFrom(destinationFromOAuthState(searchParams.get('state')));
      return setOutcome(errorParam === 'access_denied' ? 'cancelled' : 'failed');
    }
    if (!searchParams.get('code') || !isGoogleConfigured()) return setOutcome('expired');

    void finishSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (outcome !== 'loading') return;
    const id = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(id);
  }, [outcome]);

  // Amplify exchanges the code (PKCE) as soon as it is configured; this waits for that and reads the result.
  const finishSignIn = async () => {
    const result = await finishGoogleSignIn();
    if (!result.ok || !result.user) {
      setOutcome(result.expired ? 'expired' : 'failed');
      return;
    }
    dispatch(setUser(result.user));
    if (result.firstSignIn) trackSignUp('google');
    else trackLogin('google');
    navigate(result.destination ?? '/app', { replace: true });
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
