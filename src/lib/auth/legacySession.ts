import { COGNITO_CLIENT_ID, COGNITO_USER_POOL_ID } from './authEnv';

/**
 * Before Amplify, the app kept the ID token and the 30-day refresh token in localStorage as `idToken` and `refreshToken`.
 * Nothing reads them any more, so a browser that still has them would keep a live refresh token that Log out never
 * reaches. Removes both and asks Cognito to revoke the refresh token (best effort: a token issued before revocation was
 * enabled, or an unreachable network, just stays unrevoked). The user signs in again once.
 */
export function retireLegacySession(): void {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    if (!refreshToken || !COGNITO_CLIENT_ID || !COGNITO_USER_POOL_ID) return;
    const region = COGNITO_USER_POOL_ID.split('_')[0];
    void fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.RevokeToken' },
      body: JSON.stringify({ ClientId: COGNITO_CLIENT_ID, Token: refreshToken }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // storage blocked: nothing was stored either
  }
}
