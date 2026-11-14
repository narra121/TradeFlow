export const LOGGED_OUT_URL = '/login?view=logged-out';
/** Where Cognito's logout page returns after `Log out everywhere`; the log-in page shows the "logged out on all devices" view for it. */
export const LOGGED_OUT_EVERYWHERE_URL = '/login?view=logged-out&scope=all';

let active = false;

/** True between choosing `Log out` and landing on the signed-out view, so the guard on `/app` sends the user there instead of to the plain log-in redirect. */
export const isLoggingOut = (): boolean => active;
export const setLoggingOut = (value: boolean): void => {
  active = value;
};
