import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useLocation } from 'react-router-dom';

vi.mock('@/pages/AppPage', () => ({ AppPage: () => <p>app page</p> }));
vi.mock('@/pages/SignupPage', () => ({ SignupPage: () => null }));
vi.mock('@/pages/AuthCallbackPage', () => ({ AuthCallbackPage: () => null }));
vi.mock('@/pages/LoginPage', () => ({
  LoginPage: () => <p data-testid="login">{String((useLocation().state as { reason?: string } | null)?.reason)}</p>,
}));
vi.mock('@/PublicRoutes', () => ({ LandingPage: () => null, NotFound: () => null, PublicRoutes: null }));
vi.mock('@/components/analytics', () => ({ AnalyticsRoot: () => null }));
vi.mock('@/lib/auth/amplifyConfig', () => ({ configureAuth: vi.fn() }));

const P = 'CognitoIdentityServiceProvider.c1';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
const cognitoKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('CognitoIdentityServiceProvider'));

let App: typeof import('../App').default;
let store: typeof import('@/store').store;

beforeAll(async () => {
  localStorage.setItem(`${P}.LastAuthUser`, 'u');
  localStorage.setItem(`${P}.u.accessToken`, 'a.b.c');
  localStorage.setItem(`${P}.u.idToken`, `h.${b64({ sub: 'u-1', exp: Math.floor(Date.now() / 1000) + 3600 })}.s`);
  localStorage.setItem(`${P}.oauthSignIn`, 'true,false');
  ({ default: App } = await import('../App'));
  ({ store } = await import('@/store'));
});

describe('a session the API refused (401)', () => {
  it('lands on log in with the session-ended reason, and its stored session is cleared afterwards', async () => {
    window.history.pushState({}, '', '/app/dashboard');
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    await screen.findByText('app page');

    act(() => void window.dispatchEvent(new CustomEvent('unauthorized')));

    expect(await screen.findByTestId('login')).toHaveTextContent('session-ended');
    await waitFor(() => expect(cognitoKeys()).toEqual([]));
    expect(screen.getByTestId('login')).toHaveTextContent('session-ended');
    expect(window.location.pathname).toBe('/login');
  });
});
