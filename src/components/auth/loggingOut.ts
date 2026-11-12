export const LOGGED_OUT_URL = '/login?view=logged-out';

let active = false;

/** True between choosing `Log out` and landing on the signed-out view, so the guard on `/app` sends the user there instead of to the plain log-in redirect. */
export const isLoggingOut = (): boolean => active;
export const setLoggingOut = (value: boolean): void => {
  active = value;
};
