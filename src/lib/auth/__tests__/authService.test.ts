import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeAuthError } from '@/components/auth/authErrors';
import { readApiError } from '@/lib/apiError';

const amplify = vi.hoisted(() => ({
  confirmResetPassword: vi.fn(),
  confirmSignUp: vi.fn(),
  fetchAuthSession: vi.fn(),
  resendSignUpCode: vi.fn(),
  resetPassword: vi.fn(),
  signIn: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}));
const hub = vi.hoisted(() => ({ handlers: [] as Array<(m: { payload: { event: string; data?: unknown } }) => void> }));

vi.mock('aws-amplify/auth', () => amplify);
vi.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: vi.fn((_channel: string, cb: (typeof hub.handlers)[number]) => {
      hub.handlers.push(cb);
      return () => {
        hub.handlers = hub.handlers.filter((h) => h !== cb);
      };
    }),
  },
}));
vi.mock('../amplifyConfig', () => ({ configureAuth: vi.fn() }));

const svc = await import('../authService');
const emit = (event: string, data?: unknown) => hub.handlers.forEach((h) => h({ payload: { event, data } }));

/** What Amplify throws: an Error whose `name` is the Cognito exception. */
const cognito = (name: string, message = name) => Object.assign(new Error(message), { name });
const session = (payload: Record<string, unknown>) => ({ tokens: { idToken: { payload, toString: () => 'id.jwt.token' } } });
const rejection = async (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as InstanceType<typeof svc.AuthServiceError>);

beforeEach(() => {
  Object.values(amplify).forEach((fn) => fn.mockReset());
  emit('customOAuthState', null);
});

