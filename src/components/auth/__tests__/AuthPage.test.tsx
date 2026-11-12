import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { store } from '@/store';

const { login, signup, confirm, forgot, reset, mutation, googleOn, startGoogle } = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    login: mk(), signup: mk(), confirm: mk(), forgot: mk(), reset: mk(), startGoogle: mk(),
    googleOn: { value: true },
    mutation: (fn: ReturnType<typeof vi.fn>) => () => [(a: unknown) => ({ unwrap: () => fn(a) }), { isLoading: false }],
  };
});
vi.mock('@/store/api', async (orig) => ({
  ...(await orig<object>()),
  useLoginMutation: mutation(login),
  useSignupMutation: mutation(signup),
  useConfirmSignupMutation: mutation(confirm),
  useForgotPasswordMutation: mutation(forgot),
  useResetPasswordMutation: mutation(reset),
}));
vi.mock('@/components/auth/useGoogleSignIn', () => ({ useGoogleSignIn: () => ({ busy: false, start: startGoogle }) }));
vi.mock('@/components/auth/googleConfig', () => ({ isGoogleConfigured: () => googleOn.value, COGNITO_DOMAIN: 'd', COGNITO_CLIENT_ID: 'c' }));

import { AuthPage } from '../AuthPage';

// jsdom has no ResizeObserver; the one-time-code input measures its slots with it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

document.elementFromPoint ??= () => null;

type Entry = string | { pathname: string; search?: string; state?: unknown };

const setup = (initialView: 'login' | 'signup' = 'login', entry: Entry = initialView === 'login' ? '/login' : '/signup') =>
  render(
    <HelmetProvider>
      <Provider store={store}>
        <MemoryRouter initialEntries={[entry]}>
          <AuthPage onLogin={vi.fn()} initialView={initialView} />
        </MemoryRouter>
      </Provider>
    </HelmetProvider>,
  );

const type = (label: RegExp | string, value: string) => userEvent.type(screen.getByLabelText(label), value);
const alertText = () => screen.getByRole('alert').textContent ?? '';
const setOnline = (on: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value: on, configurable: true });
  window.dispatchEvent(new Event(on ? 'online' : 'offline'));
};

