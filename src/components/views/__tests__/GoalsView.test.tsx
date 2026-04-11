import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
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
}));

// Mock custom hooks
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn().mockReturnValue({
    accounts: [
      { id: 'acc1', name: 'Main Account', initialBalance: 10000 },
    ],
    selectedAccountId: 'acc1',
    selectedAccount: { id: 'acc1', name: 'Main Account', initialBalance: 10000 },
    setSelectedAccountId: vi.fn(),
  }),
}));

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

describe('GoalsView - Rules Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows rules empty state when no rules exist', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
          winRate: { current: 100, target: 65, progress: 153.8, achieved: true },
        },
        ruleCompliance: {
          totalRules: 0,
          followedCount: 0,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
          { goalId: 'g2', goalType: 'winRate', period: 'weekly', target: 65, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    expect(screen.getByText('No trading rules yet')).toBeInTheDocument();
  });

  it('shows Create Your First Rule button', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
        },
        ruleCompliance: {
          totalRules: 0,
          followedCount: 0,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    expect(screen.getByRole('button', { name: /Create Your First Rule/ })).toBeInTheDocument();
  });

  it('hides followed counter when no rules', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
        },
        ruleCompliance: {
          totalRules: 0,
          followedCount: 0,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    expect(screen.queryByText(/\d+\/\d+ followed/)).not.toBeInTheDocument();
  });

  it('hides Add Rule button when no rules exist', async () => {
    const { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery } = await import('@/store/api');
    (useGetRulesAndGoalsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });
    (useGetGoalsProgressQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        goalProgress: {
          profit: { current: 200, target: 500, progress: 40, achieved: false },
        },
        ruleCompliance: {
          totalRules: 0,
          followedCount: 0,
          brokenRulesCounts: {},
        },
        goals: [
          { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 500, accountId: 'acc1' },
        ],
        rules: [],
      },
      isLoading: false,
      isFetching: false,
    });

    render(<GoalsView />);

    expect(screen.queryByText('Add Rule')).not.toBeInTheDocument();
  });

  it('does not show rules empty state when rules exist', async () => {
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
