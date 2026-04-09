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
  }),
  useGetGoalPeriodTradesQuery: vi.fn().mockReturnValue({
    data: [
      {
        id: '1',
        symbol: 'EURUSD',
        direction: 'LONG',
        entryPrice: 1.1,
        exitPrice: 1.12,
        stopLoss: 1.09,
        takeProfit: 1.13,
        size: 1,
        entryDate: '2025-01-15T10:00:00Z',
        exitDate: '2025-01-15T14:00:00Z',
        outcome: 'TP',
        pnl: 200,
        riskRewardRatio: 2.0,
        accountId: 'acc1',
      },
    ],
    isLoading: false,
    isFetching: false,
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
    expect(screen.getByText('Track your trading objectives')).toBeInTheDocument();
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
    const { useGetGoalPeriodTradesQuery } = await import('@/store/api');
    (useGetGoalPeriodTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
    });

    render(<GoalsView />);
    expect(screen.getAllByTestId('goal-card-skeleton').length).toBeGreaterThan(0);
  });
});
