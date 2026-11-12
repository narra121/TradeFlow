import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
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

const track = vi.hoisted(() => ({ trackSignUp: vi.fn(), trackLogin: vi.fn() }));
vi.mock('@/lib/analytics', () => track);

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
    localStorage.clear();
    sessionStorage.setItem('tq.oauth', JSON.stringify({ state: 's1', verifier: 'verifier-1' }));

    // Stub env vars before resetting modules so the component picks them up
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    Object.defineProperty(window, 'location', { value: { ...originalLocation, href: '', origin: 'https://tradequt.com' }, writable: true, configurable: true });

    localStorageSetItemSpy = vi.spyOn(localStorage, 'setItem');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
    localStorageSetItemSpy.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  async function importAndRender() {
    vi.resetModules();
    const { AuthCallbackPage } = await import('../AuthCallbackPage');
    const { render } = await import('@/test/test-utils');
    return render(<AuthCallbackPage />);
  }

  it('shows a polite loading status with a spinner while the code is exchanged', async () => {
    mockSearchParams = new URLSearchParams('?code=test-code&state=s1');
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    const { container } = await importAndRender();

    expect(container.querySelector('.spin')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Logging you in…');
    expect(screen.getByRole('status')).toHaveTextContent('Checking your Google account with TradeQut. This takes a few seconds.');
    expect(screen.getByRole('heading', { level: 1, name: 'Logging you in…' })).toHaveFocus();
  });

  it('admits it is slow after 10 seconds and offers a way back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSearchParams = new URLSearchParams('?code=test-code&state=s1');
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    await importAndRender();
    expect(screen.queryByText('This is taking longer than usual.')).toBeNull();
    act(() => void vi.advanceTimersByTime(10_500));

    expect(await screen.findByText('This is taking longer than usual.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login');
  });

  it('a cancelled Google screen says so and never prints text from the URL', async () => {
    mockSearchParams = new URLSearchParams('?error=access_denied&error_description=CALL+0800+123');

    await importAndRender();

    expect(await screen.findByRole('heading', { level: 1, name: 'Google sign-in was cancelled' })).toHaveFocus();
    expect(screen.getByText('Nothing changed. Try again, or use your email and password.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('0800');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use email and password' })).toHaveAttribute('href', '/login');
  });

  it('any other provider error is a failure with Status and support pointers', async () => {
    mockSearchParams = new URLSearchParams('?error=server_error&error_description=Secret+provider+text');

    await importAndRender();

    expect(await screen.findByRole('heading', { name: "Couldn't finish Google sign-in" })).toBeInTheDocument();
    expect(screen.getByText('Something went wrong between Google and TradeQut. Nothing changed on your account.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Secret provider text');
    expect(screen.getByRole('button', { name: 'Try Google again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Check Status' })).toHaveAttribute('href', '/status');
    expect(screen.getByRole('link', { name: 'support@tradequt.com' })).toHaveAttribute('href', 'mailto:support@tradequt.com');
  });

  it('opening the page without a code shows the expired view with a way back', async () => {
    mockSearchParams = new URLSearchParams();

    await importAndRender();

    expect(await screen.findByRole('heading', { name: 'This sign-in link has expired' })).toBeInTheDocument();
    expect(screen.getByText('Start again from the log-in page.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login');
  });

  it('exchanges code for tokens and navigates to /app on success', { timeout: 15000 }, async () => {
    const payload = { sub: 'google-user-1', name: 'Test User', email: 'test@gmail.com' };
    const fakeIdToken = `header.${btoa(JSON.stringify(payload))}.signature`;

    mockSearchParams = new URLSearchParams('?code=auth-code-123&state=s1');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id_token: fakeIdToken, refresh_token: 'refresh-tok-123' }),
    } as Response);

    await importAndRender();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://auth.test.com/oauth2/token',
        expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
      );
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(localStorage.getItem('idToken')).toBe(fakeIdToken);
      expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
    }, { timeout: 10000 });
  });

  it('returns to the page the user was heading for when Google sign-in started', async () => {
    sessionStorage.setItem('tq.oauth', JSON.stringify({ state: 's1', verifier: 'verifier-1', from: '/app/trades?trade=t1' }));
    mockSearchParams = new URLSearchParams('?code=c&state=s1');
    const idToken = `header.${btoa(JSON.stringify({ sub: 'g1', email: 'a@b.co' }))}.signature`;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve({ id_token: idToken }) } as Response);

    await importAndRender();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app/trades?trade=t1', { replace: true }));
  });

  it('counts a sign-in that created the Google identity as a sign up, any other as a log in', async () => {
    const make = (dateCreated: number) => `header.${btoa(JSON.stringify({ sub: 'g1', email: 'a@b.co', identities: [{ providerName: 'Google', dateCreated }] }))}.signature`;
    for (const [created, expected] of [[Date.now() - 5_000, 'trackSignUp'], [Date.now() - 86_400_000, 'trackLogin']] as const) {
      track.trackSignUp.mockClear();
      track.trackLogin.mockClear();
      sessionStorage.setItem('tq.oauth', JSON.stringify({ state: 's1', verifier: 'verifier-1' }));
      mockSearchParams = new URLSearchParams('?code=c&state=s1');
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve({ id_token: make(created) }) } as Response);
      const { unmount } = await importAndRender();
      await waitFor(() => expect(track[expected]).toHaveBeenCalledWith('google'));
      unmount();
    }
  });

  it('a failed token exchange is our failure view, not the provider text', async () => {
    mockSearchParams = new URLSearchParams('?code=bad-code&state=s1');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Code expired' }),
    } as Response);

    await importAndRender();

    expect(await screen.findByRole('heading', { name: "Couldn't finish Google sign-in" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Code expired');
    expect(localStorage.getItem('idToken')).toBeNull();
  });

  it('rejects a callback whose state does not match and never calls the token endpoint', async () => {
    mockSearchParams = new URLSearchParams('?code=abc&state=forged');
    globalThis.fetch = vi.fn();
    await importAndRender();
    expect(await screen.findByRole('heading', { name: 'This sign-in link has expired' })).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('Try Google again starts a new sign-in that remembers the destination', async () => {
    sessionStorage.setItem('tq.oauth', JSON.stringify({ state: 's1', verifier: 'v', from: '/app/goals' }));
    mockSearchParams = new URLSearchParams('?error=server_error&state=s1');
    await importAndRender();

    await userEvent.click(await screen.findByRole('button', { name: 'Try Google again' }));

    await waitFor(() => expect(window.location.href).toContain('https://auth.test.com/oauth2/authorize'));
    expect(JSON.parse(sessionStorage.getItem('tq.oauth') ?? '{}').from).toBe('/app/goals');
  });
});
