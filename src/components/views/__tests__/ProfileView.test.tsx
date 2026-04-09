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
  },
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
