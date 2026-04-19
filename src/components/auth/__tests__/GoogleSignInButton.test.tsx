import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock authApi endpoints
vi.mock('@/store/api/authApi', () => {
  const createMatcher = (type: string) => {
    const matcher = (action: any) => action?.type === type;
    matcher.match = matcher;
    matcher.type = type;
    return matcher;
  };
  return {
    authApi: {
      endpoints: {
        signup: { matchFulfilled: createMatcher('authApi/signup/fulfilled') },
        login: { matchFulfilled: createMatcher('authApi/login/fulfilled') },
        logout: { matchFulfilled: createMatcher('authApi/logout/fulfilled') },
      },
    },
  };
});

describe('GoogleSignInButton', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '', origin: 'https://tradequt.com' };
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('renders null when VITE_COGNITO_DOMAIN is not set', async () => {
    // Default env has empty values, so module-level constants are ''
    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    const { container } = render(<GoogleSignInButton />);
    expect(container.innerHTML).toBe('');
  });

  it('renders button when env vars are configured', async () => {
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    // Reset modules so the component re-reads env vars at module level
    vi.resetModules();

    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    render(<GoogleSignInButton />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('constructs correct Cognito authorize URL on click', async () => {
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    vi.resetModules();

    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    render(<GoogleSignInButton />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    const expectedRedirectUri = encodeURIComponent('https://tradequt.com/auth/callback');
    const expectedUrl =
      `https://auth.test.com/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=test-client-id&` +
      `redirect_uri=${expectedRedirectUri}&` +
      `identity_provider=Google&` +
      `scope=${encodeURIComponent('openid email profile')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('includes Google SVG logo', async () => {
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    vi.resetModules();

    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    const { container } = render(<GoogleSignInButton />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('passes className to button', async () => {
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    vi.resetModules();

    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    render(<GoogleSignInButton className="custom-class" />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    expect(button.className).toContain('custom-class');
  });

  it('shows "Redirecting..." text after click instead of "Continue with Google"', async () => {
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    vi.resetModules();

    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    render(<GoogleSignInButton />);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /continue with google/i });
    await user.click(button);

    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument();
  });

  it('becomes disabled with opacity-70 and cursor-not-allowed after click', async () => {
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    vi.resetModules();

    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    render(<GoogleSignInButton />);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /continue with google/i });
    await user.click(button);

    // After click, button should be disabled
    expect(button).toBeDisabled();
    // Button should have loading-related classes
    expect(button.className).toContain('opacity-70');
    expect(button.className).toContain('cursor-not-allowed');
  });

  it('shows spinner icon while loading', async () => {
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    vi.resetModules();

    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { render } = await import('@/test/test-utils');

    const { container } = render(<GoogleSignInButton />);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /continue with google/i });
    await user.click(button);

    // The Google SVG should be replaced by the Loader2 spinner
    // Before click: SVG with viewBox="0 0 24 24" (Google logo)
    // After click: SVG with animate-spin class (Loader2)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.classList.contains('animate-spin')).toBe(true);
  });
});
