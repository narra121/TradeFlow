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

import { SignupPage } from '../SignupPage';

describe('SignupPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders AuthPage with initialView="signup"', () => {
    renderWithProviders(<SignupPage />);
    const authPage = screen.getByTestId('auth-page');
    expect(authPage).toBeInTheDocument();
    expect(authPage).toHaveAttribute('data-view', 'signup');
  });

  it('displays signup text from AuthPage', () => {
    renderWithProviders(<SignupPage />);
    expect(screen.getByText('signup')).toBeInTheDocument();
  });

  it('navigates to /app on successful authentication', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);
    const trigger = screen.getByTestId('trigger-login');
    await user.click(trigger);
    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });
});
