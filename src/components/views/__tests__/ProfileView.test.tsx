import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen, waitFor } from '@/test/test-utils';
import { ProfileView } from '../ProfileView';

// --- Mock data ---
const mockProfile = {
  name: 'Jane Doe',
  email: 'jane@example.com',
};

const mockSubscription = null;

const mockPlans = [
  { planId: 'plan_monthly_99', name: 'Basic Monthly', amount: 99, period: 'monthly', description: 'Basic monthly plan' },
  { planId: 'plan_monthly_299', name: 'Supporter Monthly', amount: 299, period: 'monthly', description: 'Supporter monthly plan' },
];

// --- Mocks ---
const mockUnwrap = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

vi.mock('@/store/api', () => ({
  useGetProfileQuery: vi.fn(() => ({
    data: mockProfile,
    isLoading: false,
    isFetching: false,
  })),
  useGetSubscriptionQuery: vi.fn(() => ({
    data: mockSubscription,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn().mockResolvedValue({ data: null }),
  })),
  useUpdateProfileMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useCreateSubscriptionMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useLogoutMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useGetPlansQuery: vi.fn(() => ({
    data: mockPlans,
    isLoading: false,
  })),
  useCancelSubscriptionMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  usePauseSubscriptionMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useResumeSubscriptionMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useUndoCancellationMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useVerifyCheckoutSessionMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ status: 'active', message: 'OK' }) }),
  ]),
}));

vi.mock('@/hooks/useStripeCheckout', () => ({
  useStripeCheckout: () => ({
    initiateSubscription: vi.fn(),
    loading: false,
    error: null,
  }),
}));

const mockUseCurrency = vi.fn(() => ({
  currency: 'USD' as string,
  loading: false,
}));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: (...args: any[]) => mockUseCurrency(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { useVerifyCheckoutSessionMutation } from '@/store/api';

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn().mockReturnValue({
    accounts: [
      { id: 'acc1', name: 'Main Account', initialBalance: 10000, createdAt: '2025-06-15T10:00:00.000Z' },
    ],
    selectedAccountId: null,
    selectedAccount: null,
    setSelectedAccountId: vi.fn(),
  }),
}));

import { useGetProfileQuery, useGetSubscriptionQuery, useGetPlansQuery } from '@/store/api';

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: mockSubscription,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);
  });

  it('renders "Profile" heading', () => {
    render(<ProfileView />);
    expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();
  });

  it('shows Personal Information card with name and email', () => {
    render(<ProfileView />);
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    // Name should appear in the displayed name area and input
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

  it('shows Subscription card', () => {
    render(<ProfileView />);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('shows Edit button', () => {
    render(<ProfileView />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('shows Logout button', () => {
    render(<ProfileView />);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('shows subscription plans section when no active subscription', () => {
    render(<ProfileView />);
    expect(screen.getByRole('heading', { name: /choose your plan/i })).toBeInTheDocument();
  });

  it('shows loading skeletons when loading', () => {
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);

    // Heading should still appear
    expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();

    // Personal Information card should NOT render when loading
    expect(screen.queryByText('Personal Information')).not.toBeInTheDocument();
  });
});

describe('ProfileView - Error States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header when profile data is undefined', () => {
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { status: 500, data: 'Server Error' },
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<ProfileView />);

    // Header should always render regardless of data state
    expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Manage your profile and subscription')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);

    render(<ProfileView />);

    // Header should still appear during loading
    expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();
    // Profile card content should not render when loading
    expect(screen.queryByText('Personal Information')).not.toBeInTheDocument();
    // Subscription card content should not render when loading
    expect(screen.queryByText('Your current plan')).not.toBeInTheDocument();
  });
});

describe('ProfileView - User Info & Form Fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: { name: 'Jane Doe', email: 'jane@example.com' },
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);
  });

  it('renders user name in the profile card', () => {
    render(<ProfileView />);
    // Name appears as display text and in the input value
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
  });

  it('renders user email in the profile card', () => {
    render(<ProfileView />);
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

  it('renders Full Name and Email Address form labels', () => {
    render(<ProfileView />);
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('renders the Edit button for profile', () => {
    render(<ProfileView />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('shows profile subtitle text', () => {
    render(<ProfileView />);
    expect(screen.getByText('Manage your profile and subscription')).toBeInTheDocument();
  });

  it('shows "Member since" with date derived from account createdAt', () => {
    render(<ProfileView />);
    expect(screen.getByText(/Member since June 2025/)).toBeInTheDocument();
  });

  it('hides "Member since" when no accounts exist', async () => {
    const { useAccounts } = await import('@/hooks/useAccounts');
    (useAccounts as ReturnType<typeof vi.fn>).mockReturnValue({
      accounts: [],
      selectedAccountId: null,
      selectedAccount: null,
      setSelectedAccountId: vi.fn(),
    });

    render(<ProfileView />);
    expect(screen.queryByText(/Member since/)).not.toBeInTheDocument();
  });
});

describe('ProfileView - Subscription Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: { name: 'Jane Doe', email: 'jane@example.com' },
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);
  });

  it('shows no active subscription status when no subscription exists', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('No Active Subscription')).toBeInTheDocument();
  });

  it('shows subscription plans section when no active subscription', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByRole('heading', { name: /choose your plan/i })).toBeInTheDocument();
  });
});

