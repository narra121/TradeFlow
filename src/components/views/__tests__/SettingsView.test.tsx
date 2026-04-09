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

// --- Mocks ---
vi.mock('@/store/api', () => ({
  useGetProfileQuery: vi.fn(() => ({
    data: mockProfile,
    isLoading: false,
    isFetching: false,
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
    } as any);
  });

  it('renders "Settings" heading', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /settings/i, level: 1 })).toBeInTheDocument();
  });

  it('shows "Customize your trading journal" description', () => {
    render(<SettingsView />);
    expect(screen.getByText('Customize your trading journal')).toBeInTheDocument();
  });

  it('shows Preferences section with Dark Mode toggle', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /preferences/i })).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('shows Currency select', () => {
    render(<SettingsView />);
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText(/display currency for p&l/i)).toBeInTheDocument();
  });

  it('shows Timezone select', () => {
    render(<SettingsView />);
    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText(/set your local timezone/i)).toBeInTheDocument();
  });

  it('shows Notifications section with Trade Reminders, Weekly Report, Goal Alerts', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText('Trade Reminders')).toBeInTheDocument();
    expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    expect(screen.getByText('Goal Alerts')).toBeInTheDocument();
  });

  it('shows Trade Options section', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /trade options/i })).toBeInTheDocument();
    expect(screen.getByText(/manage dropdown options for trade forms/i)).toBeInTheDocument();
  });

  it('shows Data Management section', () => {
    render(<SettingsView />);
    expect(screen.getByRole('heading', { name: /data management/i })).toBeInTheDocument();
    expect(screen.getByText(/data export and management features coming soon/i)).toBeInTheDocument();
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
    expect(screen.getByText('Customize your trading journal')).toBeInTheDocument();

    // Skeleton elements should be rendered (the SettingsSectionSkeleton components)
    // Preferences / Notifications / Trade Options sections should NOT be present
    expect(screen.queryByText('Dark Mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Trade Reminders')).not.toBeInTheDocument();
  });
});
