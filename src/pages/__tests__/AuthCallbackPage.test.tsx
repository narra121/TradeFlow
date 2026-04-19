import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

describe('AuthCallbackPage', () => {
  const originalLocation = window.location;
  let localStorageSetItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Stub env vars before resetting modules so the component picks them up
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '', origin: 'https://tradequt.com' };

    localStorageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.location = originalLocation;
    localStorageSetItemSpy.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function importAndRender() {
    vi.resetModules();
    const { AuthCallbackPage } = await import('../AuthCallbackPage');
    const { render } = await import('@/test/test-utils');
    return render(<AuthCallbackPage />);
  }

  it('shows loading spinner while exchanging code', async () => {
    mockSearchParams = new URLSearchParams('?code=test-code');

    // Mock fetch to hang (never resolve) so we stay in loading state
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    await importAndRender();

    // The Loader2 icon renders as an SVG with the animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Completing sign-in...')).toBeInTheDocument();
  });

  it('shows error when URL has error parameter', async () => {
    mockSearchParams = new URLSearchParams('?error=access_denied&error_description=User+cancelled');

    await importAndRender();

    await waitFor(() => {
      expect(screen.getByText('Sign-in failed')).toBeInTheDocument();
      expect(screen.getByText('User cancelled')).toBeInTheDocument();
    });
  });

  it('shows error when no code parameter', async () => {
    mockSearchParams = new URLSearchParams();

    await importAndRender();

    await waitFor(() => {
      expect(screen.getByText('No authorization code received')).toBeInTheDocument();
    });
  });

  it('shows Back to login button on error', async () => {
    mockSearchParams = new URLSearchParams('?error=access_denied');

    await importAndRender();

    await waitFor(() => {
      expect(screen.getByText('Back to login')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Back to login'));

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('exchanges code for tokens and navigates to /app on success', async () => {
    // Create a fake JWT payload
    const payload = { sub: 'google-user-1', name: 'Test User', email: 'test@gmail.com' };
    const fakeIdToken = `header.${btoa(JSON.stringify(payload))}.signature`;

    mockSearchParams = new URLSearchParams('?code=auth-code-123');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id_token: fakeIdToken,
        refresh_token: 'refresh-tok-123',
      }),
    } as Response);

    await importAndRender();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://auth.test.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    await waitFor(() => {
      expect(localStorageSetItemSpy).toHaveBeenCalledWith('idToken', fakeIdToken);
      expect(localStorageSetItemSpy).toHaveBeenCalledWith('refreshToken', 'refresh-tok-123');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
    });
  });

  it('shows error on fetch failure', async () => {
    mockSearchParams = new URLSearchParams('?code=bad-code');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Code expired' }),
    } as Response);

    await importAndRender();

    await waitFor(() => {
      expect(screen.getByText('Sign-in failed')).toBeInTheDocument();
      expect(screen.getByText('Code expired')).toBeInTheDocument();
    });
  });
});