describe('ProfileView - Logout Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: { name: 'Jane Doe', email: 'jane@example.com' },
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);
  });

  it('renders a visible Logout button', () => {
    render(<ProfileView />);
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toBeVisible();
  });

  it('shows account details card title', () => {
    render(<ProfileView />);
    expect(screen.getByText('Your account details')).toBeInTheDocument();
  });
});

describe('ProfileView - Profile Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: { name: 'Jane Doe', email: 'jane@example.com' },
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);
  });

  it('shows toast warning when saving profile with empty name', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ProfileView />);

    // Click Edit to enable editing
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Clear the name field
    const nameInput = screen.getByLabelText('Full Name');
    await user.clear(nameInput);

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(toast.warning).toHaveBeenCalledWith('Name is required');
  });

  it('shows toast warning when saving profile with empty email', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ProfileView />);

    // Click Edit to enable editing
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Clear the email field
    const emailInput = screen.getByLabelText('Email Address');
    await user.clear(emailInput);

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(toast.warning).toHaveBeenCalledWith('Email is required');
  });
});

describe('ProfileView - Stripe Redirect Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);
    mockUseCurrency.mockReturnValue({ currency: 'USD', loading: false });
  });

  it('calls verifyCheckoutSession and shows success toast on active session', async () => {
    const mockVerifyFn = vi.fn().mockReturnValue({
      unwrap: () => Promise.resolve({ status: 'active', message: 'Payment successful! Your subscription is now active.' }),
    });
    vi.mocked(useVerifyCheckoutSessionMutation).mockReturnValue([mockVerifyFn] as any);

    const mockRefetch = vi.fn().mockResolvedValue({ data: { status: 'active' } });
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    } as any);

    render(<ProfileView />, { route: '/profile?session_id=cs_test_123' });

    await waitFor(() => {
      expect(mockVerifyFn).toHaveBeenCalledWith('cs_test_123');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Payment successful! Your subscription is now active.');
    });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('shows error toast when checkout session is expired', async () => {
    const mockVerifyFn = vi.fn().mockReturnValue({
      unwrap: () => Promise.resolve({ status: 'expired', message: 'Checkout session expired. Please try again.' }),
    });
    vi.mocked(useVerifyCheckoutSessionMutation).mockReturnValue([mockVerifyFn] as any);

    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />, { route: '/profile?session_id=cs_expired_456' });

    await waitFor(() => {
      expect(mockVerifyFn).toHaveBeenCalledWith('cs_expired_456');
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Checkout session expired. Please try again.');
    });
  });

  it('shows error toast when verification fails with network error', async () => {
    const mockVerifyFn = vi.fn().mockReturnValue({
      unwrap: () => Promise.reject(new Error('Network error')),
    });
    vi.mocked(useVerifyCheckoutSessionMutation).mockReturnValue([mockVerifyFn] as any);

    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />, { route: '/profile?session_id=cs_fail_789' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to verify payment. Please refresh the page.');
    });
  });

  it('shows info toast when checkout is cancelled', async () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />, { route: '/profile?checkout=cancelled' });

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Checkout was cancelled.');
    });
  });

  it('shows info toast for processing status and refetches subscription', async () => {
    const mockVerifyFn = vi.fn().mockReturnValue({
      unwrap: () => Promise.resolve({ status: 'processing', message: 'Payment is being processed...' }),
    });
    vi.mocked(useVerifyCheckoutSessionMutation).mockReturnValue([mockVerifyFn] as any);

    const mockRefetch = vi.fn().mockResolvedValue({ data: null });
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    } as any);

    render(<ProfileView />, { route: '/profile?session_id=cs_processing_101' });

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Payment is being processed...');
    });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('does not call verifyCheckoutSession when no session_id in URL', () => {
    const mockVerifyFn = vi.fn();
    vi.mocked(useVerifyCheckoutSessionMutation).mockReturnValue([mockVerifyFn] as any);

    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />, { route: '/profile' });

    expect(mockVerifyFn).not.toHaveBeenCalled();
  });
});

