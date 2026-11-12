import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, isJwtExpired } from '../jwt';

function makeToken(payload: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${b64url}.sig`;
}

describe('decodeJwtPayload', () => {
  it('decodes non-ASCII names', () => {
    expect(decodeJwtPayload(makeToken({ sub: 'u1', name: 'Zoë Müller' }))?.name).toBe('Zoë Müller');
  });

  it('decodes base64url characters', () => {
    const payload = { sub: 'u2', note: '>>>???~~~' };
    expect(decodeJwtPayload(makeToken(payload))).toEqual(payload);
  });

  it('returns null for malformed input', () => {
    expect(decodeJwtPayload(null)).toBeNull();
    expect(decodeJwtPayload('nope')).toBeNull();
    expect(decodeJwtPayload('a.!!!.c')).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('compares exp (seconds) with the clock', () => {
    const now = 1_000_000_000_000;
    expect(isJwtExpired(makeToken({ exp: now / 1000 + 60 }), now)).toBe(false);
    expect(isJwtExpired(makeToken({ exp: now / 1000 - 1 }), now)).toBe(true);
    expect(isJwtExpired('garbage', now)).toBe(true);
  });
});
