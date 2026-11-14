import {
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  resetPassword,
  signIn,
  signInWithRedirect,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { connectionMessage } from '@/lib/apiError';
import { LOGGED_OUT_EVERYWHERE_URL } from '@/components/auth/loggingOut';
import { configureAuth } from './amplifyConfig';
import { safeDestination } from './destination';
import { normalizeEmail } from './email';
import { clearStoredSession, hasStoredSession } from './storedSession';

/**
 * Every Amplify Auth call the app makes goes through this module, and every failure leaves it as an
 * `AuthServiceError` shaped like the API's error body, so `describeAuthError` and `readApiError` read it as they read
 * an HTTP error: `status`, `data.message`, `data.errorCode` and `data.error.retryAfter`. The wording and codes are the
 * ones the removed /v1/auth/* handlers returned (JournalAWSSetup src/shared/cognitoErrors.ts, src/handlers/auth-*).
 */

export type AuthCall = 'login' | 'signup' | 'confirm-signup' | 'forgot-password' | 'reset-password' | 'resend';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthErrorBody {
  success: false;
  message: string;
  errorCode: string;
  errorMessage: string;
  error?: { code: string; retryAfter?: number };
}

/** `status` is the HTTP status the old endpoint answered with, or `FETCH_ERROR` when Cognito could not be reached. */
export class AuthServiceError extends Error {
  readonly status: number | 'FETCH_ERROR';
  readonly data: AuthErrorBody | string;

  constructor(status: number | 'FETCH_ERROR', data: AuthErrorBody | string) {
    super(typeof data === 'string' ? data : data.message);
    this.name = 'AuthServiceError';
    this.status = status;
    this.data = data;
  }
}

const body = (errorCode: string, message: string): AuthErrorBody => ({ success: false, message, errorCode, errorMessage: message, error: { code: errorCode } });
const fail = (status: number, errorCode: string, message: string) => new AuthServiceError(status, body(errorCode, message));

const MSG = {
  rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
  codeInvalid: 'Invalid verification code. Check the email and enter it again.',
  codeExpired: 'That verification code has expired. Request a code again.',
  alreadyConfirmed: 'This email is already confirmed. You can log in.',
  resetRefused: "We couldn't reset that password. Request a new code and try again.",
  weakPassword: 'Choose a stronger password: at least 8 characters with upper and lower case letters, a number and a symbol.',
  signupParams: 'Check your email address and name, then try again.',
  params: 'Check what you entered and try again.',
  badLogin: 'Invalid email or password',
  unverified: 'Please verify your email before logging in. Check your inbox for the verification code.',
  userExists: 'An account with this email already exists. Please login instead.',
  internal: 'Something went wrong on our side. Please try again.',
} as const;

const nameOf = (e: unknown): string => String((e as { name?: unknown })?.name ?? '');
const messageOf = (e: unknown): string => String((e as { message?: unknown })?.message ?? '');

/**
 * An Amplify (Cognito) exception as the error the old endpoint for `call` returned. Cognito's own wording is never
 * passed on. Cognito sends no wait time, so a 429 carries no `retryAfter` and the UI falls back to "a few minutes".
 */
export function toAuthServiceError(e: unknown, call: AuthCall): AuthServiceError {
  if (e instanceof AuthServiceError) return e;
  const name = nameOf(e);
  const message = messageOf(e);
  if (name === 'NetworkError') return new AuthServiceError('FETCH_ERROR', connectionMessage('network'));
  switch (name) {
    case 'TooManyRequestsException':
    case 'LimitExceededException':
    case 'TooManyFailedAttemptsException':
      return fail(429, 'RATE_LIMITED', MSG.rateLimited);
    case 'CodeMismatchException':
      return fail(400, 'CODE_INVALID', MSG.codeInvalid);
    case 'ExpiredCodeException':
      return fail(400, 'CODE_EXPIRED', MSG.codeExpired);
    case 'UserNotConfirmedException':
      return fail(403, 'EMAIL_NOT_VERIFIED', MSG.unverified);
    case 'UserLambdaValidationException':
      if (message.includes('USER_EXISTS')) return fail(400, 'USER_EXISTS', MSG.userExists);
      break;
    case 'UserNotFoundException':
      if (call === 'confirm-signup' || call === 'reset-password') return fail(400, 'CODE_INVALID', MSG.codeInvalid);
      if (call === 'login') return fail(400, 'UNAUTHORIZED', MSG.badLogin);
      break;
    case 'NotAuthorizedException':
      if (call === 'login') {
        return /attempts exceeded/i.test(message) ? fail(429, 'RATE_LIMITED', MSG.rateLimited) : fail(400, 'UNAUTHORIZED', MSG.badLogin);
      }
      if (call === 'confirm-signup') return fail(400, 'ALREADY_CONFIRMED', MSG.alreadyConfirmed);
      return fail(400, 'VALIDATION_ERROR', MSG.resetRefused);
    case 'InvalidPasswordException':
      return fail(400, 'VALIDATION_ERROR', MSG.weakPassword);
    case 'InvalidParameterException':
      return fail(400, 'VALIDATION_ERROR', call === 'signup' ? MSG.signupParams : MSG.params);
    default:
      // Amplify's client-side checks (empty field, malformed input) are bad input, not a server fault.
      if (/^(Empty|Invalid)[A-Za-z]*(Username|Password|Code|Email)/.test(name)) return fail(400, 'VALIDATION_ERROR', call === 'signup' ? MSG.signupParams : MSG.params);
  }
  return fail(500, 'INTERNAL_ERROR', MSG.internal);
}

type IdPayload = Record<string, unknown> | undefined;

const userFrom = (payload: IdPayload, fallbackEmail = ''): AuthUser => ({
  id: String(payload?.sub ?? ''),
  name: String(payload?.name ?? payload?.['cognito:username'] ?? ''),
  email: String(payload?.email ?? fallbackEmail),
});

async function currentIdPayload(): Promise<IdPayload> {
  return (await fetchAuthSession()).tokens?.idToken?.payload as IdPayload;
}

// Amplify completes a Google redirect on its own once configured; these events fire before React can subscribe.
let oauthCustomState: string | null = null;
let oauthFailed = false;
Hub.listen('auth', ({ payload }) => {
  if (payload.event === 'customOAuthState') oauthCustomState = typeof payload.data === 'string' ? payload.data : null;
  if (payload.event === 'signInWithRedirect_failure') oauthFailed = true;
});
configureAuth();

/** Email and password over SRP: the password never leaves the browser. Resolves with the user read from the ID token. */
export async function login(typedEmail: string, password: string): Promise<{ user: AuthUser }> {
  const email = normalizeEmail(typedEmail);
  try {
    const attempt = () => signIn({ username: email, password });
    let result;
    try {
      result = await attempt();
    } catch (e) {
      // A leftover session (another tab, an earlier user) blocks sign-in; drop it and sign in again.
      if (nameOf(e) !== 'UserAlreadyAuthenticatedException') throw e;
      discardSession();
      result = await attempt();
    }
    if (!result.isSignedIn) {
      throw result.nextStep.signInStep === 'CONFIRM_SIGN_UP' ? fail(403, 'EMAIL_NOT_VERIFIED', MSG.unverified) : fail(400, 'UNAUTHORIZED', MSG.badLogin);
    }
    return { user: userFrom(await currentIdPayload(), email) };
  } catch (e) {
    throw toAuthServiceError(e, 'login');
  }
}

/** Sends a new confirmation code. */
export async function resendCode(email: string): Promise<void> {
  try {
    await resendSignUpCode({ username: normalizeEmail(email) });
  } catch (e) {
    throw toAuthServiceError(e, 'resend');
  }
}

/**
 * Creates the account and mails a code. An address that is already registered but unconfirmed gets a new code instead
 * (`resent: true`). One that is confirmed or owned by a Google account never gets here: the Pre sign-up trigger
 * (JournalAWSSetup src/handlers/auth-pre-signup/app.ts) refuses it with `USER_EXISTS`.
 */
export async function signup(input: { name: string; email: string; password: string }): Promise<{ user: AuthUser; message: string; resent?: true }> {
  const { name, password } = input;
  const email = normalizeEmail(input.email);
  try {
    const r = await signUp({ username: email, password, options: { userAttributes: { email, name } } });
    return { user: { id: r.userId ?? '', name, email }, message: 'User created. Please check your email for a confirmation code.' };
  } catch (e) {
    if (nameOf(e) !== 'UsernameExistsException') throw toAuthServiceError(e, 'signup');
    await resendCode(email);
    return { user: { id: '', name, email }, message: 'Account exists but not verified. Verification code resent to your email.', resent: true };
  }
}

export async function confirmSignup(input: { email: string; code: string }): Promise<void> {
  try {
    await confirmSignUp({ username: normalizeEmail(input.email), confirmationCode: input.code });
  } catch (e) {
    throw toAuthServiceError(e, 'confirm-signup');
  }
}

/** Mails a reset code. Like the old endpoint it answers the same for an unknown address; only throttling and network failures surface. */
export async function forgotPassword(input: { email: string }): Promise<{ message: string }> {
  try {
    await resetPassword({ username: normalizeEmail(input.email) });
  } catch (e) {
    const err = toAuthServiceError(e, 'forgot-password');
    if (err.status === 429 || err.status === 'FETCH_ERROR') throw err;
  }
  return { message: 'If an account exists with this email, a reset code has been sent.' };
}

export async function confirmPasswordReset(input: { email: string; code: string; newPassword: string }): Promise<void> {
  try {
    await confirmResetPassword({ username: normalizeEmail(input.email), confirmationCode: input.code, newPassword: input.newPassword });
  } catch (e) {
    throw toAuthServiceError(e, 'reset-password');
  }
}

/** The ID token for the API (it carries the `email` and `name` claims the API reads); null when signed out. Renews an expired one. */
export async function getIdToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
  const session = await fetchAuthSession(options);
  return session.tokens?.idToken?.toString() ?? null;
}

