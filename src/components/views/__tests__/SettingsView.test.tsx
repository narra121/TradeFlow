import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { SettingsView } from '../SettingsView';

// --- Mock data ---
const mockProfile = {
  name: 'Trader Pro',
  email: 'trader@example.com',
  preferences: {
    darkMode: true,
    currency: 'USD',
    timezone: 'UTC',
    carryForwardGoalsRules: true,
    notifications: {
      tradeReminders: true,
      weeklyReport: true,
      goalAlerts: true,
    },
  },
};

const mockSavedOptions = {
  strategies: ['Breakout', 'Support Bounce'],
  newsEvents: ['NFP Release', 'FOMC Meeting'],
  sessions: ['Asian', 'London Open'],
  marketConditions: ['Trending', 'Ranging'],
  mistakes: ['FOMO', 'Early Entry'],
  symbols: [],
  lessons: [],
  timeframes: [],
};

// Mock Radix UI Tooltip for RefreshButton
vi.mock('@radix-ui/react-tooltip', async () => {
  const React = await import('react');
  return {
    Provider: ({ children }: any) => <>{children}</>,
    Root: ({ children }: any) => <>{children}</>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  };
});

// --- Mocks ---
vi.mock('@/store/api', () => ({
  useGetProfileQuery: vi.fn(() => ({
    data: mockProfile,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  })),
  useUpdateProfileMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useUpdatePreferencesMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useUpdateNotificationsMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
}));

vi.mock('@/hooks/useSavedOptions', () => ({
  useSavedOptions: vi.fn(() => ({
    options: mockSavedOptions,
    isLoading: false,
    isUpdating: false,
    addStrategy: vi.fn(),
    removeStrategy: vi.fn(),
    addNewsEvent: vi.fn(),
    removeNewsEvent: vi.fn(),
    addSession: vi.fn(),
    removeSession: vi.fn(),
    addMarketCondition: vi.fn(),
    removeMarketCondition: vi.fn(),
    addMistake: vi.fn(),
    removeMistake: vi.fn(),
    resetToDefaults: vi.fn(),
  })),
}));

// We import the mocked module so we can manipulate return values per-test
import { useGetProfileQuery } from '@/store/api';

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default return value
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
  });

  it('renders "Settings" heading', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /settings/i, level: 1 })).toBeInTheDocument();
  });

  it('shows description text', () => {
    render(<SettingsView />);
    expect(screen.getByText(/Configure trade options, preferences, and display settings/)).toBeInTheDocument();
  });

  it('does not show Preferences section (hidden for now)', () => {
    render(<SettingsView />);
    expect(screen.queryByText('Dark Mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Currency')).not.toBeInTheDocument();
    expect(screen.queryByText('Timezone')).not.toBeInTheDocument();
  });

  it('does not show Notifications section (hidden for now)', () => {
    render(<SettingsView />);
    expect(screen.queryByText('Trade Reminders')).not.toBeInTheDocument();
    expect(screen.queryByText('Weekly Report')).not.toBeInTheDocument();
    expect(screen.queryByText('Goal Alerts')).not.toBeInTheDocument();
  });

  it('shows Trade Options section', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /trade options/i })).toBeInTheDocument();
    expect(screen.getByText(/manage dropdown options for trade forms/i)).toBeInTheDocument();
  });

  it('shows Data Management section', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /data management/i })).toBeInTheDocument();
    expect(screen.getByText(/export trades as csv/i)).toBeInTheDocument();
    expect(screen.getByText(/backup & restore data/i)).toBeInTheDocument();
    expect(screen.getByText(/bulk data management/i)).toBeInTheDocument();
  });

  it('shows Goals & Rules section with carry forward toggle', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /goals & rules/i })).toBeInTheDocument();
    expect(screen.getByText(/carry forward goals & rules/i)).toBeInTheDocument();
    expect(screen.getByText(/when enabled, your customized goals and rules continue into new periods/i)).toBeInTheDocument();
  });

  it('shows loading skeleton when data is loading', () => {
    vi.mocked(useGetProfileQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    } as any);

    const { container } = render(<SettingsView />);

    // Heading and description should still be present
    expect(screen.getByRole('heading', { name: /settings/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Configure trade options, preferences, and display settings/)).toBeInTheDocument();

    // Skeleton elements should be rendered (the SettingsSectionSkeleton components)
    // Trade Options section should NOT be present when loading
    expect(screen.queryByRole('heading', { name: /trade options/i })).not.toBeInTheDocument();
  });
});
