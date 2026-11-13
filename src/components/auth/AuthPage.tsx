import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { AuthFrame, FadeIn } from '@/components/auth/AuthFrame';
import { AuthNotice, type NoticeIcon, type NoticeTone } from '@/components/auth/AuthNotice';
import { CodeInput } from '@/components/auth/CodeInput';
import { FormSummary, type SummaryItem } from '@/components/auth/FormSummary';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PasswordField } from '@/components/auth/PasswordField';
import { StatusView } from '@/components/auth/StatusView';
import { describeAuthError, formatWait, rateLimitBody, type AuthCall, type AuthErrorInfo } from '@/components/auth/authErrors';
import { isGoogleConfigured } from '@/components/auth/googleConfig';
import { fallbackName, isValidEmail, missingRulesMessage, unmetRules } from '@/components/auth/passwordRules';
import type { AuthScene, StageData } from '@/components/auth/scenes';
import { useAuthArrival } from '@/components/auth/useAuthArrival';
import { formatClock, spokenWait, useCountdown } from '@/components/auth/useCountdown';
import { useGoogleSignIn } from '@/components/auth/useGoogleSignIn';
import { TRIAL_DAYS } from '@/content/product-facts';
import { useOnline } from '@/hooks/useOnline';
import { normalizeEmail } from '@/lib/auth/email';
import { trackLogin, trackSignUp } from '@/lib/analytics';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearSignupSuccess } from '@/store/slices/authSlice';
import { useConfirmSignupMutation, useForgotPasswordMutation, useLoginMutation, useResetPasswordMutation, useSignupMutation } from '@/store/api';

type AuthView = 'login' | 'signup' | 'forgot' | 'otp' | 'reset';

interface AuthPageProps {
  onLogin: () => void;
  initialView?: 'login' | 'signup';
}

const TITLES: Record<AuthView, string> = {
  login: 'Log in to TradeQut',
  signup: 'Create your account',
  forgot: 'Reset your password',
  otp: 'Check your email',
  reset: 'Choose a new password',
};

const PAGE_TITLES: Record<AuthView, string> = {
  login: 'Log in – TradeQut',
  signup: 'Create your account – TradeQut',
  forgot: 'Reset your password – TradeQut',
  otp: 'Check your email – TradeQut',
  reset: 'Choose a new password – TradeQut',
};

const IDS = { email: 'auth-email', password: 'auth-password', code: 'auth-code' } as const;
const CALL_OF: Record<AuthView, AuthCall> = { login: 'login', signup: 'signup', forgot: 'forgot', otp: 'confirm', reset: 'reset' };

type Errors = { email?: string; password?: string; code?: string };
interface Notice {
  tone: NoticeTone;
  icon?: NoticeIcon;
  title?: string;
  body: string;
}
interface Limit {
  call: AuthCall;
  email: string;
  retryAfter?: number;
}

function Or() {
  return (
    <div className="or" role="separator" aria-label="or">
      or
    </div>
  );
}

/** `Check your connection … see Status.` with `Status` as a link to the status page. */
function withStatusLink(message: string): React.ReactNode {
  const at = message.lastIndexOf('Status');
  if (at < 0) return message;
  return (
    <>
      {message.slice(0, at)}
      <Link to="/status">Status</Link>
      {message.slice(at + 'Status'.length)}
    </>
  );
}

