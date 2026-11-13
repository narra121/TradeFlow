import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { arrivalNotice, describeAuthError, formatWait, rateLimitBody } from '../authErrors';
import { formatClock, spokenWait } from '../useCountdown';
import { PASSWORD_RULES, fallbackName, isValidEmail, missingRulesMessage, unmetRules } from '../passwordRules';
import { PasswordField } from '../PasswordField';
import { CodeInput } from '../CodeInput';
import { FormSummary } from '../FormSummary';
import { useAuthArrival } from '../useAuthArrival';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// jsdom has no elementFromPoint; the one-time-code input probes it on a timer after it mounts.
document.elementFromPoint ??= () => null;

describe('describeAuthError (DESIGN-AUTH §3.17)', () => {
  const body = (status: number, data: object) => ({ status, data });
  it('no response is a connection problem with a Status pointer', () => {
    expect(describeAuthError({ status: 'FETCH_ERROR' }, 'login')).toMatchObject({ kind: 'network', title: "Couldn't reach TradeQut" });
    expect(describeAuthError({ status: 'TIMEOUT_ERROR' }, 'login').message).toContain('see Status');
  });
  it('a 5xx says nothing was changed', () => {
    expect(describeAuthError(body(502, { message: 'bad gateway' }), 'signup')).toMatchObject({ kind: 'server', title: 'TradeQut had a problem' });
  });
  it('a 429 reads the wait from errors[0].retryAfter, with details.retryAfter as the fallback', () => {
    expect(describeAuthError(body(429, { errorCode: 'RATE_LIMITED', errors: [{ retryAfter: 240 }] }), 'login')).toMatchObject({
      kind: 'rate',
      title: 'Too many attempts',
      message: 'Log in is paused for this email. Try again in 4:00.',
      retryAfter: 240,
    });
    expect(describeAuthError(body(429, { error: { code: 'RATE_LIMITED', details: { retryAfter: 30 } } }), 'signup').message).toBe('Creating an account is paused for this email. Try again in 0:30.');
    expect(describeAuthError(body(429, {}), 'forgot').message).toBe("We've already sent several codes to this email. Try again in a few minutes.");
    expect(describeAuthError(body(429, { errors: [{ retryAfter: 7200 }] }), 'reset').message).toBe('Try again in about 1 hour.');
    // The one error envelope carries the wait as error.retryAfter; it wins over the older shapes.
    expect(describeAuthError(body(429, { success: false, errorCode: 'RATE_LIMITED', message: 'Too many requests', error: { code: 'RATE_LIMITED', retryAfter: 95 }, errors: [{ retryAfter: 5 }] }), 'login')).toMatchObject({ kind: 'rate', retryAfter: 95 });
  });
  it('a 429 without a wait on a code call is a code-field message', () => {
    expect(describeAuthError(body(429, {}), 'confirm')).toMatchObject({ kind: 'attempts', field: 'code', message: 'Too many attempts. Wait a few minutes, then try again.' });
    expect(describeAuthError(body(429, {}), 'resend')).toMatchObject({ kind: 'attempts', field: 'code' });
    expect(describeAuthError(body(429, {}), 'resend').message).toContain("You've asked for several codes");
  });
  it('log in: wrong credentials and an unverified email', () => {
    expect(describeAuthError(body(400, { errorCode: 'UNAUTHORIZED', message: 'Invalid email or password' }), 'login')).toMatchObject({
      kind: 'credentials',
      title: 'Email or password is incorrect',
      message: 'Try again or reset your password.',
    });
    expect(describeAuthError(body(403, { errorCode: 'EMAIL_NOT_VERIFIED' }), 'login').kind).toBe('unverified');
  });
  it('sign up: an existing email is an Email-field error; a refused password is a Password-field error', () => {
    expect(describeAuthError(body(400, { errorCode: 'USER_EXISTS', message: 'An account with this email already exists. Please login instead.' }), 'signup')).toMatchObject({
      kind: 'exists',
      field: 'email',
      message: 'An account with this email already exists.',
    });
    expect(describeAuthError(body(400, { errorCode: 'VALIDATION_ERROR', message: 'Password did not conform with policy' }), 'signup')).toMatchObject({ kind: 'password', field: 'password' });
  });
  it('confirm and reset: expired, wrong, attempt limit and already confirmed, matched from Cognito wording and never shown', () => {
    const expired = describeAuthError(body(400, { message: 'Invalid code provided, please request a code again.' }), 'reset');
    expect(expired).toMatchObject({ kind: 'code-expired', field: 'code', message: 'That code has expired. Resend the code and enter the new one.' });
    const wrong = describeAuthError(body(400, { message: 'Invalid verification code provided, please try again.' }), 'confirm');
    expect(wrong).toMatchObject({ kind: 'code-invalid', field: 'code', message: "That code isn't right. Check the email and enter it again." });
    expect(describeAuthError(body(400, { message: 'Attempt limit exceeded, please try after some time.' }), 'confirm').kind).toBe('attempts');
    expect(describeAuthError(body(400, { message: 'User cannot be confirmed. Current status is CONFIRMED' }), 'confirm').kind).toBe('confirmed');
    expect(describeAuthError(body(400, { message: 'Password does not conform to policy: Password must have symbol characters' }), 'reset')).toMatchObject({ kind: 'password', field: 'password' });
  });
  it('anything else is one generic sentence and never the server text', () => {
    const info = describeAuthError(body(418, { message: 'I am a teapot' }), 'login');
    expect(info).toMatchObject({ kind: 'other', title: 'Something went wrong', message: 'Nothing was changed. Try again.' });
    expect(JSON.stringify(describeAuthError({}, 'login'))).not.toContain('teapot');
  });
  it('formats waits', () => {
    expect(formatWait(30)).toBe('0:30');
    expect(formatWait(61)).toBe('1:01');
    expect(formatWait(3600)).toBe('about 1 hour');
    expect(rateLimitBody('login', null)).toBe('Log in is paused for this email. Try again in a few minutes.');
  });
});