beforeEach(() => {
  [login, signup, confirm, forgot, reset, startGoogle].forEach((m) => m.mockReset());
  googleOn.value = true;
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('frame and accessibility', () => {
  it('has a logo link home, one main, one h1, the legal footer and the gate selectors', () => {
    const { container } = setup();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TradeQut home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signup');
    const footer = screen.getByRole('navigation', { name: 'Legal and status' });
    ['Privacy', 'Terms', 'Security', 'Status'].forEach((l) => expect(footer).toContainElement(screen.getByRole('link', { name: l })));
    expect(container.querySelector('input[type=email]')).toBeInTheDocument();
    expect(container.querySelector('input[type=password]')).toBeInTheDocument();
    expect(container.querySelector('button[type=submit]')).toBeInTheDocument();
  });

  it('every view carries the sample dashboard labelled Sample data; sign-up adds the headline and facts', async () => {
    setup('login');
    const pane = screen.getByRole('complementary', { name: 'What TradeQut looks like' });
    expect(within(pane).getByText('Sample data')).toBeInTheDocument();
    expect(within(pane).getByRole('img', { name: /Sample data, not your account: the TradeQut dashboard for November 2026/ })).toBeInTheDocument();
    expect(within(pane).queryByRole('heading', { level: 2 })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(within(screen.getByRole('complementary')).getByText('Sample data')).toBeInTheDocument();
  });

  it('sign-up shows the shared headline in two tones, four facts and the trial sentence', () => {
    setup('signup');
    const pane = screen.getByRole('complementary', { name: 'What TradeQut looks like' });
    const h2 = within(pane).getByRole('heading', { level: 2 });
    expect(h2).toHaveTextContent('The trading journal that shows what your rules cost you.');
    expect(h2.querySelector('.dim')).toHaveTextContent('The trading journal that shows');
    expect(within(pane).getByText('Zerodha, Dhan, Upstox, Angel One, Groww, MT4 and MT5 files, or any CSV.')).toBeInTheDocument();
    expect(screen.getByText('14-day Pro trial. No card.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument();
  });

  it('draws no "or" divider and no Google sentence when Google sign-in is not configured', async () => {
    googleOn.value = false;
    setup();
    expect(screen.queryByRole('separator', { name: 'or' })).toBeNull();
    expect(screen.queryByText('Continue with Google')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await type('Email', 'a@b.co');
    forgot.mockResolvedValue({});
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Choose a new password' });
    expect(screen.queryByText(/Signed up with Google/)).toBeNull();
  });

  it('labels the inputs, sets autocomplete and uses a text Show button with aria-pressed', async () => {
    setup();
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    const pw = screen.getByLabelText('Password');
    expect(pw).toHaveAttribute('autocomplete', 'current-password');
    const show = screen.getByRole('button', { name: 'Show password' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(show);
    expect(pw).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the live regions in the DOM, empty, on first paint', () => {
    const { container } = setup();
    expect(container.querySelector('[role=status].live')).toBeEmptyDOMElement();
    expect(container.querySelector('[role=alert].live')).toBeEmptyDOMElement();
  });

  it('shows field errors with aria-invalid and a focused summary that names each field, never a toast', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('Enter your email address.').length).toBeGreaterThan(0);
    expect(alertText()).toContain('2 fields need attention');
    expect(alertText()).toContain('Email: enter your email address.');
    expect(alertText()).toContain('Password: enter your password.');
    await waitFor(() => expect(screen.getByRole('alert').firstElementChild).toHaveFocus());
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the session-ended notice above the Google button, as a status', () => {
    setup('login', { pathname: '/login', state: { reason: 'session-ended', from: { pathname: '/app/trades' } } });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('You were logged out because your session ended.');
    expect(status).toHaveTextContent('unsaved trades were kept as drafts');
  });

  it('explains a protected link opened without a session', () => {
    setup('login', { pathname: '/login', state: { from: { pathname: '/app/trades' } } });
    expect(screen.getByRole('status')).toHaveTextContent("Log in to continue. You'll go straight to the page you opened.");
  });

  it('carries an email from the page the user came from and puts focus in Password', () => {
    setup('login', { pathname: '/login', state: { email: 'carry@me.io', focus: 'password' } });
    expect(screen.getByLabelText('Email')).toHaveValue('carry@me.io');
    expect(screen.getByLabelText('Password')).toHaveFocus();
  });

  it('shows an offline notice while offline and a back-online line after', async () => {
    setup();
    act(() => setOnline(false));
    expect(screen.getByRole('status')).toHaveTextContent("You're offline");
    expect(screen.getByRole('status')).toHaveTextContent('Reconnect to log in.');
    act(() => setOnline(true));
    expect(await screen.findByText("You're back online.")).toBeInTheDocument();
  });

  it('shows no Caps Lock hint until Caps Lock is on while typing the password', async () => {
    setup();
    const pw = screen.getByLabelText('Password');
    expect(screen.queryByText('Caps Lock is on.')).toBeNull();
    await userEvent.type(pw, 'a');
    expect(screen.queryByText('Caps Lock is on.')).toBeNull();
    const caps = new KeyboardEvent('keydown', { key: 'A', modifierCapsLock: true, bubbles: true });
    act(() => {
      pw.dispatchEvent(caps);
    });
    expect(await screen.findByText('Caps Lock is on.')).toBeInTheDocument();
  });
});

describe('login', () => {
  const submitLogin = async () => {
    await type('Email', ' a@b.co ');
    await type('Password', 'Secret#12');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
  };

  it('submits trimmed credentials; a wrong password gets our sentence, a reset link and the Google hint', async () => {
    login.mockRejectedValue({ status: 400, data: { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } } });
    setup();
    await submitLogin();
    expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'Secret#12' });
    await waitFor(() => expect(alertText()).toContain('Email or password is incorrect'));
    expect(alertText()).toContain('If you signed up with Google, use Continue with Google.');
    expect(alertText()).not.toContain('Invalid email or password');
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
    await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'reset your password' }));
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
  });

  it('leaves the Google sentence out when Google is not configured', async () => {
    googleOn.value = false;
    login.mockRejectedValue({ status: 400, data: { errorCode: 'UNAUTHORIZED' } });
    setup();
    await submitLogin();
    await waitFor(() => expect(alertText()).toContain('Email or password is incorrect'));
    expect(alertText()).not.toContain('Google');
  });

  it('says so, with a Status link, when the network is unreachable', async () => {
    login.mockRejectedValue({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' });
    setup();
    await submitLogin();
    await waitFor(() => expect(alertText()).toContain("Couldn't reach TradeQut"));
    expect(alertText()).toContain('Check your connection and try again.');
    expect(within(screen.getByRole('alert')).getByRole('link', { name: 'Status' })).toHaveAttribute('href', '/status');
    expect(screen.getByLabelText('Password')).toHaveValue('Secret#12');
  });

  it('says TradeQut had a problem for a 5xx', async () => {
    login.mockRejectedValue({ status: 503, data: { message: 'upstream exploded' } });
    setup();
    await submitLogin();
    await waitFor(() => expect(alertText()).toContain('TradeQut had a problem'));
    expect(alertText()).not.toContain('upstream exploded');
  });

  it('never renders a server sentence it does not know', async () => {
    login.mockRejectedValue({ status: 418, data: { message: 'I am a teapot' } });
    setup();
    await submitLogin();
    await waitFor(() => expect(alertText()).toContain('Something went wrong'));
    expect(document.body.textContent).not.toContain('teapot');
  });

  it('counts down the wait from errors[0].retryAfter, blocks the button, then says you can try again', async () => {
    login.mockRejectedValue({ status: 429, data: { errorCode: 'RATE_LIMITED', message: 'Too many', errors: [{ retryAfter: 3 }] } });
    setup();
    await submitLogin();
    await waitFor(() => expect(alertText()).toContain('Too many attempts'));
    expect(alertText()).toContain('Log in is paused for this email. Try again in 0:0');
    const button = screen.getByRole('button', { name: 'Log in' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('You can try again now.'), { timeout: 5000 });
    expect(screen.getByRole('button', { name: 'Log in' })).not.toHaveAttribute('aria-disabled');
  });

  it('shows the minutes and seconds for a long wait and re-enables the button when the email changes', async () => {
    login.mockRejectedValue({ status: 429, data: { errorCode: 'RATE_LIMITED', errors: [{ retryAfter: 240 }] } });
    setup();
    await submitLogin();
    await waitFor(() => expect(alertText()).toContain('Try again in 4:00'));
    expect(screen.getByRole('alert')).toHaveTextContent('4 minutes');
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.type(screen.getByLabelText('Email'), 'x');
    expect(screen.getByRole('button', { name: 'Log in' })).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByText(/Too many attempts/)).toBeNull();
  });

  it('keeps the old details.retryAfter path as a fallback and says a few minutes when no wait is sent', async () => {
    login.mockRejectedValue({ status: 429, data: { error: { code: 'RATE_LIMITED' } } });
    setup();
    await submitLogin();
    await waitFor(() => expect(alertText()).toContain('Try again in a few minutes.'));
    expect(screen.getByRole('button', { name: 'Log in' })).not.toHaveAttribute('aria-disabled');
  });

  it('has no "Remember me" control', () => {
    setup();
    expect(screen.queryByText(/remember me/i)).toBeNull();
  });

  it('an unverified login resends the code, explains why verify opened, and Back returns to login', async () => {
    login.mockRejectedValue({ status: 403, data: { errorCode: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' } });
    signup.mockResolvedValue({ resent: true });
    setup();
    await type('Email', 'trader@example.com');
    await type('Password', 'Secret#12');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(signup).toHaveBeenCalledWith({ name: 'trader', email: 'trader@example.com', password: 'Secret#12' });
    expect(screen.getAllByRole('status')[0]).toHaveTextContent("This email isn't verified yet");
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Enter the new code we just sent');
    expect(within(screen.getByRole('complementary')).queryByRole('heading', { level: 2 })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Back to log in/ }));
    expect(screen.getByRole('heading', { name: 'Log in to TradeQut' })).toBeInTheDocument();
  });
});

describe('signup', () => {
  it('asks for email and password only', () => {
    setup('signup');
    expect(screen.queryByLabelText(/^Name/)).toBeNull();
    expect(screen.queryByLabelText(/Confirm password/i)).toBeNull();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows the policy checklist on focus, ticks rules while typing and names what to add', async () => {
    setup('signup');
    expect(screen.queryByRole('list', { name: 'Password requirements' })).toBeNull();
    await type('Email', 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefgh');
    const list = screen.getByRole('list', { name: 'Password requirements' });
    expect(list).toHaveTextContent('At least 8 characters (met)');
    expect(list).toHaveTextContent('A lowercase letter (met)');
    expect(list).toHaveTextContent('An uppercase letter (not met yet)');
    expect(list).toHaveTextContent('A symbol, like ! or # (not met yet)');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(signup).not.toHaveBeenCalled();
    expect(alertText()).toContain('Password: add an uppercase letter, a number, and a symbol.');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(/Add an uppercase letter, a number, and a symbol\./);
  });

  it('names a lone missing symbol with its example', async () => {
    setup('signup');
    await type('Email', 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Tradelog7');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(signup).not.toHaveBeenCalled();
    expect(alertText()).toContain('Password: add a symbol, like ! or #.');
  });

  it('creates the account with the email local part as the name and opens verify with the sign-up pane', async () => {
    signup.mockResolvedValue({ resent: false });
    setup('signup');
    await type('Email', 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Abcdef1!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(signup).toHaveBeenCalledWith({ name: 'ann', email: 'ann@example.com', password: 'Abcdef1!' });
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(within(screen.getByRole('complementary')).getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to sign up/ })).toBeInTheDocument();
  });

  it('an email that already exists is an error on the field with links that carry the email', async () => {
    signup.mockRejectedValue({ status: 400, data: { errorCode: 'USER_EXISTS', message: 'An account with this email already exists. Please login instead.' } });
    setup('signup');
    await type('Email', 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Abcdef1!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription('An account with this email already exists.');
    expect(alertText()).toContain('1 field needs attention');
    expect(screen.getByRole('link', { name: 'Log in instead' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Reset password' })).toHaveAttribute('href', '/login?view=forgot');
    expect(screen.getByText('If you signed up with Google, use Continue with Google.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Please login');
  });

  it('says creating an account is paused when rate limited', async () => {
    signup.mockRejectedValue({ status: 429, data: { errorCode: 'RATE_LIMITED', errors: [{ retryAfter: 90 }] } });
    setup('signup');
    await type('Email', 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Abcdef1!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(alertText()).toContain('Creating an account is paused for this email. Try again in 1:'));
  });

  it('puts the facts list under the form for narrow screens', () => {
    const { container } = setup('signup');
    expect(container.querySelector('main .facts.facts-phone')).toBeInTheDocument();
  });
});

describe('verify', () => {
  const toVerify = async () => {
    login.mockRejectedValue({ status: 403, data: { errorCode: 'EMAIL_NOT_VERIFIED' } });
    signup.mockResolvedValue({ resent: true });
    setup();
    await type('Email', 'ann@example.com');
    await type('Password', 'Abcdef1!');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByRole('heading', { name: 'Check your email' });
    login.mockReset();
  };

  it('is one labelled one-time-code input; the sixth digit submits; a wrong code gets our sentence and is cleared', async () => {
    await toVerify();
    confirm.mockRejectedValue({ status: 400, data: { message: 'Invalid verification code provided, please try again.' } });
    const input = screen.getByLabelText(/Verification code/);
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    await userEvent.type(input, '481293');
    await waitFor(() => expect(confirm).toHaveBeenCalledWith({ email: 'ann@example.com', code: '481293' }));
    expect(await screen.findByText("That code isn't right. Check the email and enter it again.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Invalid verification code provided');
    expect(input).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeInTheDocument();
  });

  it('an expired code says to resend and unlocks Resend at once', async () => {
    await toVerify();
    confirm.mockRejectedValue({ status: 400, data: { message: 'Invalid code provided, please request a code again.' } });
    await userEvent.type(screen.getByLabelText(/Verification code/), '111111');
    expect(await screen.findByText('That code has expired. Resend the code and enter the new one.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeInTheDocument();
  });

  it('accepts the code, logs in with the typed password and shows the verified state', async () => {
    await toVerify();
    confirm.mockResolvedValue(undefined);
    login.mockResolvedValue({});
    await userEvent.type(screen.getByLabelText(/Verification code/), '481293');
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'ann@example.com', password: 'Abcdef1!' }));
  });

  it('plain text Resend with a countdown while locked, then a button; Resend shows a success line', async () => {
    await toVerify();
    expect(screen.queryByRole('button', { name: /Resend code/ })).toBeNull();
    expect(screen.getByText(/Resend code in/)).toBeInTheDocument();
    expect(screen.getByText(/Check your spam folder too\./)).toBeInTheDocument();
  });

  it('Change email returns to the view that opened verify with the email in place', async () => {
    await toVerify();
    await userEvent.click(screen.getByRole('button', { name: 'Change email' }));
    expect(screen.getByRole('heading', { name: 'Log in to TradeQut' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ann@example.com');
  });

  it('too many resends shows our sentence and keeps Resend locked', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await toVerify();
    for (let i = 0; i < 31; i++) act(() => void vi.advanceTimersByTime(1000));
    signup.mockRejectedValue({ status: 429, data: { errorCode: 'RATE_LIMITED' } });
    await userEvent.click(await screen.findByRole('button', { name: 'Resend code' }));
    expect(await screen.findByText("You've asked for several codes. Use the newest email, or wait a few minutes before asking again.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend code' })).toBeNull();
  });

  it('a resend that is rate limited with a wait says so under the code and locks Resend for that long', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    forgot.mockResolvedValue({});
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await type('Email', 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Choose a new password' });
    for (let i = 0; i < 31; i++) act(() => void vi.advanceTimersByTime(1000));
    forgot.mockRejectedValue({ status: 429, data: { errorCode: 'RATE_LIMITED', errors: [{ retryAfter: 125 }] } });
    await userEvent.click(await screen.findByRole('button', { name: 'Resend code' }));
    expect(await screen.findByText("We've already sent several codes to this email. Try again in 2:05.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend code' })).toBeNull();
  });

  it('an already confirmed account goes to log in with the Email verified notice', async () => {
    await toVerify();
    confirm.mockRejectedValue({ status: 400, data: { message: 'User cannot be confirmed. Current status is CONFIRMED' } });
    await userEvent.type(screen.getByLabelText(/Verification code/), '111111');
    expect(await screen.findByRole('heading', { name: 'Log in to TradeQut' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Email verified');
    expect(screen.getByRole('status')).toHaveTextContent('Log in to continue.');
  });
});

describe('forgot and reset', () => {
  it('sends the code, then resets with code and new password on one screen with the email stated once', async () => {
    forgot.mockResolvedValue({});
    reset.mockResolvedValue({});
    login.mockResolvedValue({});
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText("Enter your account email and we'll send a 6-digit code.")).toBeInTheDocument();
    await type('Email', 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
    expect(screen.getByText(/If an account exists for/)).toHaveTextContent('If an account exists for a@b.co, a 6-digit code is on its way.');
    expect(screen.getAllByText('a@b.co')).toHaveLength(1);
    expect(screen.queryByText(/Code sent to/)).toBeNull();
    await userEvent.type(screen.getByLabelText(/Code from the email/), '123456');
    expect(screen.getByLabelText('New password')).toHaveFocus();
    expect(reset).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('New password'), 'Abcdef1!');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    await waitFor(() => expect(reset).toHaveBeenCalledWith({ email: 'a@b.co', code: '123456', newPassword: 'Abcdef1!' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'Abcdef1!' }));
  });

  it('shows Password changed while logging in, then the log-in form with a notice when the automatic log-in fails', async () => {
    forgot.mockResolvedValue({});
    reset.mockResolvedValue({});
    let fail: (e: unknown) => void = () => undefined;
    login.mockImplementation(() => new Promise((_, rej) => { fail = rej; }));
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await type('Email', 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Choose a new password' });
    await userEvent.type(screen.getByLabelText(/Code from the email/), '123456');
    await userEvent.type(screen.getByLabelText('New password'), 'Abcdef1!');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByRole('heading', { name: 'Password changed' })).toHaveFocus();
    expect(screen.getByText('Logging you in…')).toBeInTheDocument();
    await act(async () => fail({ status: 400 }));
    expect(await screen.findByRole('heading', { name: 'Log in to TradeQut' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Password changed');
    expect(screen.getByRole('status')).toHaveTextContent('Log in with your new password.');
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co');
  });

  it('a wrong reset code is explained in our words and the typed password is kept', async () => {
    forgot.mockResolvedValue({});
    reset.mockRejectedValue({ status: 400, data: { message: 'Invalid verification code provided, please try again.' } });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await type('Email', 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Choose a new password' });
    await userEvent.type(screen.getByLabelText(/Code from the email/), '123456');
    await userEvent.type(screen.getByLabelText('New password'), 'Abcdef1!');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText("That code isn't right. Check the email and enter it again.")).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toHaveValue('Abcdef1!');
  });

  it('offers Resend code and the Google line (that starts Google sign-in) on the reset view', async () => {
    forgot.mockResolvedValue({});
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await type('Email', 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Choose a new password' });
    expect(screen.getByText(/Resend code in/)).toBeInTheDocument();
    expect(screen.getByText(/Signed up with Google\? There is no password to reset\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(startGoogle).toHaveBeenCalled();
  });

  it('keeps the email when going back from the reset step', async () => {
    forgot.mockResolvedValue({});
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await type('Email', 'keep@me.io');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Change email' }));
    expect(screen.getByLabelText('Email')).toHaveValue('keep@me.io');
  });

  it('says we have already sent several codes when forgot password is rate limited', async () => {
    forgot.mockRejectedValue({ status: 429, data: { errorCode: 'RATE_LIMITED', errors: [{ retryAfter: 120 }] } });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await type('Email', 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await waitFor(() => expect(alertText()).toContain("We've already sent several codes to this email. Try again in 2:0"));
  });
});

describe('history', () => {
  function Probe() {
    const l = useLocation();
    const navigate = useNavigate();
    return (
      <>
        <p data-testid="search">{l.search}</p>
        <button type="button" onClick={() => navigate(-1)}>history back</button>
      </>
    );
  }
  const renderAt = (entry: string, probe = false) =>
    render(
      <HelmetProvider>
        <Provider store={store}>
          <MemoryRouter initialEntries={[entry]}>
            <AuthPage onLogin={vi.fn()} initialView="login" />
            {probe && <Probe />}
          </MemoryRouter>
        </Provider>
      </HelmetProvider>,
    );

  it('forgot password adds a history entry; the browser Back returns to the login form with the email kept', async () => {
    forgot.mockResolvedValue({});
    renderAt('/login', true);
    await type('Email', 'back@me.io');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?view=forgot');
    await userEvent.click(screen.getByRole('button', { name: 'history back' }));
    expect(screen.getByRole('heading', { name: 'Log in to TradeQut' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('back@me.io');
  });

  it('a reload on ?view=reset (email lost) falls back to the form that asks for it', () => {
    renderAt('/login?view=reset');
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
  });
});