/** True while this tab itself is signing out, so `onSessionEnded` does not report it as a session that ended by itself. */
let signingOut = false;

async function endSession(end: () => Promise<void>): Promise<void> {
  signingOut = true;
  try {
    await end();
  } finally {
    signingOut = false;
  }
}

/** Ends this device's session. A Google session also goes through Cognito's logout page and returns to the signed-out login view. */
export async function logout(): Promise<void> {
  await endSession(() => signOut());
}

/**
 * Ends every session of the user. The session is renewed first: Amplify's global sign-out silently does nothing
 * server-side when the stored access token has expired. A Google session then leaves for Cognito's logout page,
 * which returns to the "logged out everywhere" view; its URL is one of the config's `redirectSignOut`.
 */
export async function logoutEverywhere(): Promise<void> {
  await fetchAuthSession();
  await endSession(() => signOut({ global: true, oauth: { redirectUrl: `${window.location.origin}${LOGGED_OUT_EVERYWHERE_URL}` } }));
}

/** Leaves for Google. `from` is the in-app page to return to; it comes back through `finishGoogleSignIn`. */
export async function startGoogleSignIn(from?: string | null): Promise<void> {
  await signInWithRedirect({ provider: 'Google', customState: safeDestination(from) ?? undefined });
}

export interface GoogleSignInResult {
  ok: boolean;
  /** With `ok: false`: no Google sign-in was in progress in this browser (an old or foreign callback link), as opposed to one that failed. */
  expired?: boolean;
  destination?: string | null;
  /** True when this sign-in created the Google identity (for analytics). */
  firstSignIn?: boolean;
  user?: AuthUser;
}

