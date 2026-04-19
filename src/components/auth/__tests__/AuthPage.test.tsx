import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import { AuthPage } from '../AuthPage';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Create mock mutation trigger functions
const mockLogin = vi.fn();
const mockSignup = vi.fn();
const mockConfirmSignup = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();

// Mock all auth API mutation hooks
vi.mock('@/store/api', () => ({
  useLoginMutation: () => [
    mockLogin,
    { isLoading: false, error: null },
  ],
  useSignupMutation: () => [
    mockSignup,
    { isLoading: false, error: null },
  ],
  useConfirmSignupMutation: () => [
    mockConfirmSignup,
    { isLoading: false, error: null },
  ],
  useForgotPasswordMutation: () => [
    mockForgotPassword,
    { isLoading: false, error: null },
  ],
  useResetPasswordMutation: () => [
    mockResetPassword,
    { isLoading: false, error: null },
  ],
}));

describe('AuthPage', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock returns
    mockLogin.mockReturnValue({ unwrap: () => Promise.resolve({ user: { id: '1', name: 'Test', email: 'test@test.com' }, token: 'tok', refreshToken: 'ref' }) });
    mockSignup.mockReturnValue({ unwrap: () => Promise.resolve({ user: { id: '1', name: 'Test', email: 'test@test.com' }, message: 'ok' }) });
    mockConfirmSignup.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockForgotPassword.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'sent' }) });
    mockResetPassword.mockReturnValue({ unwrap: () => Promise.resolve() });
  });

  describe('Login View', () => {
    it('renders the login form by default', () => {
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: {
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            signupSuccess: false,
          },
        },
      });
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to continue your trading journey')).toBeInTheDocument();
    });

    it('renders email and password input fields', () => {
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders the Sign In button', () => {
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('renders a link to create an account', () => {
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByText('Create one')).toBeInTheDocument();
    });

    it('renders a forgot password link', () => {
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('allows user to type email and password', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('calls login mutation when form is submitted', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'mypassword');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      expect(mockLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'mypassword' });
    });

    it('toggles password visibility when eye icon is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find the toggle button - it's a button inside the password field's parent
      const toggleButtons = screen.getAllByRole('button').filter(
        (btn) => btn.closest('.relative') && !btn.textContent?.includes('Sign')
      );
      // The first toggle is the password visibility toggle in the login form
      await user.click(toggleButtons[0]);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('navigates to forgot password view', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.click(screen.getByText('Forgot password?'));
      expect(screen.getByText('Forgot password?', { selector: 'h2' })).toBeInTheDocument();
    });
  });

  describe('Signup View', () => {
    it('renders the signup form when initialView is signup', () => {
      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByText('Create account')).toBeInTheDocument();
      expect(screen.getByText('Start your professional trading journey')).toBeInTheDocument();
    });

    it('renders name, email, password, and confirm password fields', () => {
      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('renders the Create Account button', () => {
      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('renders a link to sign in', () => {
      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('calls signup mutation when form is submitted with valid data', async () => {
      // Use delay: null to speed up typing (avoids per-keystroke delays that cause timeouts)
      const user = userEvent.setup({ delay: null });
      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      expect(mockSignup).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });
    });

    it('shows password mismatch text when passwords differ', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'differentpass');

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  describe('Forgot Password View', () => {
    it('navigates to forgot password and shows the form', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.click(screen.getByText('Forgot password?'));

      expect(screen.getByText('No worries, we\'ll send you reset instructions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Code' })).toBeInTheDocument();
    });

    it('has a back to login button', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.click(screen.getByText('Forgot password?'));
      expect(screen.getByText('Back to login')).toBeInTheDocument();
    });

    it('calls forgotPassword mutation when submitted', async () => {
      const user = userEvent.setup();
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.click(screen.getByText('Forgot password?'));

      await user.type(screen.getByLabelText('Email'), 'forgot@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Code' }));

      expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'forgot@example.com' });
    });
  });

  describe('Branding', () => {
    it('renders the TradeQut branding on the left panel', () => {
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      // The branding panel shows "TradeQut" text
      const brandTexts = screen.getAllByText('TradeQut');
      expect(brandTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders feature list items', () => {
      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });
      expect(screen.getByText('Detailed trade analytics & insights')).toBeInTheDocument();
      expect(screen.getByText('Performance tracking & goal setting')).toBeInTheDocument();
      expect(screen.getByText('Calendar view with P&L visualization')).toBeInTheDocument();
    });
  });

  describe('AuthPage - OTP Resend', () => {
    it('calls signup mutation when Resend is clicked in OTP view', async () => {
      const user = userEvent.setup({ delay: null });

      // Make the first signup call transition to OTP view via the resent path
      mockSignup.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ resent: true, message: 'Verification code resent to your email' }),
      });

      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      // Fill in the signup form to populate name, email, password state
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      // Wait for OTP view to appear
      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      // Set up fresh mock for the Resend click
      mockSignup.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ message: 'ok' }),
      });

      // Click the Resend button
      await user.click(screen.getByText('Resend'));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenLastCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        });
      });
    });

    it('shows success toast when OTP resend succeeds', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup({ delay: null });

      // Make the first signup call transition to OTP view
      mockSignup.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ resent: true, message: 'Verification code resent to your email' }),
      });

      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      // Fill in signup form and submit to reach OTP view
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      // Clear previous toast calls from the signup flow
      vi.mocked(toast.success).mockClear();

      // Set up mock for Resend click
      mockSignup.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ message: 'ok' }),
      });

      await user.click(screen.getByText('Resend'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Verification code resent to your email');
      });
    });

    it('shows error toast when OTP resend fails', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup({ delay: null });

      // Make the first signup call transition to OTP view
      mockSignup.mockReturnValueOnce({
        unwrap: () => Promise.resolve({ resent: true, message: 'Verification code resent to your email' }),
      });

      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      // Fill in signup form and submit to reach OTP view
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      // Make Resend click fail
      mockSignup.mockReturnValueOnce({
        unwrap: () => Promise.reject(new Error('Network error')),
      });

      await user.click(screen.getByText('Resend'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to resend code. Please try again.');
      });
    });
  });

  describe('AuthPage - Error Handling', () => {
    it('shows error toast when login mutation rejects', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup();

      mockLogin.mockReturnValue({
        unwrap: () => Promise.reject({ data: { message: 'Invalid credentials' } }),
      });

      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.type(screen.getByLabelText('Email'), 'bad@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({ email: 'bad@example.com', password: 'wrongpassword' });
      });
    });

    it('shows error toast when signup mutation rejects', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup({ delay: null });

      mockSignup.mockReturnValue({
        unwrap: () => Promise.reject({ data: { message: 'Email already exists' } }),
      });

      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'existing@example.com',
          password: 'password123',
        });
      });
    });

    it('does not call login mutation when email is empty', async () => {
      const user = userEvent.setup();

      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      // Only fill in password, leave email empty
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      // The email input has the `required` attribute, so native form validation
      // prevents submission before the JS handler runs.
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('does not call login mutation when password is empty', async () => {
      const user = userEvent.setup();

      render(<AuthPage onLogin={mockOnLogin} />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      // Only fill in email, leave password empty
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      // The password input has the `required` attribute, so native form validation
      // prevents submission before the JS handler runs.
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('does not call signup mutation when required fields are empty', async () => {
      const user = userEvent.setup();

      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      // Submit with all fields empty
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      // The signup form inputs have the `required` attribute, so native form
      // validation prevents submission before the JS handler runs.
      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('shows password too short error on signup when password is under 8 characters', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup({ delay: null });

      render(<AuthPage onLogin={mockOnLogin} initialView="signup" />, {
        preloadedState: {
          auth: { user: null, token: null, refreshToken: null, isAuthenticated: false, signupSuccess: false },
        },
      });

      await user.type(screen.getByLabelText('Full Name'), 'John');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'short');
      await user.type(screen.getByLabelText('Confirm Password'), 'short');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      expect(mockSignup).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Password must be at least 8 characters');
    });
  });
});
