import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock authApi endpoints
vi.mock('@/store/api/authApi', () => {
  const createMatcher = (type: string) => {
    const matcher = (action: { type?: string } | undefined) => action?.type === type;
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

describe('GoogleSignInButton + useGoogleSignIn', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, 'location', { value: { ...originalLocation, href: '', origin: 'https://tradequt.com' }, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function renderHost(opts: { configured: boolean; from?: string | null; onError?: () => void; label?: string }) {
    if (opts.configured) {
      vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
      vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
    }
    vi.resetModules();
    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { useGoogleSignIn } = await import('../useGoogleSignIn');
    const { render } = await import('@/test/test-utils');
    function Host() {
      const google = useGoogleSignIn(opts.from ?? null, opts.onError);
      return <GoogleSignInButton google={google} label={opts.label} />;
    }
    return render(<Host />);
  }

  it('renders nothing when Google sign-in is not configured', async () => {
    const { container } = await renderHost({ configured: false });
    expect(container.innerHTML).toBe('');
  });

  it('renders the button with the Google mark when configured', async () => {
    const { container } = await renderHost({ configured: true });
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(container.querySelector('svg.g')).toBeInTheDocument();
  });

  it('takes a different label', async () => {
    await renderHost({ configured: true, label: 'Try Google again' });
    expect(screen.getByRole('button', { name: 'Try Google again' })).toBeInTheDocument();
  });

  it('constructs the Cognito authorize URL with state and PKCE on click', async () => {
    await renderHost({ configured: true });

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await vi.waitFor(() => expect(window.location.href).toContain('oauth2/authorize'));
    const url = new URL(window.location.href);
    expect(url.origin + url.pathname).toBe('https://auth.test.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://tradequt.com/auth/callback');
    expect(url.searchParams.get('identity_provider')).toBe('Google');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const state = url.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('tq.oauth') ?? '{}').state).toBe(state);
  });

  it('stores the destination the user was heading for next to the state', async () => {
    await renderHost({ configured: true, from: '/app/trades?trade=t1' });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await vi.waitFor(() => expect(window.location.href).toContain('oauth2/authorize'));
    expect(JSON.parse(sessionStorage.getItem('tq.oauth') ?? '{}').from).toBe('/app/trades?trade=t1');
  });

  it('reads Opening Google… and is aria-disabled (still focusable) once clicked', async () => {
    await renderHost({ configured: true });
    const button = screen.getByRole('button', { name: /continue with google/i });

    await userEvent.click(button);

    expect(screen.getByText('Opening Google…')).toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
  });

  it('shows the spinner in place of the Google mark while opening', async () => {
    const { container } = await renderHost({ configured: true });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.classList.contains('spin')).toBe(true);
  });

  it('calls onError and becomes usable again when the start fails', async () => {
    const onError = vi.fn();
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
    vi.resetModules();
    vi.doMock('@/lib/oauth', () => ({ startOAuth: () => Promise.reject(new Error('no crypto')) }));
    const { GoogleSignInButton } = await import('../GoogleSignInButton');
    const { useGoogleSignIn } = await import('../useGoogleSignIn');
    const { render } = await import('@/test/test-utils');
    function Host() {
      return <GoogleSignInButton google={useGoogleSignIn(null, onError)} />;
    }
    render(<Host />);

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /continue with google/i })).not.toHaveAttribute('aria-disabled');
    vi.doUnmock('@/lib/oauth');
  });
});
