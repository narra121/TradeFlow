import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import { GoalsView } from '../GoalsView';

// Mock RTK Query hooks
vi.mock('@/store/api', () => ({
  useGetRulesAndGoalsQuery: vi.fn().mockReturnValue({
    data: {
      goals: [
        { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
        { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
        { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
      ],
      rules: [
        { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
        { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
      ],
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useGetGoalsProgressQuery: vi.fn().mockReturnValue({
    data: {
      goalProgress: {
        profit: { current: 200, target: 500, progress: 40, achieved: false },
        winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
        maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
        tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
      },
      ruleCompliance: {
        totalRules: 2,
        followedCount: 2,
        brokenRulesCounts: {},
      },
      goals: [
        { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
        { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
        { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
      ],
      rules: [
        { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
        { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
      ],
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useUpdateGoalMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useCreateGoalMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useCreateRuleMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useUpdateRuleMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useDeleteRuleMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useToggleRuleMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useGetAccountsQuery: vi.fn().mockReturnValue({
    data: {
      accounts: [
        { id: 'acc1', name: 'Main Account', initialBalance: 10000 },
      ],
    },
    isLoading: false,
    isFetching: false,
  }),
  useGetProfileQuery: vi.fn().mockReturnValue({
    data: {
      name: 'Trader Pro',
      email: 'trader@example.com',
      preferences: {
        darkMode: true,
        currency: 'USD',
        timezone: 'UTC',
        carryForwardGoalsRules: true,
        notifications: { tradeReminders: true, weeklyReport: true, goalAlerts: true },
      },
    },
    isLoading: false,
    isFetching: false,
  }),
}));

// GoalsView reads selectedAccountId from Redux store (via useAppSelector)
const accountsPreloadedState = {
  accounts: { selectedAccountId: 'acc1' as string | null },
};
const render = (ui: React.ReactElement) =>
  renderWithProviders(ui, { preloadedState: accountsPreloadedState });

// Mock child components
vi.mock('@/components/account/AccountFilter', () => ({
  AccountFilter: () => <div data-testid="account-filter">Account Filter</div>,
}));
vi.mock('@/components/ui/loading-skeleton', () => ({
  GoalCardSkeleton: () => <div data-testid="goal-card-skeleton" />,
  RulesListSkeleton: () => <div data-testid="rules-list-skeleton" />,
}));

describe('GoalsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<GoalsView />);
    expect(screen.getByText('Goals & Rules')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<GoalsView />);
    expect(screen.getByText('Set targets, track rules, and stay disciplined')).toBeInTheDocument();
  });

  it('renders the Weekly/Monthly tabs', () => {
    render(<GoalsView />);
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('renders the Trading Rules section', () => {
    render(<GoalsView />);
    expect(screen.getByText('Trading Rules')).toBeInTheDocument();
  });

  it('renders rule items', () => {
    render(<GoalsView />);
    expect(screen.getByText('Always set stop loss')).toBeInTheDocument();
    expect(screen.getByText('Never move stop loss')).toBeInTheDocument();
  });

  it('renders the Add Rule button', () => {
    render(<GoalsView />);
    expect(screen.getByText('Add Rule')).toBeInTheDocument();
  });

  it('renders the motivational quote section', () => {
    render(<GoalsView />);
    expect(screen.getByText(/The goal of a successful trader/)).toBeInTheDocument();
    expect(screen.getByText(/Alexander Elder/)).toBeInTheDocument();
  });

  it('renders the account filter', () => {
    render(<GoalsView />);
    expect(screen.getByTestId('account-filter')).toBeInTheDocument();
  });

  it('renders period navigation buttons', () => {
    render(<GoalsView />);
    // Today button should not appear when viewing current period
    // There should be navigation arrows (ChevronLeft / ChevronRight)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders goal cards for each goal type', () => {
    render(<GoalsView />);
    expect(screen.getByText('Profit Target')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Max Trades')).toBeInTheDocument();
  });

  it('shows loading skeleton when data is loading', async () => {
    const { useGetRulesAndGoalsQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: false,
    });
    const { useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: false,
    });

    render(<GoalsView />);
    expect(screen.getAllByTestId('goal-card-skeleton').length).toBeGreaterThan(0);
  });
});

describe('GoalsView - Error States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when rulesGoals is loading', async () => {
    const { useGetRulesAndGoalsQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    });
    const { useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    // Header should still render during loading
    expect(screen.getByText('Goals & Rules')).toBeInTheDocument();
    expect(screen.getByText('Set targets, track rules, and stay disciplined')).toBeInTheDocument();
    // Skeletons should appear for goal cards
    expect(screen.getAllByTestId('goal-card-skeleton').length).toBeGreaterThan(0);
    // Rules list skeleton should appear
    expect(screen.getByTestId('rules-list-skeleton')).toBeInTheDocument();
  });

  it('renders header even when API returns error/empty data', async () => {
    const { useGetRulesAndGoalsQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { goals: [], rules: [] },
      isLoading: false,
      isFetching: false,
      error: { status: 500, data: 'Server Error' },
    });
    const { useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    // Header and tabs should still render
    expect(screen.getByText('Goals & Rules')).toBeInTheDocument();
    expect(screen.getByText('Set targets, track rules, and stay disciplined')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    // Trading Rules section should still render
    expect(screen.getByText('Trading Rules')).toBeInTheDocument();
    // Motivational quote should still render
    expect(screen.getByText(/The goal of a successful trader/)).toBeInTheDocument();
  });
});

describe('GoalsView - Period Navigation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore default mocks that may have been overridden by Error States tests
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
          maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
          tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
        },
        ruleCompliance: {
          totalRules: 2,
          followedCount: 2,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders previous and next period navigation buttons', () => {
    render(<GoalsView />);
    // The period navigation has ChevronLeft and ChevronRight inside buttons
    const buttons = screen.getAllByRole('button');
    // Buttons include: refresh, weekly tab, monthly tab, prev, next, Add Rule, plus rule action buttons
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('shows the current period date range label', () => {
    render(<GoalsView />);
    // Default is weekly, so it should show a date range like "Jan 13 - Jan 19, 2025"
    // We can verify there is text with a dash (range separator)
    const periodLabel = screen.getByText(/\w{3}\s+\d+\s*-\s*\w{3}\s+\d+/);
    expect(periodLabel).toBeInTheDocument();
  });

  it('does not show Today button when viewing the current period', () => {
    render(<GoalsView />);
    // When viewing the current week, there should be no "Today" button
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });
});

describe('GoalsView - Weekly/Monthly Tabs', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
          maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
          tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
        },
        ruleCompliance: {
          totalRules: 2,
          followedCount: 2,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders Weekly tab as active by default', () => {
    render(<GoalsView />);
    const weeklyTab = screen.getByText('Weekly');
    expect(weeklyTab).toBeInTheDocument();
    // The Weekly tab should have data-state="active" since it's the default
    expect(weeklyTab.closest('[data-state]')).toHaveAttribute('data-state', 'active');
  });

  it('renders Monthly tab as inactive by default', () => {
    render(<GoalsView />);
    const monthlyTab = screen.getByText('Monthly');
    expect(monthlyTab).toBeInTheDocument();
    expect(monthlyTab.closest('[data-state]')).toHaveAttribute('data-state', 'inactive');
  });
});

describe('GoalsView - Rule Cards', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
          maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
          tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
        },
        ruleCompliance: {
          totalRules: 2,
          followedCount: 2,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders rule cards with rule text', () => {
    render(<GoalsView />);
    expect(screen.getByText('Always set stop loss')).toBeInTheDocument();
    expect(screen.getByText('Never move stop loss')).toBeInTheDocument();
  });

  it('renders Add Rule button in the Trading Rules section', () => {
    render(<GoalsView />);
    expect(screen.getByText('Add Rule')).toBeInTheDocument();
  });

  it('shows rule compliance count', () => {
    render(<GoalsView />);
    // The component shows "X/Y followed this week"
    const complianceText = screen.getByText(/\d+\/\d+ followed/);
    expect(complianceText).toBeInTheDocument();
  });
});

describe('GoalsView - Goal Progress Indicators', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
          maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
          tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
        },
        ruleCompliance: {
          totalRules: 2,
          followedCount: 2,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
  });

  it('renders all four goal type cards when data is loaded', () => {
    render(<GoalsView />);
    expect(screen.getByText('Profit Target')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Max Trades')).toBeInTheDocument();
  });

  it('shows period badge on each goal card', () => {
    render(<GoalsView />);
    // Default period is "weekly"; each goal card shows a period badge
    const weeklyBadges = screen.getAllByText('weekly');
    expect(weeklyBadges.length).toBe(4);
  });

  it('shows Limit badge on inverse goal cards', () => {
    render(<GoalsView />);
    // Max Drawdown and Max Trades are inverse goals and show "Limit" badge
    const limitBadges = screen.getAllByText('Limit');
    expect(limitBadges.length).toBe(2);
  });

  it('shows goal descriptions for each goal type', () => {
    render(<GoalsView />);
    expect(screen.getByText('Reach profit goal')).toBeInTheDocument();
    expect(screen.getByText('Maintain win rate goal')).toBeInTheDocument();
    expect(screen.getByText('Keep drawdown under limit')).toBeInTheDocument();
    expect(screen.getByText('Stay under trade limit')).toBeInTheDocument();
  });

  it('renders the account filter in goals view', () => {
    render(<GoalsView />);
    expect(screen.getByTestId('account-filter')).toBeInTheDocument();
  });
});

describe('GoalsView - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows default goal cards with zero progress when no goals data exists', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    // Should show all 4 default goal cards instead of empty state
    expect(screen.queryByText('No goals data yet')).not.toBeInTheDocument();
    expect(screen.getByText('Profit Target')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Max Trades')).toBeInTheDocument();
  });

  it('does not show empty state when goals data exists', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
          maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
          tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
        },
        ruleCompliance: {
          totalRules: 1,
          followedCount: 1,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
        ],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    expect(screen.queryByText('No goals data yet')).not.toBeInTheDocument();
  });
});

