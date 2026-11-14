import { readApiError } from '@/lib/apiError';

/** The failure of a password-change step: the API's own message, or the connection message when nothing answered. */
export function passwordErrorMessage(err: unknown): string {
  return readApiError(err, "Couldn't change the password. Check the code and try again.").message;
}

export function emailMatches(typed: string, email: string): boolean {
  return email.length > 0 && typed.trim().toLowerCase() === email.toLowerCase();
}
