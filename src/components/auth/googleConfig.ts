export const COGNITO_DOMAIN: string = import.meta.env.VITE_COGNITO_DOMAIN || '';
export const COGNITO_CLIENT_ID: string = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

/** The Google button and the `or` divider that follows it exist only when Google sign-in is configured. */
export function isGoogleConfigured(): boolean {
  return !!COGNITO_DOMAIN && !!COGNITO_CLIENT_ID;
}
