import { beforeEach, describe, expect, it } from 'vitest';
import { finishOAuth, safeDestination, startOAuth, takeOAuthDestination } from '../oauth';

describe('oauth state + PKCE', () => {
  beforeEach(() => sessionStorage.clear());

  it('creates a state and an S256 challenge and accepts the matching state once', async () => {
    const { state, codeChallenge } = await startOAuth();
    expect(state.length).toBeGreaterThan(20);
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const result = finishOAuth(state);
    expect(result?.verifier).toBeTruthy();
    expect(result?.from).toBeNull();
    expect(finishOAuth(state)).toBeNull();
  });

  it('rejects a wrong or missing state', async () => {
    await startOAuth();
    expect(finishOAuth('forged')).toBeNull();
    await startOAuth();
    expect(finishOAuth(null)).toBeNull();
  });

  it('rejects a callback when nothing was started', () => {
    expect(finishOAuth('anything')).toBeNull();
  });

  it('stores the in-app destination with the state and returns it once', async () => {
    const { state } = await startOAuth('/app/trades?trade=t1');
    expect(finishOAuth(state)?.from).toBe('/app/trades?trade=t1');
    await startOAuth('/app/goals');
    expect(takeOAuthDestination()).toBe('/app/goals');
    expect(takeOAuthDestination()).toBeNull();
  });

  it('drops a destination that is not an in-app path', async () => {
    expect(safeDestination('//evil.example/app')).toBeNull();
    expect(safeDestination('https://evil.example/app')).toBeNull();
    expect(safeDestination('/application')).toBeNull();
    expect(safeDestination('/app')).toBe('/app');
    const { state } = await startOAuth('https://evil.example');
    expect(finishOAuth(state)?.from).toBeNull();
  });
});
