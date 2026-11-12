/** Paths served by the app entry: they need the store and auth. */
const APP_PATH = /^\/(app|login|signup|auth)(\/|$)/;

/**
 * Which bundle opens first. A signed-out visitor on a public page gets the light public entry; a stored token
 * means `/` redirects into the app, so signed-in users always get the full one.
 */
export function entryFor(pathname: string, idToken: string | null): 'public' | 'app' {
  return APP_PATH.test(pathname) || idToken ? 'app' : 'public';
}
