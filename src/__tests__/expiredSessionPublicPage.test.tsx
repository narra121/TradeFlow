import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

let resolveToken: (token: string | null) => void;
let endSession: () => void;

vi.mock('@/lib/auth/authService', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/auth/authService')>()),
  getIdToken: vi.fn(() => new Promise<string | null>((resolve) => (resolveToken = resolve))),
  onSessionEnded: vi.fn((onEnd: () => void) => {
    endSession = onEnd;
    return () => {};
  }),
}));
vi.mock('@/pages/AppPage', () => ({ AppPage: () => <p>app page</p> }));
vi.mock('@/pages/LoginPage', () => ({ LoginPage: () => <p>login page</p> }));
vi.mock('@/pages/SignupPage', () => ({ SignupPage: () => null }));
vi.mock('@/pages/AuthCallbackPage', () => ({ AuthCallbackPage: () => null }));
vi.mock('@/PublicRoutes', async () => {
  const { Route } = await import('react-router-dom');
  return { LandingPage: () => null, NotFound: () => null, PublicRoutes: <Route path="/blog" element={<p>blog page</p>} /> };
});
vi.mock('@/components/analytics', () => ({ AnalyticsRoot: () => null }));
vi.mock('@/lib/auth/amplifyConfig', () => ({ configureAuth: vi.fn() }));

const P = 'CognitoIdentityServiceProvider.c1';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
const cognitoKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('CognitoIdentityServiceProvider'));

/** Renders the app at `path` for a browser that signed in over an hour ago: tokens stored, the ID token expired. */
async function openSignedInWithExpiredToken(path: string) {
  localStorage.clear();
  localStorage.setItem(`${P}.LastAuthUser`, 'u');
  localStorage.setItem(`${P}.u.accessToken`, 'a.b.c');
  localStorage.setItem(`${P}.u.idToken`, `h.${b64({ sub: 'u-1', exp: Math.floor(Date.now() / 1000) - 600 })}.s`);
  vi.resetModules();
  const [{ default: App }, { store }] = await Promise.all([import('../App'), import('@/store')]);
  window.history.pushState({}, '', path);
  const view = render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  return { ...view, store };
}

describe('a signed-in visit with an expired ID token', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a public page at once, not a spinner while the session is renewed', async () => {
    const { container } = await openSignedInWithExpiredToken('/blog');
    expect(await screen.findByText('blog page')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeNull();
    await act(async () => resolveToken('new-token'));
    expect(screen.getByText('blog page')).toBeInTheDocument();
  });

  it('keeps a public page, signed out, when Cognito refuses the session', async () => {
    const { store } = await openSignedInWithExpiredToken('/blog');
    await screen.findByText('blog page');
    await act(async () => resolveToken(null));
    expect(window.location.pathname).toBe('/blog');
    expect(screen.getByText('blog page')).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(cognitoKeys()).toEqual([]);
  });

  it.each([
    ['Amplify ends the session (refused refresh, sign-out in another tab)', () => endSession()],
    ['an API call answers 401', () => window.dispatchEvent(new Event('unauthorized'))],
  ])('keeps a public page, signed out, when %s', async (_, end) => {
    const { store } = await openSignedInWithExpiredToken('/blog');
    await screen.findByText('blog page');
    await act(async () => end());
    await waitFor(() => expect(cognitoKeys()).toEqual([]));
    expect(window.location.pathname).toBe('/blog');
    expect(screen.getByText('blog page')).toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it('holds the app on the loading screen until the session is renewed', async () => {
    const { container } = await openSignedInWithExpiredToken('/app/dashboard');
    await waitFor(() => expect(container.querySelector('.animate-spin')).not.toBeNull());
    expect(screen.queryByText('app page')).toBeNull();
    await act(async () => resolveToken('new-token'));
    expect(await screen.findByText('app page')).toBeInTheDocument();
  });

  it('sends the app to log in when Cognito refuses the session', async () => {
    await openSignedInWithExpiredToken('/app/dashboard');
    await act(async () => resolveToken(null));
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});
