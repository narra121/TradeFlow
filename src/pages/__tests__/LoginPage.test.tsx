import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/auth/AuthPage', () => ({
  AuthPage: (props: any) => (
    <div data-testid="auth-page" data-view={props.initialView}>
      {props.initialView}
      <button data-testid="trigger-login" onClick={() => props.onLogin()}>
        trigger
      </button>
    </div>
  ),
}));

import { LoginPage } from '../LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders AuthPage with initialView="login"', () => {
    renderWithProviders(<LoginPage />);
    const authPage = screen.getByTestId('auth-page');
    expect(authPage).toBeInTheDocument();
    expect(authPage).toHaveAttribute('data-view', 'login');
  });

  it('displays login text from AuthPage', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('navigates to /app on successful authentication', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const trigger = screen.getByTestId('trigger-login');
    await user.click(trigger);
    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });
});

describe('LoginPage - extended', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the AuthPage component inside the DOM', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('passes initialView="login" to AuthPage (not signup)', () => {
    renderWithProviders(<LoginPage />);
    const authPage = screen.getByTestId('auth-page');
    expect(authPage).toHaveAttribute('data-view', 'login');
    expect(authPage).not.toHaveAttribute('data-view', 'signup');
  });

  it('does not navigate before login is triggered', () => {
    renderWithProviders(<LoginPage />);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates exactly once on login trigger', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const trigger = screen.getByTestId('trigger-login');
    await user.click(trigger);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates to /app (not any other route) on login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const trigger = screen.getByTestId('trigger-login');
    await user.click(trigger);
    expect(mockNavigate).toHaveBeenCalledWith('/app');
    expect(mockNavigate).not.toHaveBeenCalledWith('/');
    expect(mockNavigate).not.toHaveBeenCalledWith('/signup');
  });
});