describe('arrivalNotice', () => {
  it('has a notice for a session that ended and for a protected link, and nothing otherwise', () => {
    expect(arrivalNotice('session-ended', true)).toMatchObject({ title: 'You were logged out because your session ended.', message: 'Log in to continue — unsaved trades were kept as drafts.', icon: 'clock' });
    expect(arrivalNotice(null, true)?.message).toBe("Log in to continue. You'll go straight to the page you opened.");
    expect(arrivalNotice('whatever', false)).toBeNull();
    expect(arrivalNotice(null, false)).toBeNull();
  });
});

describe('useAuthArrival', () => {
  function Probe() {
    const a = useAuthArrival();
    return <p data-testid="out">{`${a.destination}|${a.arrival?.message ?? ''}|${a.state.email ?? ''}`}</p>;
  }
  const at = (entry: Parameters<typeof MemoryRouter>[0]['initialEntries']) =>
    render(
      <MemoryRouter initialEntries={entry}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );

  it('returns to the page the user asked for', () => {
    at([{ pathname: '/login', state: { from: { pathname: '/app/trades', search: '?trade=t1' }, reason: 'session-ended' } }]);
    expect(screen.getByTestId('out').textContent).toBe('/app/trades?trade=t1|Log in to continue — unsaved trades were kept as drafts.|');
  });
  it('defaults to the app, carries the email and reads ?reason=', () => {
    at([{ pathname: '/login', search: '?reason=session-ended', state: { email: 'a@b.co' } }]);
    expect(screen.getByTestId('out').textContent).toBe('/app|Log in to continue — unsaved trades were kept as drafts.|a@b.co');
  });
  it('never returns to a page outside the app', () => {
    at([{ pathname: '/login', state: { from: { pathname: 'https://evil.test' } } }]);
    expect(screen.getByTestId('out').textContent).toBe('/app||');
  });
});