describe('ProfileView - Trial Subscription Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);
    mockUseCurrency.mockReturnValue({ currency: 'USD', loading: false });
  });

  it('shows "Free Trial" badge when subscription status is trial', () => {
    const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'trial', trialEnd },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText('Free Trial')).toBeInTheDocument();
  });

  it('shows days remaining in trial', () => {
    const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'trial', trialEnd },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText(/15 days remaining/)).toBeInTheDocument();
  });

  it('shows trial expiry date', () => {
    const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const expectedDate = trialEnd.toLocaleDateString();
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'trial', trialEnd: trialEnd.toISOString() },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText(new RegExp(`expires ${expectedDate.replace(/[/\\]/g, '\\$&')}`))).toBeInTheDocument();
  });

  it('shows trial info message about all features being available', () => {
    const trialEnd = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'trial', trialEnd },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText(/All features are available during your free trial/)).toBeInTheDocument();
  });

  it('shows emerald-styled badge for trial status', () => {
    const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'trial', trialEnd },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    const badge = screen.getByText('Free Trial');
    expect(badge).toHaveClass('bg-emerald-500/20');
  });

  it('shows "Payment Failed" badge when subscription status is past_due', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'past_due' },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
  });

  it('shows red-styled badge for past_due status', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'past_due' },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    const badge = screen.getByText('Payment Failed');
    expect(badge).toHaveClass('bg-red-500/20');
  });

  it('shows payment failed help text for past_due status', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'past_due' },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText(/Your payment failed/)).toBeInTheDocument();
  });

  it('shows 0 days remaining when trial has expired', () => {
    const trialEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'trial', trialEnd },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText(/0 days remaining/)).toBeInTheDocument();
  });
});

describe('ProfileView - PricingCards Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isFetching: false,
    } as any);
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);
  });

  it('renders PricingCards with Subscribe Monthly and Subscribe Yearly buttons', () => {
    mockUseCurrency.mockReturnValue({ currency: 'USD', loading: false });
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);

    render(<ProfileView />);
    expect(screen.getByRole('button', { name: /subscribe monthly/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subscribe yearly/i })).toBeInTheDocument();
  });

  it('renders Free tier as Current Plan', () => {
    mockUseCurrency.mockReturnValue({ currency: 'USD', loading: false });
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);

    render(<ProfileView />);
    expect(screen.getByRole('button', { name: /current plan/i })).toBeInTheDocument();
  });

  it('passes currency to useGetPlansQuery', () => {
    mockUseCurrency.mockReturnValue({ currency: 'INR', loading: false });
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: [
        { planId: 'plan_inr_monthly', name: 'Monthly INR', amount: 99, period: 'monthly', description: 'Monthly INR plan' },
      ],
      isLoading: false,
    } as any);

    render(<ProfileView />);
    expect(useGetPlansQuery).toHaveBeenCalledWith('INR');
  });

  it('shows "Choose Your Plan" heading when no active subscription', () => {
    mockUseCurrency.mockReturnValue({ currency: 'USD', loading: false });
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);

    render(<ProfileView />);
    expect(screen.getByRole('heading', { name: /choose your plan/i })).toBeInTheDocument();
  });

  it('shows PricingCards description text', () => {
    mockUseCurrency.mockReturnValue({ currency: 'USD', loading: false });
    vi.mocked(useGetPlansQuery).mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);

    render(<ProfileView />);
    expect(screen.getByText(/All core features are free with ads/)).toBeInTheDocument();
  });
});