describe('GoalsView - Default Rules Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows default rules when no backend rules exist', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { goals: [], rules: [] },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: { profit: { current: 0, target: 500, progress: 0, achieved: false } },
        ruleCompliance: { totalRules: 0, followedCount: 0, brokenRulesCounts: {} },
        goals: [],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    // Should show default rules instead of empty state
    expect(screen.queryByText('No trading rules yet')).not.toBeInTheDocument();
    expect(screen.getByText('Never risk more than 1% per trade')).toBeInTheDocument();
    expect(screen.getByText('Always set stop loss before entry')).toBeInTheDocument();
    expect(screen.getByText(/default rules/i)).toBeInTheDocument();
  });

  it('shows Add Rule button even with default rules', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { goals: [], rules: [] },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: { profit: { current: 0, target: 500, progress: 0, achieved: false } },
        ruleCompliance: { totalRules: 0, followedCount: 0, brokenRulesCounts: {} },
        goals: [],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    expect(screen.getByRole('button', { name: /Add Rule/i })).toBeInTheDocument();
  });

  it('does not show default rules when backend rules exist', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
          maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
          tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
        },
        ruleCompliance: {
          totalRules: 2,
          followedCount: 2,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    expect(screen.queryByText('No trading rules yet')).not.toBeInTheDocument();
  });
});