describe('password policy', () => {
  it('lists the pool policy: 8 characters, lower, upper, number, symbol', () => {
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual(['length', 'lower', 'upper', 'number', 'symbol']);
    expect(unmetRules('Abcdef1!')).toEqual([]);
    expect(unmetRules('Passw0rd').map((r) => r.id)).toEqual(['symbol']);
    expect(unmetRules('Ab1!').map((r) => r.id)).toEqual(['length']);
  });
  it('helpers', () => {
    expect(isValidEmail(' a@b.co ')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(fallbackName('trader@example.com')).toBe('trader');
    expect(formatClock(24)).toBe('0:24');
    expect(formatClock(30)).toBe('0:30');
    expect(spokenWait(240)).toBe('4 minutes');
    expect(spokenWait(1)).toBe('1 second');
  });
  it('names what is missing in a sentence', () => {
    expect(missingRulesMessage(unmetRules('abcdefgh'))).toBe('Add an uppercase letter, a number, and a symbol.');
    expect(missingRulesMessage(unmetRules('abcdefG1'))).toBe('Add a symbol, like ! or #.');
    expect(missingRulesMessage(unmetRules('Abc1!'))).toBe('Add at least 8 characters.');
    expect(missingRulesMessage(unmetRules('abc1!'))).toBe('Add at least 8 characters and an uppercase letter.');
  });
});

describe('PasswordField', () => {
  function Host({ revealed = false }: { revealed?: boolean }) {
    const [v, setV] = useState('');
    return <PasswordField label="Password" value={v} onChange={setV} autoComplete="new-password" checklist revealChecklist={revealed} error={revealed ? 'Bad' : undefined} />;
  }
  it('shows the checklist on focus and stays open; Show toggles type and aria-pressed', async () => {
    render(<Host />);
    expect(screen.queryByRole('list', { name: 'Password requirements' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Password'), 'a');
    expect(screen.getByRole('list', { name: 'Password requirements' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('is described by its error and the checklist after a failed submit', () => {
    render(<Host revealed />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toMatch(/error.*policy/);
  });
});

describe('CodeInput', () => {
  it('is one input: typing six digits completes once, letters are dropped', async () => {
    const onComplete = vi.fn();
    function Host() {
      const [v, setV] = useState('');
      return <CodeInput value={v} onChange={setV} onComplete={onComplete} />;
    }
    render(<Host />);
    const input = screen.getByLabelText(/Verification code/);
    await userEvent.type(input, '12a3456');
    expect(input).toHaveValue('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });
  it('links the error to the input', () => {
    render(<CodeInput value="" onChange={() => undefined} error="That code did not work." />);
    expect(screen.getByLabelText(/Verification code/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('That code did not work.')).toBeInTheDocument();
  });
});

describe('FormSummary', () => {
  it('renders nothing without errors', () => {
    const { container } = render(<FormSummary items={[]} />);
    expect(container.innerHTML).toBe('');
  });
  it('counts the fields and moves focus to the one clicked', async () => {
    render(
      <>
        <input id="f1" aria-label="First" />
        <FormSummary items={[{ fieldId: 'f1', label: 'Email', message: 'Enter your email address.' }, { label: 'Other', message: 'Fix it.' }]} />
      </>,
    );
    expect(screen.getByText('2 fields need attention')).toBeInTheDocument();
    expect(screen.getByText('Email').parentElement).toHaveTextContent('Email: enter your email address.');
    await userEvent.click(screen.getByRole('link', { name: 'Email' }));
    expect(screen.getByLabelText('First')).toHaveFocus();
  });
  it('shows a server error that names no field', () => {
    render(<FormSummary title="Email or password is incorrect" message="Try again or reset your password." items={[]} />);
    expect(screen.getByText('Email or password is incorrect')).toBeInTheDocument();
    expect(screen.getByText(/Try again or reset your password\./)).toBeInTheDocument();
  });
});
