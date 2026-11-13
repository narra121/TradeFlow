import { readApiError } from '@/lib/apiError';

/** The failure of a password-change step: the API's own message, or the connection message when nothing answered. */
export function passwordErrorMessage(err: unknown): string {
  return readApiError(err, "Couldn't change the password. Check the code and try again.").message;
}

export function emailMatches(typed: string, email: string): boolean {
  return email.length > 0 && typed.trim().toLowerCase() === email.toLowerCase();
}

/** The log-in page shows the "logged out on all devices" view for this URL. */
export const LOGGED_OUT_EVERYWHERE_URL = '/login?view=logged-out&scope=all';