export const AuthPage = ({ onLogin, initialView = 'login' }: AuthPageProps) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { destination, arrival, state: carried } = useAuthArrival();
  const online = useOnline();
  const { isAuthenticated, signupSuccess } = useAppSelector((s) => s.auth);
  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [signup, { isLoading: signupLoading }] = useSignupMutation();
  const [confirmSignup, { isLoading: confirmLoading }] = useConfirmSignupMutation();
  const [forgotPassword, { isLoading: forgotLoading }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetLoading }] = useResetPasswordMutation();

  const requested = params.get('view');
  const wanted: AuthView = requested === 'forgot' || requested === 'otp' || requested === 'reset' ? requested : initialView;
  /** The view that opened the verify screen, so Back returns there. */
  const [origin, setOrigin] = useState<'login' | 'signup'>(initialView);
  const [email, setEmail] = useState(carried.email ?? '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [showSummary, setShowSummary] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState<AuthErrorInfo | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(
    arrival ? { tone: 'info', icon: arrival.icon, title: arrival.title, body: arrival.message } : null,
  );
  const [limit, setLimit] = useState<Limit | null>(null);
  const [backOnline, setBackOnline] = useState(false);
  const [verified, setVerified] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // A reload keeps `?view=` but not the email: fall back to the form that asks for it.
  const view: AuthView = (wanted === 'otp' || wanted === 'reset') && !email ? (wanted === 'reset' ? 'forgot' : initialView) : wanted;
  const setView = useCallback(
    (next: AuthView) => navigate({ pathname: location.pathname, search: next === 'login' || next === 'signup' ? '' : `?view=${next}` }, { state: { ...(location.state as object | null), email: undefined, focus: undefined } }),
    [navigate, location.pathname, location.state],
  );
  const wasOffline = useRef(false);
  const passwordChanged = useRef(false);
  const summary = useRef<HTMLDivElement>(null);
  const resend = useCountdown(30);
  const cooldown = useCountdown(0);
  const googleOn = isGoogleConfigured();
  const loading = loginLoading || signupLoading || confirmLoading || forgotLoading || resetLoading;

  const failGoogle = useCallback(() => {
    setFormError({ kind: 'other', title: "Couldn't open Google sign-in", message: 'Try again, or use your email and password.' });
    window.setTimeout(() => summary.current?.focus(), 0);
  }, []);
  const google = useGoogleSignIn(destination === '/app' ? null : destination, failGoogle);
  const busy = loading || google.busy || verified;

  useEffect(() => {
    if (!isAuthenticated) return;
    trackLogin('email');
    if (passwordChanged.current) toast.success('Password changed');
    onLogin();
  }, [isAuthenticated, onLogin]);

  useEffect(() => {
    if (signupSuccess) dispatch(clearSignupSuccess());
  }, [signupSuccess, dispatch]);

  // Read from the flag's own change: a second `online` listener is removed by this effect's cleanup before the browser calls it.
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setBackOnline(true);
    const id = window.setTimeout(() => setBackOnline(false), 5000);
    return () => window.clearTimeout(id);
  }, [online]);

  useEffect(() => {
    if (limit?.retryAfter && cooldown.left === 0) {
      setLimit(null);
      setNotice({ tone: 'info', body: 'You can try again now.' });
    }
  }, [limit, cooldown.left]);

  const clearFeedback = () => {
    setErrors({});
    setShowSummary(false);
    setFormError(null);
    setEmailExists(false);
    setNotice(null);
  };

  const go = useCallback(
    (next: AuthView, nextNotice: Notice | null = null) => {
      setErrors({});
      setShowSummary(false);
      setFormError(null);
      setEmailExists(false);
      setCode('');
      setAttempted(false);
      setLimit(null);
      setNotice(nextNotice);
      setView(next);
    },
    [setView],
  );

  const focusSummary = () => window.setTimeout(() => summary.current?.focus(), 0);
  const focusCode = () => window.setTimeout(() => document.getElementById(IDS.code)?.focus(), 0);

  const failFields = (next: Errors) => {
    setErrors(next);
    setShowSummary(true);
    setAttempted(true);
    focusSummary();
  };

  /** One reading of a failed call: a field message, the rate-limit countdown, or a form-level notice. */
  const failServer = (err: unknown, call: AuthCall) => {
    const info = describeAuthError(err, call);
    if (info.kind === 'rate') {
      setLimit({ call, email: normalizeEmail(email), retryAfter: info.retryAfter });
      if (info.retryAfter) cooldown.restart(info.retryAfter);
      focusSummary();
      return info;
    }
    if (info.field === 'code') {
      setErrors({ code: info.message });
      setCode('');
      if (info.kind === 'code-invalid' || info.kind === 'code-expired') resend.restart(0);
      focusCode();
    } else if (info.kind === 'exists') {
      setErrors({ email: info.message });
      setEmailExists(true);
      setShowSummary(true);
      focusSummary();
    } else if (info.field === 'password') {
      setErrors({ password: info.message });
      window.setTimeout(() => document.getElementById(IDS.password)?.focus(), 0);
    } else {
      setFormError(info);
      focusSummary();
    }
    return info;
  };

  const emailError = () => (!email.trim() ? 'Enter your email address.' : !isValidEmail(email) ? 'Enter a valid email address, like name@example.com.' : undefined);
  const policyError = () => (!password ? 'Enter a password.' : unmetRules(password).length ? missingRulesMessage(unmetRules(password)) : undefined);

  const blocked = (call: AuthCall) => !!limit && !!limit.retryAfter && cooldown.left > 0 && limit.call === call && limit.email === normalizeEmail(email);

  const items = (): SummaryItem[] =>
    showSummary
      ? ([
          errors.email && { fieldId: IDS.email, label: 'Email', message: errors.email },
          errors.password && { fieldId: IDS.password, label: view === 'reset' ? 'New password' : 'Password', message: errors.password },
          errors.code && view === 'reset' && { fieldId: IDS.code, label: 'Code', message: errors.code },
        ].filter(Boolean) as SummaryItem[])
      : [];

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || blocked('login')) return;
    const next: Errors = { email: emailError(), password: password ? undefined : 'Enter your password.' };
    if (next.email || next.password) return failFields(next);
    clearFeedback();
    try {
      await login({ email: email.trim(), password }).unwrap();
    } catch (err) {
      const info = describeAuthError(err, 'login');
      if (info.kind === 'unverified') {
        // Signing up again with the same address resends the code.
        try {
          await signup({ name: fallbackName(email), email: email.trim(), password }).unwrap();
        } catch {
          // the code may already have been sent; the verify screen has its own resend
        }
        setOrigin('login');
        go('otp', { tone: 'info', title: "This email isn't verified yet", body: 'Enter the new code we just sent to finish setting up your account.' });
        resend.restart();
        return;
      }
      failServer(err, 'login');
    }
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || blocked('signup')) return;
    const next: Errors = { email: emailError(), password: policyError() };
    if (next.email || next.password) return failFields(next);
    clearFeedback();
    try {
      await signup({ name: fallbackName(email), email: email.trim(), password }).unwrap();
      trackSignUp('email');
      setOrigin('signup');
      go('otp');
      resend.restart();
    } catch (err) {
      failServer(err, 'signup');
    }
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setErrors({});
    try {
      await confirmSignup({ email: email.trim(), code: value }).unwrap();
    } catch (err) {
      const info = describeAuthError(err, 'confirm');
      if (info.kind === 'confirmed') return goVerifiedLogin();
      failServer(err, 'confirm');
      return;
    }
    if (!password) return goVerifiedLogin();
    setVerified(true);
    try {
      await login({ email: email.trim(), password }).unwrap();
    } catch {
      setVerified(false);
      goVerifiedLogin();
    }
  };

  const goVerifiedLogin = () => {
    setPassword('');
    go('login', { tone: 'success', title: 'Email verified', body: 'Log in to continue.' });
  };

  const resendCode = async () => {
    if (resend.left > 0 || busy) return;
    try {
      if (view === 'reset') await forgotPassword({ email: email.trim() }).unwrap();
      else await signup({ name: fallbackName(email), email: email.trim(), password }).unwrap();
      resend.restart();
      setErrors({});
      setCode('');
      setNotice({ tone: 'success', body: `New code sent to ${email.trim()}.` });
      focusCode();
    } catch (err) {
      const info = describeAuthError(err, 'resend');
      if (info.kind === 'attempts') {
        setErrors({ code: info.message });
        resend.restart(60);
      } else if (info.kind === 'rate') {
        setErrors({ code: rateLimitBody(view === 'reset' ? 'forgot' : 'signup', info.retryAfter ? formatWait(info.retryAfter) : null) });
        resend.restart(info.retryAfter ?? 60);
      } else failServer(err, 'resend');
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || blocked('forgot')) return;
    const m = emailError();
    if (m) return failFields({ email: m });
    clearFeedback();
    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      go('reset');
      resend.restart();
    } catch (err) {
      failServer(err, 'forgot');
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || blocked('reset')) return;
    const next: Errors = { code: code.length === 6 ? undefined : 'Enter the 6-digit code from your email.', password: policyError() };
    if (next.code || next.password) return failFields(next);
    clearFeedback();
    try {
      await resetPassword({ email: email.trim(), code, newPassword: password }).unwrap();
    } catch (err) {
      failServer(err, 'reset');
      return;
    }
    passwordChanged.current = true;
    setFinishing(true);
    try {
      await login({ email: email.trim(), password }).unwrap();
    } catch {
      passwordChanged.current = false;
      setFinishing(false);
      setPassword('');
      go('login', { tone: 'success', title: 'Password changed', body: 'Log in with your new password.' });
    }
  };

  const rate = limit && limit.call === CALL_OF[view] ? limit : null;
  const formAlert = (() => {
    if (rate) {
      const [pre, post] = rateLimitBody(rate.call, '\u0001').split('\u0001');
      const running = !!rate.retryAfter && cooldown.left > 0;
      return (
        <FormSummary
          ref={summary}
          icon="clock"
          title="Too many attempts"
          message={
            <>
              {pre}
              {running ? (
                <>
                  <span className="timer tnum" aria-hidden="true">
                    {cooldown.left >= 3600 ? 'about 1 hour' : formatClock(cooldown.left)}
                  </span>
                  <span className="sr-only">{spokenWait(cooldown.left)}</span>
                </>
              ) : (
                'a few minutes'
              )}
              {post}
            </>
          }
          items={[]}
        />
      );
    }
    if (formError) {
      return (
        <FormSummary
          ref={summary}
          title={formError.title ?? formError.message}
          message={
            formError.kind === 'credentials' ? (
              <>
                Try again or{' '}
                <button type="button" className="textbtn" onClick={() => go('forgot')}>
                  reset your password
                </button>
                .{googleOn ? ' If you signed up with Google, use Continue with Google.' : ''}
              </>
            ) : formError.title ? (
              withStatusLink(formError.message)
            ) : undefined
          }
          items={[]}
        />
      );
    }
    return <FormSummary ref={summary} items={items()} />;
  })();

  const offlineCopy = view === 'login' ? 'Reconnect to log in.' : view === 'signup' ? 'Reconnect to create your account.' : 'Reconnect to continue.';
  const liveNotice = !online ? (
    <AuthNotice tone="warning" title="You're offline">
      {offlineCopy}
    </AuthNotice>
  ) : backOnline ? (
    <AuthNotice tone="info">You&apos;re back online.</AuthNotice>
  ) : notice ? (
    <AuthNotice tone={notice.tone} icon={notice.icon} title={notice.title}>
      {notice.body}
    </AuthNotice>
  ) : null;
  const slots = (
    <div role="status" className="live">
      {liveNotice}
    </div>
  );
  const alertSlot = (
    <div role="alert" className="live">
      {formAlert}
    </div>
  );
  const googleBlock = googleOn && (
    <>
      <GoogleSignInButton google={google} />
      <Or />
    </>
  );

  const submit = (label: string, runningLabel: string, running: boolean, off = false) => (
    <button type="submit" className="btn btn-primary btn-block" aria-disabled={busy || off || undefined} data-busy={running || undefined}>
      {running && <LoaderCircle className="ico spin" aria-hidden="true" />}
      {running ? runningLabel : label}
    </button>
  );

  const emailField = (autoFocus = !email) => (
    <div className="field">
      <label htmlFor={IDS.email} className="label">
        Email
      </label>
      <input
        id={IDS.email}
        className="input"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (limit && normalizeEmail(e.target.value) !== limit.email) setLimit(null);
        }}
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus={autoFocus}
        readOnly={busy}
        aria-invalid={errors.email ? true : undefined}
        aria-describedby={errors.email ? `${IDS.email}-error` : undefined}
        aria-required
      />
      {errors.email && (
        <p id={`${IDS.email}-error`} className="field-error">
          <CircleAlert className="ico" aria-hidden="true" />
          <span>{errors.email}</span>
        </p>
      )}
      {emailExists && (
        <>
          <p className="field-actions">
            <Link to="/login" state={{ ...(location.state as object | null), email: email.trim(), focus: 'password' }} className="link link-touch">
              Log in instead
            </Link>
            <Link to="/login?view=forgot" state={{ ...(location.state as object | null), email: email.trim() }} className="link link-touch">
              Reset password
            </Link>
          </p>
          {googleOn && <p className="field-hint">If you signed up with Google, use Continue with Google.</p>}
        </>
      )}
    </div>
  );

  const resendLine = (
    <p>
      {resend.left > 0 ? (
        <span>
          Resend code in <span className="tnum">{formatClock(resend.left)}</span>
        </span>
      ) : (
        <button type="button" className="textbtn" onClick={() => void resendCode()}>
          Resend code
        </button>
      )}{' '}
      · Check your spam folder too.
      <span className="sr-only" role="status">
        {resend.left === 0 ? 'You can resend the code now.' : ''}
      </span>
    </p>
  );
  const backLink = (to: AuthView, label: string) => (
    <button type="button" className="back" onClick={() => go(to)}>
      <ArrowLeft className="ico" aria-hidden="true" />
      {label}
    </button>
  );

  const alternate =
    view === 'login'
      ? { prompt: 'New here?', note: `${TRIAL_DAYS}-day Pro trial. No card.`, label: 'Create account', to: '/signup', state: { ...(location.state as object | null), email: email.trim() || undefined } }
      : view === 'signup'
        ? { prompt: 'Have an account?', label: 'Log in', to: '/login', state: { ...(location.state as object | null), email: email.trim() || undefined } }
        : undefined;
  const fromSignup = origin === 'signup';
  const scene: AuthScene = view === 'login' ? 'journal' : view === 'signup' ? 'signup' : view === 'otp' ? 'mail' : 'reset';
  const stage: StageData =
    view === 'otp'
      ? { email: email.trim(), codeLength: code.length, verified, facts: fromSignup }
      : view === 'signup'
        ? { facts: true }
        : { resetStep: view === 'reset' ? 2 : 1 };
  const step = view === 'signup' ? 1 : view === 'otp' && fromSignup ? 2 : undefined;
  const indexable = view === 'login' || view === 'signup';
  const emailStrong = <strong>{email}</strong>;

  if (finishing) {
    return (
      <AuthFrame scene="reset" stage={{ resetStep: 3 }}>
        <SEO title="Password changed – TradeQut" description="Your TradeQut password was changed." path={location.pathname} noindex />
        <StatusView
          icon="ok"
          live
          title="Password changed"
          lead="Logging you in…"
          actions={
            <button type="button" className="btn btn-primary btn-block" aria-disabled="true" data-busy>
              <LoaderCircle className="ico spin" aria-hidden="true" />
              Opening your journal
            </button>
          }
        />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame scene={scene} stage={stage} step={step} alternate={alternate}>
      <SEO
        title={PAGE_TITLES[view]}
        description={view === 'signup' ? 'Create your TradeQut account. 14-day Pro trial, no card.' : 'Log in to your TradeQut trading journal.'}
        path={location.pathname}
        noindex={!indexable}
      />
      <FadeIn key={view}>
        <h1 className="auth-h1">{TITLES[view]}</h1>
        {view === 'signup' && <p className="auth-lead">{TRIAL_DAYS}-day Pro trial. No card.</p>}
        {view === 'forgot' && <p className="auth-lead">Enter your account email and we&apos;ll send a 6-digit code.</p>}
        {view === 'otp' && (
          <p className="auth-lead">
            We sent a 6-digit code to {emailStrong}.{' '}
            <button type="button" className="link" onClick={() => go(origin)}>
              Change email
            </button>
          </p>
        )}
        {view === 'reset' && (
          <p className="auth-lead">
            If an account exists for {emailStrong}, a 6-digit code is on its way.{' '}
            <button type="button" className="link" onClick={() => go('forgot')}>
              Change email
            </button>
          </p>
        )}

        {view === 'login' && (
          <form onSubmit={submitLogin} noValidate className="stack" aria-busy={busy || undefined}>
            {slots}
            {googleBlock}
            {alertSlot}
            {emailField(!email)}
            <PasswordField
              id={IDS.password}
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              error={errors.password}
              readOnly={busy}
              autoFocus={!!email}
              labelAction={
                <button type="button" className="link link-sm label-action" onClick={() => go('forgot')}>
                  Forgot password?
                </button>
              }
            />
            {submit('Log in', 'Logging in…', loginLoading, blocked('login'))}
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={submitSignup} noValidate className="stack" aria-busy={busy || undefined}>
            {slots}
            {googleBlock}
            {alertSlot}
            {emailField(!email)}
            <PasswordField id={IDS.password} label="Password" value={password} onChange={setPassword} autoComplete="new-password" error={errors.password} checklist revealChecklist={attempted} readOnly={busy} />
            {submit('Create account', 'Creating account…', signupLoading, blocked('signup'))}
            <p className="legal">
              By creating an account you agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy policy</Link>.
            </p>
          </form>
        )}

        {view === 'otp' && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void verify(code);
              }}
              noValidate
              className="stack"
              aria-busy={busy || undefined}
            >
              {slots}
              <CodeInput
                id={IDS.code}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setErrors({});
                }}
                onComplete={(v) => void verify(v)}
                help="6 digits. The form submits when the last digit is entered."
                error={errors.code}
                accepted={verified}
                readOnly={busy}
                autoFocus
              />
              {submit('Verify email', 'Verifying…', confirmLoading)}
              {verified && (
                <span className="sr-only" role="status">
                  Email verified. Logging you in…
                </span>
              )}
            </form>
            <div className="below">
              {resendLine}
              {backLink(origin, origin === 'signup' ? 'Back to sign up' : 'Back to log in')}
            </div>
          </>
        )}

        {view === 'forgot' && (
          <>
            <form onSubmit={submitForgot} noValidate className="stack" aria-busy={busy || undefined}>
              {slots}
              {alertSlot}
              {emailField(true)}
              {submit('Send code', 'Sending…', forgotLoading, blocked('forgot'))}
            </form>
            <div className="below">{backLink('login', 'Back to log in')}</div>
          </>
        )}

        {view === 'reset' && (
          <>
            <form onSubmit={submitReset} noValidate className="stack" aria-busy={busy || undefined}>
              {slots}
              {alertSlot}
              <CodeInput
                id={IDS.code}
                label="Code from the email"
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setErrors((er) => ({ ...er, code: undefined }));
                }}
                onComplete={() => document.getElementById(IDS.password)?.focus()}
                help="6 digits. Focus moves to the new password when the last digit is entered."
                error={errors.code}
                readOnly={busy}
                autoFocus
              />
              <PasswordField id={IDS.password} label="New password" value={password} onChange={setPassword} autoComplete="new-password" error={errors.password} checklist revealChecklist={attempted} readOnly={busy} />
              {submit('Update password', 'Updating…', resetLoading, blocked('reset'))}
            </form>
            <div className="below">
              {resendLine}
              {googleOn && (
                <p>
                  Signed up with Google? There is no password to reset.{' '}
                  <button type="button" className="link" onClick={google.start}>
                    Continue with Google
                  </button>
                </p>
              )}
              {backLink('login', 'Back to log in')}
            </div>
          </>
        )}
      </FadeIn>
    </AuthFrame>
  );
};
