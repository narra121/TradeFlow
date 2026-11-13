import { describe, expect, it } from 'vitest';
import { destinationFromOAuthState, safeDestination } from '../destination';

const hex = (s: string) => s.split('').map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

describe('safeDestination', () => {
  it.each(['/app', '/app/trades', '/app?tab=1', '/app#x', '/app/trades?x=1'])('keeps %s', (p) => expect(safeDestination(p)).toBe(p));
  it.each(['/application', '//evil.example/app', 'https://evil.example/app', '/login', '', null, undefined])('drops %s', (p) => expect(safeDestination(p as string)).toBeNull());
});

describe('destinationFromOAuthState', () => {
  it('reads the destination Amplify appended to its random state', () => {
    expect(destinationFromOAuthState(`Ab12Cd34-${hex('/app/goals')}`)).toBe('/app/goals');
  });
  it('drops a destination outside the app', () => {
    expect(destinationFromOAuthState(`Ab12Cd34-${hex('https://evil.example/')}`)).toBeNull();
  });
  it('returns null for a state with no custom part or a malformed one', () => {
    expect(destinationFromOAuthState('Ab12Cd34')).toBeNull();
    expect(destinationFromOAuthState('Ab12Cd34-zz')).toBeNull();
    expect(destinationFromOAuthState(null)).toBeNull();
  });
});
