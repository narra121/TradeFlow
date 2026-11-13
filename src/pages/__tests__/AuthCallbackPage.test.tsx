import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Each test re-imports the page after `vi.resetModules()`; on a busy machine that alone can pass the 5 s default.
vi.setConfig({ testTimeout: 20_000 });

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

const track = vi.hoisted(() => ({ trackSignUp: vi.fn(), trackLogin: vi.fn() }));
vi.mock('@/lib/analytics', () => track);

// Amplify exchanges the code on its own; the page only waits for the result
const svc = vi.hoisted(() => ({ finishGoogleSignIn: vi.fn(), startGoogleSignIn: vi.fn() }));
vi.mock('@/lib/auth/authService', () => svc);
const hex = (s: string) => s.split('').map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const googleUser = { id: 'g1', name: 'Gia', email: 'g@x.io' };

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    svc.finishGoogleSignIn.mockReset();
    svc.startGoogleSignIn.mockReset();
    svc.startGoogleSignIn.mockResolvedValue(undefined);

    // Stub env vars before resetting modules so the component picks them up
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_Pool');
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'auth.test.com');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

    Object.defineProperty(window, 'location', { value: { ...originalLocation, href: '', origin: 'https://tradequt.com' }, writable: true, configurable: true });

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
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

  it('shows a polite loading status with a spinner while Amplify exchanges the code', async () => {
    mockSearchParams = new URLSearchParams('?code=test-code&state=s1');
    svc.finishGoogleSignIn.mockReturnValue(new Promise(() => {}));

    const { container } = await importAndRender();

    expect(container.querySelector('.spin')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Logging you in…');
    expect(screen.getByRole('status')).toHaveTextContent('Checking your Google account with TradeQut. This takes a few seconds.');
    expect(screen.getByRole('heading', { level: 1, name: 'Logging you in…' })).toHaveFocus();
  });

  it('admits it is slow after 10 seconds and offers a way back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSearchParams = new URLSearchParams('?code=test-code&state=s1');
    svc.finishGoogleSignIn.mockReturnValue(new Promise(() => {}));

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

  it('finishes the sign-in: records the user, counts a log in and opens the app', async () => {
    mockSearchParams = new URLSearchParams('?code=auth-code-123&state=s1');
    svc.finishGoogleSignIn.mockResolvedValue({ ok: true, user: googleUser, destination: null, firstSignIn: false });

    await importAndRender();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true }));
    expect(track.trackLogin).toHaveBeenCalledWith('google');
    expect(track.trackSignUp).not.toHaveBeenCalled();
  });

  it('returns to the page the user was heading for when Google sign-in started', async () => {
    mockSearchParams = new URLSearchParams('?code=c&state=s1');
    svc.finishGoogleSignIn.mockResolvedValue({ ok: true, user: googleUser, destination: '/app/trades?trade=t1', firstSignIn: false });

    await importAndRender();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app/trades?trade=t1', { replace: true }));
  });

  it('counts a sign-in that created the Google identity as a sign up', async () => {
    mockSearchParams = new URLSearchParams('?code=c&state=s1');
    svc.finishGoogleSignIn.mockResolvedValue({ ok: true, user: googleUser, destination: null, firstSignIn: true });

    await importAndRender();

    await waitFor(() => expect(track.trackSignUp).toHaveBeenCalledWith('google'));
    expect(track.trackLogin).not.toHaveBeenCalled();
  });

  it('a failed exchange is our failure view, not provider text', async () => {
    mockSearchParams = new URLSearchParams('?code=bad-code&state=s1');
    svc.finishGoogleSignIn.mockResolvedValue({ ok: false, expired: false });

    await importAndRender();

    expect(await screen.findByRole('heading', { name: "Couldn't finish Google sign-in" })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('a callback that no sign-in of this browser started is the expired view', async () => {
    mockSearchParams = new URLSearchParams('?code=abc&state=forged');
    svc.finishGoogleSignIn.mockResolvedValue({ ok: false, expired: true });

    await importAndRender();

    expect(await screen.findByRole('heading', { name: 'This sign-in link has expired' })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Try Google again starts a new sign-in that remembers the destination carried in the state', async () => {
    mockSearchParams = new URLSearchParams(`?error=server_error&state=Ab12-${hex('/app/goals')}`);
    await importAndRender();

    await userEvent.click(await screen.findByRole('button', { name: 'Try Google again' }));

    await waitFor(() => expect(svc.startGoogleSignIn).toHaveBeenCalledWith('/app/goals'));
    expect(svc.finishGoogleSignIn).not.toHaveBeenCalled();
  });
});