describe('login', () => {
  it('signs in over SRP (default flow, no password flow) and reads the user from the ID token', async () => {
    amplify.signIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    amplify.fetchAuthSession.mockResolvedValue(session({ sub: 'u-1', name: 'Quinn', email: 'q@x.io' }));
    await expect(svc.login('q@x.io', 'Pw!12345')).resolves.toEqual({ user: { id: 'u-1', name: 'Quinn', email: 'q@x.io' } });
    expect(amplify.signIn).toHaveBeenCalledWith({ username: 'q@x.io', password: 'Pw!12345' });
  });

  it('answers a wrong password like the old endpoint: 400 UNAUTHORIZED, shown as incorrect credentials', async () => {
    amplify.signIn.mockRejectedValue(cognito('NotAuthorizedException', 'Incorrect username or password.'));
    const err = await rejection(svc.login('q@x.io', 'bad'));
    expect(err).toMatchObject({ status: 400, data: { errorCode: 'UNAUTHORIZED', message: 'Invalid email or password', success: false } });
    expect(describeAuthError(err, 'login').kind).toBe('credentials');
  });

  it('never repeats Cognito wording', async () => {
    amplify.signIn.mockRejectedValue(cognito('NotAuthorizedException', 'Incorrect username or password.'));
    expect(JSON.stringify(await rejection(svc.login('q@x.io', 'bad')))).not.toMatch(/Incorrect username/);
  });

  it('turns Cognito lockout after repeated failures into a 429 with no wait time', async () => {
    amplify.signIn.mockRejectedValue(cognito('NotAuthorizedException', 'Password attempts exceeded'));
    const err = await rejection(svc.login('q@x.io', 'bad'));
    expect(err).toMatchObject({ status: 429, data: { errorCode: 'RATE_LIMITED' } });
    const info = describeAuthError(err, 'login');
    expect(info.kind).toBe('rate');
    expect(info.retryAfter).toBeUndefined();
    expect(info.message).toBe('Log in is paused for this email. Try again in a few minutes.');
  });

  it('reports an unconfirmed email as 403 EMAIL_NOT_VERIFIED (Amplify returns CONFIRM_SIGN_UP, not an exception)', async () => {
    amplify.signIn.mockResolvedValue({ isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_UP' } });
    const err = await rejection(svc.login('q@x.io', 'Pw!12345'));
    expect(err).toMatchObject({ status: 403, data: { errorCode: 'EMAIL_NOT_VERIFIED' } });
    expect(describeAuthError(err, 'login').kind).toBe('unverified');
  });

  it('treats any other sign-in step (forced reset, MFA) as failed credentials', async () => {
    amplify.signIn.mockResolvedValue({ isSignedIn: false, nextStep: { signInStep: 'RESET_PASSWORD' } });
    expect(await rejection(svc.login('q@x.io', 'Pw!12345'))).toMatchObject({ status: 400, data: { errorCode: 'UNAUTHORIZED' } });
  });

  it('maps an unreachable Cognito to FETCH_ERROR, which the UI shows as a connection problem', async () => {
    amplify.signIn.mockRejectedValue(cognito('NetworkError', 'Network error'));
    const err = await rejection(svc.login('q@x.io', 'Pw!12345'));
    expect(err.status).toBe('FETCH_ERROR');
    expect(describeAuthError(err, 'login').kind).toBe('network');
    expect(readApiError(err).kind).toBe('network');
  });

  it('ends a leftover session and signs in again once', async () => {
    amplify.signIn
      .mockRejectedValueOnce(cognito('UserAlreadyAuthenticatedException'))
      .mockResolvedValueOnce({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    amplify.signOut.mockResolvedValue(undefined);
    amplify.fetchAuthSession.mockResolvedValue(session({ sub: 'u-2', email: 'q@x.io' }));
    await expect(svc.login('q@x.io', 'Pw!12345')).resolves.toMatchObject({ user: { id: 'u-2' } });
    expect(amplify.signOut).toHaveBeenCalledTimes(1);
    expect(amplify.signIn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the typed email and the Cognito username when the token lacks them', async () => {
    amplify.signIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    amplify.fetchAuthSession.mockResolvedValue(session({ sub: 'u-3', 'cognito:username': 'Google_1' }));
    await expect(svc.login('typed@x.io', 'Pw!12345')).resolves.toEqual({ user: { id: 'u-3', name: 'Google_1', email: 'typed@x.io' } });
  });
});

describe('signup', () => {
  const input = { name: 'Quinn', email: 'q@x.io', password: 'Pw!12345' };

  it('creates the account with the email and name attributes', async () => {
    amplify.signUp.mockResolvedValue({ userId: 'u-9', isSignUpComplete: false, nextStep: { signUpStep: 'CONFIRM_SIGN_UP' } });
    const r = await svc.signup(input);
    expect(r).toMatchObject({ user: { id: 'u-9', name: 'Quinn', email: 'q@x.io' }, message: 'User created. Please check your email for a confirmation code.' });
    expect(r.resent).toBeUndefined();
    expect(amplify.signUp).toHaveBeenCalledWith({ username: 'q@x.io', password: 'Pw!12345', options: { userAttributes: { email: 'q@x.io', name: 'Quinn' } } });
  });

  it('resends the code when the address is registered but unconfirmed', async () => {
    amplify.signUp.mockRejectedValue(cognito('UsernameExistsException'));
    amplify.resendSignUpCode.mockResolvedValue({});
    await expect(svc.signup(input)).resolves.toMatchObject({ resent: true, user: { email: 'q@x.io' } });
    expect(amplify.resendSignUpCode).toHaveBeenCalledWith({ username: 'q@x.io' });
  });

  it('reads the Pre sign-up trigger refusal (Google or confirmed account) as USER_EXISTS', async () => {
    amplify.signUp.mockRejectedValue(cognito('UserLambdaValidationException', 'PreSignUp failed with error USER_EXISTS.'));
    const err = await rejection(svc.signup(input));
    expect(err).toMatchObject({ status: 400, data: { errorCode: 'USER_EXISTS' } });
    expect(describeAuthError(err, 'signup').kind).toBe('exists');
  });

  it('treats any other trigger failure as a server error, not as the user is wrong', async () => {
    amplify.signUp.mockRejectedValue(cognito('UserLambdaValidationException', 'PreSignUp failed with error Internal.'));
    expect(await rejection(svc.signup(input))).toMatchObject({ status: 500, data: { errorCode: 'INTERNAL_ERROR' } });
  });

  it('shows a rejected password as a password problem', async () => {
    amplify.signUp.mockRejectedValue(cognito('InvalidPasswordException', 'Password did not conform with policy'));
    const err = await rejection(svc.signup(input));
    expect(err).toMatchObject({ status: 400, data: { errorCode: 'VALIDATION_ERROR' } });
    expect(describeAuthError(err, 'signup').kind).toBe('password');
  });

  it('maps Cognito throttling to 429 and the UI falls back to "a few minutes"', async () => {
    amplify.signUp.mockRejectedValue(cognito('TooManyRequestsException'));
    const info = describeAuthError(await rejection(svc.signup(input)), 'signup');
    expect(info).toMatchObject({ kind: 'rate', message: 'Creating an account is paused for this email. Try again in a few minutes.' });
  });

  it('reports a throttled resend as a rate limit', async () => {
    amplify.signUp.mockRejectedValue(cognito('UsernameExistsException'));
    amplify.resendSignUpCode.mockRejectedValue(cognito('LimitExceededException', 'Attempt limit exceeded, please try after some time.'));
    expect(await rejection(svc.signup(input))).toMatchObject({ status: 429, data: { errorCode: 'RATE_LIMITED' } });
  });

  it('turns an Amplify client-side empty-field check into bad input', async () => {
    amplify.signUp.mockRejectedValue(cognito('EmptySignUpPassword', 'password is required to signUp'));
    expect(await rejection(svc.signup({ ...input, password: '' }))).toMatchObject({ status: 400, data: { errorCode: 'VALIDATION_ERROR' } });
  });
});

describe('resendCode, confirmSignup', () => {
  it('resends through Cognito', async () => {
    amplify.resendSignUpCode.mockResolvedValue({});
    await expect(svc.resendCode('q@x.io')).resolves.toBeUndefined();
    expect(amplify.resendSignUpCode).toHaveBeenCalledWith({ username: 'q@x.io' });
  });

  it('confirms with the code', async () => {
    amplify.confirmSignUp.mockResolvedValue({ isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } });
    await expect(svc.confirmSignup({ email: 'q@x.io', code: '123456' })).resolves.toBeUndefined();
    expect(amplify.confirmSignUp).toHaveBeenCalledWith({ username: 'q@x.io', confirmationCode: '123456' });
  });

  it.each([
    ['CodeMismatchException', 'code-invalid', 400, 'CODE_INVALID'],
    ['ExpiredCodeException', 'code-expired', 400, 'CODE_EXPIRED'],
    ['UserNotFoundException', 'code-invalid', 400, 'CODE_INVALID'],
    ['NotAuthorizedException', 'confirmed', 400, 'ALREADY_CONFIRMED'],
    ['LimitExceededException', 'attempts', 429, 'RATE_LIMITED'],
  ])('maps %s on confirm to the %s wording', async (name, kind, status, errorCode) => {
    amplify.confirmSignUp.mockRejectedValue(cognito(name));
    const err = await rejection(svc.confirmSignup({ email: 'q@x.io', code: '000000' }));
    expect(err).toMatchObject({ status, data: { errorCode } });
    expect(describeAuthError(err, 'confirm').kind).toBe(kind);
  });
});

describe('forgotPassword, confirmPasswordReset', () => {
  it('starts a reset and returns the same sentence the old endpoint did', async () => {
    amplify.resetPassword.mockResolvedValue({ isPasswordReset: false, nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' } });
    await expect(svc.forgotPassword({ email: 'q@x.io' })).resolves.toEqual({ message: 'If an account exists with this email, a reset code has been sent.' });
    expect(amplify.resetPassword).toHaveBeenCalledWith({ username: 'q@x.io' });
  });

  it.each(['UserNotFoundException', 'InvalidParameterException', 'NotAuthorizedException', 'CodeDeliveryFailureException'])(
    'answers the same when Cognito says %s, so an address cannot be probed',
    async (name) => {
      amplify.resetPassword.mockRejectedValue(cognito(name));
      await expect(svc.forgotPassword({ email: 'nobody@x.io' })).resolves.toMatchObject({ message: expect.stringContaining('If an account exists') });
    },
  );

  it('still reports throttling and a lost connection', async () => {
    amplify.resetPassword.mockRejectedValueOnce(cognito('LimitExceededException'));
    expect(await rejection(svc.forgotPassword({ email: 'q@x.io' }))).toMatchObject({ status: 429 });
    amplify.resetPassword.mockRejectedValueOnce(cognito('NetworkError'));
    expect((await rejection(svc.forgotPassword({ email: 'q@x.io' }))).status).toBe('FETCH_ERROR');
  });

  it('sets the new password with the code', async () => {
    amplify.confirmResetPassword.mockResolvedValue(undefined);
    await svc.confirmPasswordReset({ email: 'q@x.io', code: '123456', newPassword: 'New!pass1' });
    expect(amplify.confirmResetPassword).toHaveBeenCalledWith({ username: 'q@x.io', confirmationCode: '123456', newPassword: 'New!pass1' });
  });

  it.each([
    ['CodeMismatchException', 'code-invalid'],
    ['ExpiredCodeException', 'code-expired'],
    ['InvalidPasswordException', 'password'],
    ['LimitExceededException', 'rate'],
  ])('maps %s on reset to %s', async (name, kind) => {
    amplify.confirmResetPassword.mockRejectedValue(cognito(name));
    const err = await rejection(svc.confirmPasswordReset({ email: 'q@x.io', code: '000000', newPassword: 'New!pass1' }));
    expect(describeAuthError(err, 'reset').kind).toBe(kind);
  });

  it('readApiError reads the thrown error like an HTTP error body', async () => {
    amplify.confirmResetPassword.mockRejectedValue(cognito('ExpiredCodeException'));
    const err = await rejection(svc.confirmPasswordReset({ email: 'q@x.io', code: '000000', newPassword: 'New!pass1' }));
    expect(readApiError(err)).toMatchObject({ message: 'That verification code has expired. Request a code again.', code: 'CODE_EXPIRED', status: 400 });
  });
});

describe('email case', () => {
  const typed = '  Quinn.Doe@X.io ';
  const sent = 'quinn.doe@x.io';

  it('signs in with the lower-case address and falls back to it for the user', async () => {
    amplify.signIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    amplify.fetchAuthSession.mockResolvedValue(session({ sub: 'u-4' }));
    await expect(svc.login(typed, 'Pw!12345')).resolves.toMatchObject({ user: { email: sent } });
    expect(amplify.signIn).toHaveBeenCalledWith({ username: sent, password: 'Pw!12345' });
  });

  it('signs up, resends and confirms with the lower-case address', async () => {
    amplify.signUp.mockRejectedValue(cognito('UsernameExistsException'));
    amplify.resendSignUpCode.mockResolvedValue({});
    amplify.confirmSignUp.mockResolvedValue({ isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } });
    await expect(svc.signup({ name: 'Quinn', email: typed, password: 'Pw!12345' })).resolves.toMatchObject({ user: { email: sent } });
    expect(amplify.signUp).toHaveBeenCalledWith({ username: sent, password: 'Pw!12345', options: { userAttributes: { email: sent, name: 'Quinn' } } });
    expect(amplify.resendSignUpCode).toHaveBeenCalledWith({ username: sent });
    await svc.resendCode(typed);
    expect(amplify.resendSignUpCode).toHaveBeenLastCalledWith({ username: sent });
    await svc.confirmSignup({ email: typed, code: '123456' });
    expect(amplify.confirmSignUp).toHaveBeenCalledWith({ username: sent, confirmationCode: '123456' });
  });

  it('starts and finishes a password reset with the lower-case address', async () => {
    amplify.resetPassword.mockResolvedValue({ isPasswordReset: false, nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' } });
    amplify.confirmResetPassword.mockResolvedValue(undefined);
    await svc.forgotPassword({ email: typed });
    expect(amplify.resetPassword).toHaveBeenCalledWith({ username: sent });
    await svc.confirmPasswordReset({ email: typed, code: '123456', newPassword: 'New!pass1' });
    expect(amplify.confirmResetPassword).toHaveBeenCalledWith({ username: sent, confirmationCode: '123456', newPassword: 'New!pass1' });
  });
});

describe('unknown failures', () => {
  it('are a 500 INTERNAL_ERROR with our sentence', async () => {
    amplify.signIn.mockRejectedValue(cognito('InternalErrorException', 'stack trace here'));
    const err = await rejection(svc.login('q@x.io', 'x'));
    expect(err).toMatchObject({ status: 500, data: { errorCode: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } });
    expect(describeAuthError(err, 'login').kind).toBe('server');
  });

  it('keep an error that already has our shape', () => {
    const e = new svc.AuthServiceError(429, { success: false, message: 'm', errorCode: 'RATE_LIMITED', errorMessage: 'm', error: { code: 'RATE_LIMITED', retryAfter: 30 } });
    expect(svc.toAuthServiceError(e, 'login')).toBe(e);
    expect(describeAuthError(e, 'login').retryAfter).toBe(30);
  });
});

describe('tokens and sessions', () => {
  it('returns the ID token string, passing forceRefresh through', async () => {
    amplify.fetchAuthSession.mockResolvedValue(session({ sub: 'u' }));
    await expect(svc.getIdToken({ forceRefresh: true })).resolves.toBe('id.jwt.token');
    expect(amplify.fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('returns null when signed out', async () => {
    amplify.fetchAuthSession.mockResolvedValue({});
    await expect(svc.getIdToken()).resolves.toBeNull();
  });

  it('logout ends only this device', async () => {
    amplify.signOut.mockResolvedValue(undefined);
    await svc.logout();
    expect(amplify.signOut).toHaveBeenCalledWith();
  });

  it("does not report this tab's own sign-out as a session that ended by itself", async () => {
    const onEnd = vi.fn();
    const stop = svc.onSessionEnded(onEnd);
    amplify.signOut.mockImplementation(async () => emit('signedOut'));
    await svc.logout();
    await svc.logoutEverywhere();
    expect(onEnd).not.toHaveBeenCalled();
    emit('signedOut');
    expect(onEnd).toHaveBeenCalledTimes(1);
    stop();
  });

  it('logoutEverywhere renews the session before the global sign-out', async () => {
    const order: string[] = [];
    amplify.fetchAuthSession.mockImplementation(async () => void order.push('fetchAuthSession'));
    amplify.signOut.mockImplementation(async () => void order.push('signOut'));
    await svc.logoutEverywhere();
    expect(order).toEqual(['fetchAuthSession', 'signOut']);
    expect(amplify.signOut).toHaveBeenCalledWith({ global: true });
  });

  it('calls back when the session ends by another tab or a refused refresh, not for other events', async () => {
    const onEnd = vi.fn();
    const stop = svc.onSessionEnded(onEnd);
    emit('tokenRefresh');
    emit('signedIn');
    expect(onEnd).not.toHaveBeenCalled();
    emit('signedOut');
    emit('tokenRefresh_failure');
    await new Promise((r) => setTimeout(r));
    expect(onEnd).toHaveBeenCalledTimes(2);
    stop();
    emit('signedOut');
    expect(onEnd).toHaveBeenCalledTimes(2);
  });

  it('keeps the session when a refresh failed but the tokens are still stored (offline)', async () => {
    localStorage.setItem('CognitoIdentityServiceProvider.c1.LastAuthUser', 'u');
    localStorage.setItem('CognitoIdentityServiceProvider.c1.u.accessToken', 'a.b.c');
    const onEnd = vi.fn();
    const stop = svc.onSessionEnded(onEnd);
    emit('tokenRefresh_failure', { error: cognito('NetworkError') });
    await new Promise((r) => setTimeout(r));
    expect(onEnd).not.toHaveBeenCalled();
    stop();
    localStorage.clear();
  });

  it('discardSession signs out through Amplify without reporting it as a session that ended by itself', async () => {
    const onEnd = vi.fn();
    const stop = svc.onSessionEnded(onEnd);
    amplify.signOut.mockImplementation(async () => emit('signedOut'));
    await svc.discardSession();
    expect(amplify.signOut).toHaveBeenCalledWith();
    expect(onEnd).not.toHaveBeenCalled();
    amplify.signOut.mockRejectedValue(cognito('OAuthSignOutException'));
    await expect(svc.discardSession()).resolves.toBeUndefined();
    stop();
  });
});

describe('Google sign-in', () => {
  it('leaves for Google carrying only an in-app destination', async () => {
    amplify.signInWithRedirect.mockResolvedValue(undefined);
    await svc.startGoogleSignIn('/app/trades?x=1');
    expect(amplify.signInWithRedirect).toHaveBeenLastCalledWith({ provider: 'Google', customState: '/app/trades?x=1' });
    await svc.startGoogleSignIn('https://evil.example/app');
    expect(amplify.signInWithRedirect).toHaveBeenLastCalledWith({ provider: 'Google', customState: undefined });
    await svc.startGoogleSignIn(null);
    expect(amplify.signInWithRedirect).toHaveBeenLastCalledWith({ provider: 'Google', customState: undefined });
  });

  it('finishes with the user, the remembered destination and a first-sign-in flag', async () => {
    emit('customOAuthState', '/app/goals');
    amplify.fetchAuthSession.mockResolvedValue(
      session({ sub: 'g-1', name: 'Gia', email: 'g@x.io', identities: [{ dateCreated: String(Date.now() - 5_000) }] }),
    );
    await expect(svc.finishGoogleSignIn()).resolves.toEqual({ ok: true, destination: '/app/goals', firstSignIn: true, user: { id: 'g-1', name: 'Gia', email: 'g@x.io' } });
  });

  it('refuses a remembered destination outside the app', async () => {
    emit('customOAuthState', 'https://evil.example/');
    amplify.fetchAuthSession.mockResolvedValue(session({ sub: 'g-1', identities: [{ dateCreated: '1' }] }));
    await expect(svc.finishGoogleSignIn()).resolves.toMatchObject({ ok: true, destination: null, firstSignIn: false });
  });

  it('is expired when no Google sign-in was in progress, failed when Amplify reported one that failed, and failed when reading the session threw', async () => {
    amplify.fetchAuthSession.mockResolvedValueOnce({ tokens: undefined });
    await expect(svc.finishGoogleSignIn()).resolves.toEqual({ ok: false, expired: true });
    amplify.fetchAuthSession.mockImplementationOnce(async () => {
      emit('signInWithRedirect_failure', { error: new Error('invalid_grant') });
      return { tokens: undefined };
    });
    await expect(svc.finishGoogleSignIn()).resolves.toEqual({ ok: false, expired: false });
    amplify.fetchAuthSession.mockRejectedValueOnce(cognito('NetworkError'));
    await expect(svc.finishGoogleSignIn()).resolves.toEqual({ ok: false });
  });

  it('isFirstSignIn is true only for an identity created within the last minute', () => {
    expect(svc.isFirstSignIn({ identities: [{ dateCreated: Date.now() - 1000 }] })).toBe(true);
    expect(svc.isFirstSignIn({ identities: [{ dateCreated: Date.now() - 120_000 }] })).toBe(false);
    expect(svc.isFirstSignIn({})).toBe(false);
    expect(svc.isFirstSignIn(undefined)).toBe(false);
  });
});
