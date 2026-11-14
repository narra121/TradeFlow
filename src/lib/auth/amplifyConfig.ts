import { Amplify, type ResourcesConfig } from 'aws-amplify';
import { LOGGED_OUT_EVERYWHERE_URL, LOGGED_OUT_URL } from '@/components/auth/loggingOut';
import { isAuthConfigured, isGoogleConfigured, COGNITO_CLIENT_ID, COGNITO_DOMAIN, COGNITO_USER_POOL_ID } from './authEnv';

/** Must be a Callback URL on the app client (JournalAWSSetup template.yaml `UserPoolClient`). */
export const OAUTH_CALLBACK_PATH = '/auth/callback';

/** The Amplify Auth configuration for one origin; the OAuth block exists only when a hosted-UI domain is set. */
export function buildAuthConfig(origin: string): ResourcesConfig {
  return {
    Auth: {
      Cognito: {
        userPoolId: COGNITO_USER_POOL_ID,
        userPoolClientId: COGNITO_CLIENT_ID,
        ...(isGoogleConfigured() && {
          loginWith: {
            oauth: {
              domain: COGNITO_DOMAIN,
              scopes: ['openid', 'email', 'profile'],
              // Every URL here must be registered on the app client exactly as written, including the query string.
              redirectSignIn: [`${origin}${OAUTH_CALLBACK_PATH}`],
              // The first one is where a plain `signOut()` returns to.
              redirectSignOut: [`${origin}${LOGGED_OUT_URL}`, `${origin}${LOGGED_OUT_EVERYWHERE_URL}`],
              responseType: 'code',
              providers: ['Google'],
            },
          },
        }),
      },
    },
  };
}

let configured = false;

/**
 * Configures Amplify once. Call it before the first render: Amplify finishes a Google redirect (code + PKCE
 * exchange) as soon as it is configured on the callback page.
 */
export function configureAuth(origin: string = window.location.origin): void {
  if (configured) return;
  if (!isAuthConfigured()) {
    if (import.meta.env.MODE === 'test') return;
    throw new Error('VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID are not set');
  }
  Amplify.configure(buildAuthConfig(origin));
  configured = true;
}
