/** Only an in-app path may be remembered as the post-login destination (no scheme, no `//host`). */
export function safeDestination(path: string | null | undefined): string | null {
  return typeof path === 'string' && /^\/app(?:[/?#]|$)/.test(path) ? path : null;
}

/**
 * The destination Amplify's `signInWithRedirect({ customState })` carries in the OAuth `state` parameter, which has the
 * shape `<random>-<hex of the custom state>`. Used on an error callback, where Amplify raises no custom-state event.
 */
export function destinationFromOAuthState(state: string | null | undefined): string | null {
  const hex = state?.split('-').slice(1).join('-');
  if (!hex || !/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return safeDestination((hex.match(/.{2}/g) as string[]).map((h) => String.fromCharCode(parseInt(h, 16))).join(''));
}
