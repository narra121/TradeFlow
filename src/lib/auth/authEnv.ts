/**
 * The Cognito values the build supplies (CI secrets VITE_COGNITO_*; a local `.env.development.local` for `vite`).
 * Plain reads with no library import, so the sign-in page, the entry choice and the stored-session reader can use
 * them without pulling in Amplify.
 */
export const COGNITO_USER_POOL_ID: string = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
export const COGNITO_CLIENT_ID: string = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
/** Hosted-UI domain without scheme (`auth-tradequt-dev.tradequt.com`); empty turns Google sign-in off. */
export const COGNITO_DOMAIN: string = import.meta.env.VITE_COGNITO_DOMAIN || '';

export function isAuthConfigured(): boolean {
  return !!COGNITO_USER_POOL_ID && !!COGNITO_CLIENT_ID;
}

/** The Google button, and the `or` divider that follows it, exist only when Google sign-in is configured. */
export function isGoogleConfigured(): boolean {
  return isAuthConfigured() && !!COGNITO_DOMAIN;
}
