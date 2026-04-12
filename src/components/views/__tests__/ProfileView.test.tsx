import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
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
}));

vi.mock('@/hooks/useRazorpay', () => ({
  useRazorpay: () => ({
    initiateSubscription: vi.fn(),
    initiatePayment: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from 'sonner';

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

vi.mock('@/lib/tokenRefreshScheduler', () => ({
  tokenRefreshScheduler: {
    start: vi.fn(),
    stop: vi.fn(),
    schedule: vi.fn(),
  },
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
    // The support section heading
    expect(screen.getByRole('heading', { name: /support the developer/i })).toBeInTheDocument();
    // Plan tiers should be visible
    expect(screen.getByText(/100% free to use/i)).toBeInTheDocument();
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

  it('shows free account status when no subscription exists', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Free Account')).toBeInTheDocument();
  });

  it('shows subscription plans section when no active subscription', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    render(<ProfileView />);
    expect(screen.getByRole('heading', { name: /support the developer/i })).toBeInTheDocument();
    expect(screen.getByText(/100% free to use/i)).toBeInTheDocument();
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
