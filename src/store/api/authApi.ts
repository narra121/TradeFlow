import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { api } from './baseApi';
import { discardSession, logout as signOutDevice, logoutEverywhere as signOutEverywhere, resendCode, toAuthServiceError, login, signup, confirmSignup, forgotPassword, confirmPasswordReset } from '@/lib/auth/authService';
import { readStoredClaims } from '@/lib/auth/storedSession';
import type { LoginPayload, SignupPayload, ConfirmSignupPayload, ForgotPasswordPayload, ResetPasswordPayload, AuthResponse } from '@/lib/api';

/** Runs an auth call as an RTK `queryFn`: a failure becomes the `{ status, data }` error the auth pages read. */
async function run<T>(call: () => Promise<T>) {
  try {
    return { data: await call() };
  } catch (e) {
    const { status, data, message } = toAuthServiceError(e, 'login');
    return { error: { status, data, error: message } as FetchBaseQueryError };
  }
}

/** Drops what is cached for this user so the next one on this browser does not see it. Must run before the session ends: a Google sign-out leaves the page. */
async function clearUserCaches() {
  const userId = readStoredClaims()?.sub;
  if (userId) {
    const { clearDatabase } = await import('@/lib/cache/trade-cache');
    await clearDatabase(userId).catch(() => undefined);
  }
  const { clearImageCache } = await import('./imageCache');
  await clearImageCache();
}

export const authApi = api.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    signup: builder.mutation<{ user: { id: string; name: string; email: string }; message: string; resent?: true }, SignupPayload>({
      queryFn: (payload) => run(() => signup(payload)),
    }),

    confirmSignup: builder.mutation<void, ConfirmSignupPayload>({
      queryFn: (payload) => run(() => confirmSignup(payload)),
    }),

    /** A new confirmation code for an unconfirmed address; it does not create or touch the account. */
    resendCode: builder.mutation<void, { email: string }>({
      queryFn: ({ email }) => run(() => resendCode(email)),
    }),

    login: builder.mutation<AuthResponse, LoginPayload>({
      queryFn: ({ email, password }) => run(() => login(email, password)),
      invalidatesTags: ['Auth'],
    }),

    forgotPassword: builder.mutation<{ message: string }, ForgotPasswordPayload>({
      queryFn: (payload) => run(() => forgotPassword(payload)),
    }),

    resetPassword: builder.mutation<void, ResetPasswordPayload>({
      queryFn: (payload) => run(() => confirmPasswordReset(payload)),
    }),

    /** This device only. */
    logout: builder.mutation<void, void>({
      queryFn: () =>
        run(async () => {
          await clearUserCaches();
          await signOutDevice();
        }),
    }),

    /** After the account was deleted: nothing is left to sign out of at Cognito, so this only clears the browser, without the Google redirect that `logout` makes. */
    clearDeletedSession: builder.mutation<void, void>({
      queryFn: () =>
        run(async () => {
          await clearUserCaches();
          discardSession();
        }),
    }),

    /** Every device: Cognito revokes all refresh tokens of the user. */
    logoutEverywhere: builder.mutation<void, void>({
      queryFn: () =>
        run(async () => {
          await clearUserCaches();
          await signOutEverywhere();
        }),
    }),
  }),
});

export const {
  useSignupMutation,
  useConfirmSignupMutation,
  useResendCodeMutation,
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useClearDeletedSessionMutation,
  useLogoutEverywhereMutation,
} = authApi;
