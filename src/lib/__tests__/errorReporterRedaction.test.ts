import { describe, expect, it } from 'vitest';
import { redactSecrets } from '../errorReporter';

describe('redactSecrets', () => {
  it('removes bearer tokens', () => {
    expect(redactSecrets('curl -H "Authorization: Bearer abc.def.ghi"')).not.toContain('abc.def.ghi');
  });

  it('removes token and password fields from JSON bodies', () => {
    const body = JSON.stringify({ IdToken: 'x1', RefreshToken: 'x2', AccessToken: 'x3', password: 'hunter2', email: 'a@b.c' });
    const out = redactSecrets(body);
    expect(out).not.toMatch(/x1|x2|x3|hunter2/);
    expect(out).toContain('a@b.c');
    expect(out).not.toContain('Bearer');
    expect(out).not.toContain('IdToken":"x');
  });

  it('removes tokens in form-encoded bodies and raw JWTs', () => {
    const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJl';
    expect(redactSecrets(`grant_type=refresh_token&refresh_token=secret123&client_id=abc`)).not.toContain('secret123');
    expect(redactSecrets(`failed for ${jwt}`)).not.toContain('eyJzdWIi');
  });

  it('passes null and empty strings through', () => {
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets('')).toBe('');
  });
});
