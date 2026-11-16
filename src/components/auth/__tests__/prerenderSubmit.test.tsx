import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';

// The flag scripts/prerender-routes.js sets before the page's scripts run; AuthPage reads it when it loads.
vi.hoisted(() => {
  (window as { __PRERENDER__?: boolean }).__PRERENDER__ = true;
});
vi.mock('@/components/auth/googleConfig', () => ({ isGoogleConfigured: () => false, COGNITO_DOMAIN: 'd', COGNITO_CLIENT_ID: 'c' }));

import { store } from '@/store';
import { AuthPage } from '../AuthPage';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

describe('the prerendered auth form (saved as static HTML)', () => {
  it.each([
    ['login', 'Log in'],
    ['signup', 'Create account'],
  ] as const)('%s: the saved button cannot submit natively before the app loads', (view, name) => {
    render(
      <HelmetProvider>
        <Provider store={store}>
          <MemoryRouter initialEntries={[`/${view}`]}>
            <AuthPage onLogin={vi.fn()} initialView={view} />
          </MemoryRouter>
        </Provider>
      </HelmetProvider>,
    );
    const button = screen.getByRole('button', { name });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.closest('form')?.querySelector('[type="submit"]')).toBeNull();
  });
});
