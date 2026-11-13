/**
 * The address as Cognito must receive it. The user pools match sign-in emails case-sensitively and that cannot be
 * changed on an existing pool, so every auth call (authService.ts) and the per-address cooldown (AuthPage.tsx) use one
 * form: trimmed and lower-case.
 */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
