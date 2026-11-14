/**
 * What a visitor typed into the prerendered /login or /signup form before the app replaced it (main.tsx mounts with
 * createRoot, which throws the prerendered markup away). Held in memory only, for the one hand-over to AuthPage: the
 * password is never stored, logged or sent anywhere from here.
 */
export interface PrerenderedInput {
  path: string;
  email: string;
  password: string;
  /** The field the caret was in, so typing carries on there. */
  focus: 'email' | 'password' | null;
}

let held: PrerenderedInput | null = null;

/** Reads the prerendered auth fields out of `root` (ids `auth-email`, `auth-password`). Call just before React replaces it. */
export function capturePrerenderedInput(root: ParentNode, path: string): void {
  const email = root.querySelector<HTMLInputElement>('#auth-email');
  const password = root.querySelector<HTMLInputElement>('#auth-password');
  if (!email && !password) return;
  const active = document.activeElement;
  const focus = active && active === email ? 'email' : active && active === password ? 'password' : null;
  if (!email?.value && !password?.value && !focus) return;
  held = { path, email: email?.value ?? '', password: password?.value ?? '', focus };
}

/** The captured input for `path`, if any; it stays until `clearPrerenderedInput`. */
export function peekPrerenderedInput(path: string): PrerenderedInput | null {
  return held && held.path === path ? held : null;
}

export function clearPrerenderedInput(): void {
  held = null;
}
