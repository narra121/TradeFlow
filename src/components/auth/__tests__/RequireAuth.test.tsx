import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

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
    createElement(MemoryRouter, { initialEntries: [route] },
      createElement(RequireAuth, null,
        createElement('div', { 'data-testid': 'protected' }, 'Secret Content')
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
});