describe('GoalsView - Edit Goal Targets', () => {
  let mockCreateGoal: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateGoal = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    const {
      useGetRulesAndGoalsQuery,
      useGetGoalsProgressQuery,
      useCreateGoalMutation,
      useUpdateGoalMutation,
    } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
          maxDrawdown: { current: 1.5, target: 3, progress: 50, achieved: true },
          tradeCount: { current: 1, target: 8, progress: 12.5, achieved: true },
        },
        ruleCompliance: {
          totalRules: 2,
          followedCount: 2,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
          { goalId: 'g3', goalType: 'maxDrawdown', period: 'weekly', target: 3, accountId: 'acc1' },
          { goalId: 'g4', goalType: 'maxTrades', period: 'weekly', target: 8, accountId: 'acc1' },
        ],
        rules: [
          { id: 'r1', ruleId: 'r1', rule: 'Always set stop loss', completed: true },
          { id: 'r2', ruleId: 'r2', rule: 'Never move stop loss', completed: false },
        ],
      },
      isLoading: false,
      isFetching: false,
    });
    (useCreateGoalMutation as ReturnType<typeof vi.fn>).mockReturnValue([mockCreateGoal]);
    (useUpdateGoalMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
    ]);
  });

  it('shows edit pencil buttons on goal cards', () => {
    render(<GoalsView />);
    // Each goal card has a Pencil edit button (opacity-0 but in the DOM)
    // The pencil buttons are inside buttons with ghost variant and icon size
    // There are 4 goal cards, each with one edit pencil button
    const allButtons = screen.getAllByRole('button');
    // Filter to find pencil edit buttons — they are the ones inside goal cards
    // with the Pencil icon (the SVG has a class containing "w-3.5 h-3.5")
    // Since we can't easily query by icon, count buttons that contain SVG elements
    // matching the pencil pattern. Instead, verify 4 goal cards are rendered
    // and that there are pencil-containing buttons in the DOM.
    expect(screen.getByText('Profit Target')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Max Trades')).toBeInTheDocument();

    // Each goal card's edit button is a ghost button with icon size.
    // We can verify by clicking one and seeing the edit UI appear.
    // But first, let's just confirm the buttons exist in the DOM.
    // The pencil buttons have class "opacity-60 hover:opacity-100"
    // Find all buttons and filter to those that have the opacity-60 class
    const pencilButtons = allButtons.filter(
      (btn) => btn.classList.contains('opacity-60') && btn.classList.contains('hover:opacity-100')
    );
    expect(pencilButtons).toHaveLength(4);
  });

  it('edit pencil count matches number of goal cards', () => {
    render(<GoalsView />);
    // There are exactly 4 goal types (Profit Target, Win Rate, Max Drawdown, Max Trades)
    const goalCardTitles = ['Profit Target', 'Win Rate', 'Max Drawdown', 'Max Trades'];
    goalCardTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    // Each goal card renders exactly one pencil edit button
    const allButtons = screen.getAllByRole('button');
    const pencilButtons = allButtons.filter(
      (btn) => btn.classList.contains('opacity-60') && btn.classList.contains('hover:opacity-100')
    );
    expect(pencilButtons).toHaveLength(goalCardTitles.length);
  });

  it('calls createGoal when saving a synthetic goal target', async () => {
    // Use empty backend goals so all 4 are synthetic
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 0, target: 500, progress: 0, achieved: false },
          winRate: { current: 0, target: 65, progress: 0, achieved: false },
          maxDrawdown: { current: 0, target: 3, progress: 0, achieved: false },
          tradeCount: { current: 0, target: 8, progress: 0, achieved: false },
        },
        ruleCompliance: { totalRules: 0, followedCount: 0, brokenRulesCounts: {} },
        goals: [],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    // Find the pencil edit buttons (opacity-60 hover buttons)
    const allButtons = screen.getAllByRole('button');
    const pencilButtons = allButtons.filter(
      (btn) => btn.classList.contains('opacity-60') && btn.classList.contains('hover:opacity-100')
    );
    expect(pencilButtons.length).toBeGreaterThan(0);

    // Click the first pencil button (Profit Target)
    fireEvent.click(pencilButtons[0]);

    // An input should appear for editing the target value
    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();

    // Change the value and confirm
    fireEvent.change(input, { target: { value: '1000' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // createGoal should be called for a synthetic goal (no goalId) with periodKey
    await waitFor(() => {
      expect(mockCreateGoal).toHaveBeenCalledWith({
        accountId: 'acc1',
        goalType: 'profit',
        period: 'weekly',
        target: 1000,
        periodKey: expect.stringMatching(/^week#\d{4}-\d{2}-\d{2}$/),
      });
    });
  });
});
