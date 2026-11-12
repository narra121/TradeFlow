import { describe, expect, it } from 'vitest';
import { entryFor } from '../entry';

describe('entryFor', () => {
  it('opens public pages without the app when signed out', () => {
    for (const p of ['/', '/blog', '/blog/risk-management', '/guide', '/resources/position-size', '/changelog', '/anything-else']) {
      expect(entryFor(p, null)).toBe('public');
    }
  });

  it('opens the app, auth and callback paths with the app entry', () => {
    for (const p of ['/app', '/app/dashboard', '/login', '/signup', '/auth/callback']) {
      expect(entryFor(p, null)).toBe('app');
    }
  });

  it('does not mistake a public path that merely starts like an app one', () => {
    expect(entryFor('/application', null)).toBe('public');
    expect(entryFor('/login-help', null)).toBe('public');
  });

  it('gives a signed-in user the full entry everywhere', () => {
    expect(entryFor('/', 'token')).toBe('app');
    expect(entryFor('/blog', 'token')).toBe('app');
  });
});
