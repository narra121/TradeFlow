import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const mockUseAppSelector = vi.fn();
vi.mock('@/store/hooks', () => ({
  useAppSelector: (fn: any) => mockUseAppSelector(fn),
  useAppDispatch: () => vi.fn(),
}));

// Dynamic import to ensure mock is applied
let RequireAuth: any;
beforeAll(async () => {
  const mod = await import('../RequireAuth');
  RequireAuth = mod.RequireAuth;
});

function renderAuth(isAuthenticated: boolean, route = '/') {
  mockUseAppSelector.mockReturnValue({ isAuthenticated });
  return renderToString(
    createElement(HelmetProvider, null,
      createElement(MemoryRouter, { initialEntries: [route] },
        createElement(RequireAuth, null,
          createElement('div', { 'data-testid': 'protected' }, 'Secret Content')
        )
      )
    )
  );
}

describe('RequireAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders children when user is authenticated', () => {
    const html = renderAuth(true);
    expect(html).toContain('Secret Content');
    expect(html).toContain('data-testid="protected"');
  });

  it('does not render children when not authenticated', () => {
    const html = renderAuth(false);
    expect(html).not.toContain('Secret Content');
    expect(html).not.toContain('data-testid="protected"');
  });

  it('redirects when not authenticated at a protected route', () => {
    const html = renderAuth(false, '/app/dashboard');
    expect(html).not.toContain('Secret Content');
  });

  it('renders children at protected route when authenticated', () => {
    const html = renderAuth(true, '/app/dashboard');
    expect(html).toContain('Secret Content');
  });

  describe('RequireAuth - Auth State Edge Cases', () => {
    it('redirects to /login when auth state has null token (not authenticated)', () => {
      // Simulate a state where token is null, meaning isAuthenticated is false
      mockUseAppSelector.mockReturnValue({ isAuthenticated: false, token: null });
      const html = renderToString(
        createElement(HelmetProvider, null,
          createElement(MemoryRouter, { initialEntries: ['/app/dashboard'] },
            createElement(RequireAuth, null,
              createElement('div', { 'data-testid': 'protected' }, 'Secret Content')
            )
          )
        )
      );
      expect(html).not.toContain('Secret Content');
      expect(html).not.toContain('data-testid="protected"');
    });

    it('handles undefined auth state gracefully (treats as unauthenticated)', () => {
      // If the selector returns an object where isAuthenticated is undefined/falsy
      mockUseAppSelector.mockReturnValue({ isAuthenticated: undefined });
      const html = renderToString(
        createElement(HelmetProvider, null,
          createElement(MemoryRouter, { initialEntries: ['/app/settings'] },
            createElement(RequireAuth, null,
              createElement('div', { 'data-testid': 'protected' }, 'Secret Content')
            )
          )
        )
      );
      expect(html).not.toContain('Secret Content');
      expect(html).not.toContain('data-testid="protected"');
    });

    it('does not render children when isAuthenticated is explicitly false', () => {
      mockUseAppSelector.mockReturnValue({ isAuthenticated: false });
      const html = renderToString(
        createElement(HelmetProvider, null,
          createElement(MemoryRouter, { initialEntries: ['/'] },
            createElement(RequireAuth, null,
              createElement('div', { 'data-testid': 'protected' }, 'Should Not Appear')
            )
          )
        )
      );
      expect(html).not.toContain('Should Not Appear');
    });

    it('renders children when isAuthenticated is true regardless of route', () => {
      mockUseAppSelector.mockReturnValue({ isAuthenticated: true });
      const html = renderToString(
        createElement(HelmetProvider, null,
          createElement(MemoryRouter, { initialEntries: ['/app/some-deep/route'] },
            createElement(RequireAuth, null,
              createElement('div', { 'data-testid': 'protected' }, 'Deep Route Content')
            )
          )
        )
      );
      expect(html).toContain('Deep Route Content');
      expect(html).toContain('data-testid="protected"');
    });
  });
});
