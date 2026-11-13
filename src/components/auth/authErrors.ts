import { readApiError } from '@/lib/apiError';

export type AuthCall = 'login' | 'signup' | 'confirm' | 'forgot' | 'reset' | 'resend';

export type AuthErrorKind =
  | 'network'
  | 'server'
  | 'rate'
  | 'credentials'
  | 'unverified'
  | 'exists'
  | 'code-invalid'
  | 'code-expired'
  | 'attempts'
  | 'password'
  | 'confirmed'
  | 'other';

export interface AuthErrorInfo {
  kind: AuthErrorKind;
  /** Bold first line of a form-level notice. */
  title?: string;
  message: string;
  /** The field the message belongs under; absent for a form-level notice. */
  field?: 'email' | 'password' | 'code';
  /** Seconds until a throttled request may be retried; absent when the response gave no wait. */
  retryAfter?: number;
}

/** The wait in seconds: `error.retryAfter` in the one error envelope; `errors[0].retryAfter` and `error.details.retryAfter` are the shapes before it. */
function readRetryAfter(err: unknown): number | undefined {
  const e = (err ?? {}) as { data?: { errors?: { retryAfter?: unknown }[]; error?: { retryAfter?: unknown; details?: { retryAfter?: unknown } } } };
  const v = e.data?.error?.retryAfter ?? e.data?.errors?.[0]?.retryAfter ?? e.data?.error?.details?.retryAfter;
  return typeof v === 'number' && v > 0 ? Math.ceil(v) : undefined;
}

/** `3:52`, or `about 1 hour` from an hour up. */
export function formatWait(seconds: number): string {
  if (seconds >= 3600) return 'about 1 hour';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const RATE_BODY: Record<AuthCall, (wait: string) => string> = {
  login: (w) => `Log in is paused for this email. Try again in ${w}.`,
  signup: (w) => `Creating an account is paused for this email. Try again in ${w}.`,
  forgot: (w) => `We've already sent several codes to this email. Try again in ${w}.`,
  reset: (w) => `Try again in ${w}.`,
  confirm: (w) => `Try again in ${w}.`,
  resend: (w) => `Try again in ${w}.`,
};

/** Body of the rate-limit notice; `wait` is the formatted time, or null when the response carried none. */
export function rateLimitBody(call: AuthCall, wait: string | null): string {
  return RATE_BODY[call](wait ?? 'a few minutes');
}

/**
 * The only sentences an auth failure may show (DESIGN-AUTH §3.17). Server and provider wording is matched, never
 * displayed; anything unknown falls to the last row.
 */
export function describeAuthError(err: unknown, call: AuthCall): AuthErrorInfo {
  const raw = (err ?? {}) as { status?: unknown };
  if (raw.status === 'FETCH_ERROR' || raw.status === 'TIMEOUT_ERROR') {
    return { kind: 'network', title: "Couldn't reach TradeQut", message: 'Check your connection and try again. If it keeps happening, see Status.' };
  }
  const info = readApiError(err, '');
  const status = info.status;
  const text = info.message;
  if (status === 429 || info.code === 'RATE_LIMITED') {
    const wait = readRetryAfter(err);
    if (!wait && call === 'confirm') return { kind: 'attempts', field: 'code', message: 'Too many attempts. Wait a few minutes, then try again.' };
    if (!wait && call === 'resend') {
      return { kind: 'attempts', field: 'code', message: "You've asked for several codes. Use the newest email, or wait a few minutes before asking again." };
    }
    return { kind: 'rate', title: 'Too many attempts', message: rateLimitBody(call, wait ? formatWait(wait) : null), retryAfter: wait };
  }
  if (typeof status === 'number' && status >= 500) {
    return { kind: 'server', title: 'TradeQut had a problem', message: 'Nothing was changed. Try again in a moment, or see Status.' };
  }
  if (call === 'login') {
    if (info.code === 'EMAIL_NOT_VERIFIED') return { kind: 'unverified', message: "This email isn't verified yet" };
    if (info.code === 'UNAUTHORIZED' || status === 400 || status === 401) {
      return { kind: 'credentials', title: 'Email or password is incorrect', message: 'Try again or reset your password.' };
    }
  }
  if (call === 'signup') {
    if (info.code === 'USER_EXISTS') return { kind: 'exists', field: 'email', message: 'An account with this email already exists.' };
    if (info.code === 'VALIDATION_ERROR' && /password/i.test(text)) {
      return { kind: 'password', field: 'password', message: "Choose a different password — this one isn't accepted." };
    }
  }
  if (call === 'confirm' || call === 'reset') {
    if (call === 'confirm' && /already confirmed|current status is confirmed/i.test(text)) return { kind: 'confirmed', message: '' };
    if (/expired|request a code again/i.test(text)) return { kind: 'code-expired', field: 'code', message: 'That code has expired. Resend the code and enter the new one.' };
    if (/invalid.*code|code.*mismatch/i.test(text)) return { kind: 'code-invalid', field: 'code', message: "That code isn't right. Check the email and enter it again." };
    if (/attempt limit|limit exceeded/i.test(text)) return { kind: 'attempts', field: 'code', message: 'Too many attempts. Wait a few minutes, then try again.' };
    if (call === 'reset' && /password/i.test(text)) return { kind: 'password', field: 'password', message: "Choose a different password — this one isn't accepted." };
  }
  return { kind: 'other', title: 'Something went wrong', message: 'Nothing was changed. Try again.' };
}

export interface Arrival {
  title?: string;
  message: string;
  icon: 'clock' | 'info';
}

/** The notice for a forced arrival on the log-in form: a session that ended, or a protected link opened without one. */
export function arrivalNotice(reason: string | null | undefined, hasDestination: boolean): Arrival | null {
  if (reason === 'session-ended') {
    return { title: 'You were logged out because your session ended.', message: 'Log in to continue — unsaved trades were kept as drafts.', icon: 'clock' };
  }
  if (hasDestination) return { message: "Log in to continue. You'll go straight to the page you opened.", icon: 'info' };
  return null;
}
