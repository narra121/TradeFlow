import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecuritySection } from '../SecuritySection';
import { LOGGED_OUT_EVERYWHERE_URL, passwordErrorMessage } from '../helpers';

const useProfile = vi.fn();
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => useProfile() }));

const forgot = vi.fn();
const reset = vi.fn();
const clearLocal = vi.fn();
vi.mock('@/store/api/authApi', () => ({
  useForgotPasswordMutation: () => [forgot, { isLoading: false }],
  useResetPasswordMutation: () => [reset, { isLoading: false }],
  useLogoutMutation: () => [clearLocal, { isLoading: false }],
}));

const logoutAll = vi.fn();
vi.mock('@/store/api/profileApi', () => ({
  useLogoutAllDevicesMutation: () => [logoutAll, { isLoading: false }],
}));

const ok = () => ({ unwrap: () => Promise.resolve(undefined) });
const fail = (e: unknown) => ({ unwrap: () => Promise.reject(e) });
const base = { email: 'ada@example.com', method: 'password', isLoading: false, isError: false, refetch: vi.fn() };

describe('SecuritySection', () => {
  const assign = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    useProfile.mockReturnValue(base);
    clearLocal.mockReturnValue(ok());
    Object.defineProperty(window, 'location', { value: { assign }, writable: true });
  });

  it('shows the sign-in method and the password action for email users', () => {
    render(<SecuritySection />);
    expect(screen.getByText('Email and password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument();
  });

  it('explains Google users manage their password in Google and offers no change action', () => {
    useProfile.mockReturnValue({ ...base, method: 'google' });
    render(<SecuritySection />);
    expect(screen.getByText('You sign in with Google. Your password is managed by Google.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change password' })).toBeNull();
  });

  it('runs the code flow: send code, validate, change password, confirm', async () => {
    forgot.mockReturnValue(ok());
    reset.mockReturnValue(ok());
    const user = userEvent.setup();
    render(<SecuritySection />);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Send code' }));
    expect(forgot).toHaveBeenCalledWith({ email: 'ada@example.com' });

    await user.click(await within(dialog).findByRole('button', { name: 'Change password' }));
    expect(within(dialog).getByText('Enter the 6-digit code from your email.')).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Code from your email/), '123456');
    await user.type(within(dialog).getByLabelText(/New password/), 'weak');
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }));
    expect(within(dialog).getByText(/^Add:/)).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();

    await user.clear(within(dialog).getByLabelText(/New password/));
    await user.type(within(dialog).getByLabelText(/New password/), 'Str0ng!pass');
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(reset).toHaveBeenCalledWith({ email: 'ada@example.com', code: '123456', newPassword: 'Str0ng!pass' }));
    expect(await within(dialog).findAllByText('Password changed. Other devices stay signed in.')).not.toHaveLength(0);
  });

  it('shows a send-code failure inline in the dialog', async () => {
    forgot.mockReturnValue(fail({ status: 429, data: { message: 'Too many attempts' } }));
    const user = userEvent.setup();
    render(<SecuritySection />);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await user.click(await screen.findByRole('button', { name: 'Send code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Wait a few minutes');
  });

  it('confirms before logging out everywhere, then clears local state and goes to login', async () => {
    logoutAll.mockReturnValue(ok());
    const user = userEvent.setup();
    render(<SecuritySection />);
    await user.click(screen.getByRole('button', { name: 'Log out of all devices' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Log out everywhere?')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(logoutAll).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Log out everywhere' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(LOGGED_OUT_EVERYWHERE_URL));
    expect(clearLocal).toHaveBeenCalled();
  });

  it('stays signed in and shows an inline error when the sign-out call fails', async () => {
    logoutAll.mockReturnValue(fail({ status: 500 }));
    const user = userEvent.setup();
    render(<SecuritySection />);
    await user.click(screen.getByRole('button', { name: 'Log out of all devices' }));
    await user.click(await screen.findByRole('button', { name: 'Log out everywhere' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't log you out");
    expect(assign).not.toHaveBeenCalled();
    expect(clearLocal).not.toHaveBeenCalled();
  });

  it('shows an error state when the profile fails to load', () => {
    useProfile.mockReturnValue({ ...base, isError: true });
    render(<SecuritySection />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('passwordErrorMessage', () => {
  it('maps rate limits, expired and wrong codes', () => {
    expect(passwordErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
    expect(passwordErrorMessage({ status: 400, data: { message: 'Invalid verification code provided, please try again.' } })).toMatch(/not right/);
    expect(passwordErrorMessage({ status: 400, data: { message: 'Confirmation code has expired' } })).toMatch(/expired/);
    expect(passwordErrorMessage({})).toMatch(/Couldn't change the password/);
  });
});