/** A federated identity created in the last minute means this sign-in made the account. */
export function isFirstSignIn(payload: IdPayload): boolean {
  const identities = payload?.identities as { dateCreated?: string | number }[] | undefined;
  const created = Number(identities?.[0]?.dateCreated);
  return Number.isFinite(created) && Date.now() - created < 60_000;
}

/** Reads what the redirect left and forgets it, so one sign-in's outcome never colours the next. */
function takeOAuthOutcome(): { customState: string | null; failed: boolean } {
  const outcome = { customState: oauthCustomState, failed: oauthFailed };
  oauthCustomState = null;
  oauthFailed = false;
  return outcome;
}

/** On the callback page: resolves once Amplify has exchanged the code (or failed to). `ok: false` means no session came out of it. */
export async function finishGoogleSignIn(): Promise<GoogleSignInResult> {
  try {
    const payload = await currentIdPayload();
    if (!payload) {
      // Amplify raises its failure event just after it releases waiters; let it land before reading the flag.
      await new Promise((resolve) => setTimeout(resolve));
      return { ok: false, expired: !takeOAuthOutcome().failed };
    }
    return { ok: true, destination: safeDestination(takeOAuthOutcome().customState), firstSignIn: isFirstSignIn(payload), user: userFrom(payload) };
  } catch {
    takeOAuthOutcome();
    return { ok: false };
  }
}

/**
 * Removes a session that cannot be used (malformed, refused by the API after a renewal, or of a deleted account) from this
 * browser, so the next load does not retry it. It does not call `signOut()`: after a Google sign-in that ends with a
 * navigation to Cognito's logout page, which loses the router state of the caller.
 */
export function discardSession(): void {
  clearStoredSession();
}

/**
 * Runs `onEnd` when the session ends without this tab asking: a sign-out in another tab, or a refresh that Cognito refused.
 * A refresh that failed for another reason (offline) keeps the session, so it is not reported. Returns the unsubscribe.
 */
export function onSessionEnded(onEnd: () => void): () => void {
  return Hub.listen('auth', ({ payload }) => {
    if (payload.event === 'signedOut' && !signingOut) onEnd();
    // Amplify fires this for every failed refresh and clears the tokens just after, for a refused one only.
    if (payload.event === 'tokenRefresh_failure') setTimeout(() => !hasStoredSession() && onEnd());
  });
}
