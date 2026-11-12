import { readApiError } from '@/lib/apiError';

/** Maps the Cognito messages the auth handlers pass through to a sentence that says what to do. */
export function passwordErrorMessage(err: unknown): string {
  const { message, status } = readApiError(err, '');
  if (status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  if (/expired/i.test(message)) return 'That code has expired. Send a new code.';
  if (/code/i.test(message) && /(invalid|mismatch|incorrect)/i.test(message)) return 'That code is not right. Check the email and try again.';
  if (/password/i.test(message) && message.length < 160) return message;
  return "Couldn't change the password. Check the code and try again.";
}

export function emailMatches(typed: string, email: string): boolean {
  return email.length > 0 && typed.trim().toLowerCase() === email.toLowerCase();
}

/** The log-in page shows the "logged out on all devices" view for this URL. */
export const LOGGED_OUT_EVERYWHERE_URL = '/login?view=logged-out&scope=all';
