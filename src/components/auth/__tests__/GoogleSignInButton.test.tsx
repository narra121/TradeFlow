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
        logoutEverywhere: { matchFulfilled: createMatcher('authApi/logoutEverywhere/fulfilled') },
      },
    },
  };
});

// Amplify does the redirect; the hook only starts it
const svc = vi.hoisted(() => ({ startGoogleSignIn: vi.fn() }));
vi.mock('@/lib/auth/authService', () => svc);

describe('GoogleSignInButton + useGoogleSignIn', () => {
  beforeEach(() => {
    svc.startGoogleSignIn.mockReset();
    svc.startGoogleSignIn.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  function stubConfigured() {
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_Pool');
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
  }

  async function renderHost(opts: { configured: boolean; from?: string | null; onError?: () => void; label?: string }) {
    if (opts.configured) stubConfigured();
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

  it('starts Amplify Google sign-in on click, with no destination by default', async () => {
    await renderHost({ configured: true });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(svc.startGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(svc.startGoogleSignIn).toHaveBeenCalledWith(null);
  });

  it('passes on the destination the user was heading for', async () => {
    await renderHost({ configured: true, from: '/app/trades?trade=t1' });
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(svc.startGoogleSignIn).toHaveBeenCalledWith('/app/trades?trade=t1');
  });

  it('reads Opening Google… and is aria-disabled (still focusable) once clicked, and a second click starts nothing', async () => {
    await renderHost({ configured: true });
    const button = screen.getByRole('button', { name: /continue with google/i });

    await userEvent.click(button);
    await userEvent.click(button);

    expect(screen.getByText('Opening Google…')).toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(svc.startGoogleSignIn).toHaveBeenCalledTimes(1);
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
    svc.startGoogleSignIn.mockRejectedValue(new Error('no config'));
    await renderHost({ configured: true, onError });

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /continue with google/i })).not.toHaveAttribute('aria-disabled');
  });
});
