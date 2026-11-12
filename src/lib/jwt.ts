export interface JwtPayload {
  sub?: string;
  exp?: number;
  email?: string;
  name?: string;
  'cognito:username'?: string;
  [claim: string]: unknown;
}

/** Decodes the payload of a base64url JWT as UTF-8 (atob alone breaks on non-ASCII names). Returns null if malformed. */
export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string | null | undefined, nowMs: number = Date.now()): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp !== 'number' || exp * 1000 <= nowMs;
}
