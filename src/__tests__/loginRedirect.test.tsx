import { useEffect } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';

vi.mock('@/pages/AppPage', () => ({
  AppPage: () => <p data-testid="app">{useLocation().pathname}</p>,
}));
vi.mock('@/pages/AuthCallbackPage', () => ({ AuthCallbackPage: () => null }));
vi.mock('@/PublicRoutes', () => ({ LandingPage: () => null, NotFound: () => null, PublicRoutes: null }));
vi.mock('@/components/analytics', () => ({ AnalyticsRoot: () => null }));
vi.mock('@/lib/auth/amplifyConfig', () => ({ configureAuth: vi.fn() }));
// The form as AuthPage behaves: a successful log-in sets the user, and the page then calls onLogin.
vi.mock('@/components/auth/AuthPage', () => ({
  AuthPage: ({ onLogin }: { onLogin: () => void }) => {
    const dispatch = useAppDispatch();
    const signedIn = useAppSelector((s) => s.auth.isAuthenticated);
    useEffect(() => {
      if (signedIn) onLogin();
    }, [signedIn, onLogin]);
    return (
      <button type="button" onClick={() => dispatch(setUser({ id: 'u-1', name: 'T', email: 't@example.com' }))}>
        log in
      </button>
    );
  },
}));

let App: typeof import('../App').default;
let store: typeof import('@/store').store;

beforeAll(async () => {
  localStorage.clear();
  ({ default: App } = await import('../App'));
  ({ store } = await import('@/store'));
});

describe('log in from a protected page', () => {
  it('returns to the page that was asked for, not the dashboard', async () => {
    // RequireAuth sends /app/tradelog to /login with the page in `from` (history state as react-router stores it).
    window.history.pushState({ usr: { from: { pathname: '/app/tradelog', search: '', hash: '' } }, key: 'k', idx: 0 }, '', '/login');
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const button = await screen.findByRole('button', { name: 'log in' });
    act(() => button.click());
    expect(await screen.findByTestId('app')).toHaveTextContent('/app/tradelog');
    expect(window.location.pathname).toBe('/app/tradelog');
  });
});
