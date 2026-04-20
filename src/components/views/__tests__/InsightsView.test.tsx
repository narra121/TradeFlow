import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { InsightsView } from '../InsightsView';

// Mock Radix UI Tooltip
vi.mock('@radix-ui/react-tooltip', async () => {
  const React = await import('react');
  return {
    Provider: ({ children }: any) => <>{children}</>,
    Root: ({ children }: any) => <>{children}</>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  };
});

// Mock RTK Query hooks
vi.mock('@/store/api', () => ({
  useGetSubscriptionQuery: vi.fn(),
}));

// Mock useAccounts
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(),
}));

// Mock useTradeCache
vi.mock('@/hooks/useTradeCache', () => ({
  useTradeCache: vi.fn(),
}));

// Mock useFirebaseAI
vi.mock('@/hooks/useFirebaseAI', () => ({
  useFirebaseReport: vi.fn(),
}));

// Mock useRateLimits
vi.mock('@/hooks/useRateLimits', () => ({
  useRateLimits: vi.fn(),
}));

// Mock child components
vi.mock('@/components/account/AccountFilter', () => ({
  AccountFilter: () => <div data-testid="account-filter">Account Filter</div>,
}));

vi.mock('@/components/filters/DateRangeFilter', () => ({
  DateRangeFilter: ({ insightsMode }: any) => (
    <div data-testid="date-range-filter" data-insights-mode={insightsMode}>Date Range Filter</div>
  ),
  getDateRangeFromPreset: vi.fn().mockReturnValue({ from: new Date('2026-03-01'), to: new Date('2026-04-19') }),
}));

// Mock insights child components
vi.mock('@/components/insights', () => ({
  ProfileScoreCard: ({ profile }: any) => <div data-testid="profile-score-card">{profile.typeLabel}</div>,
  BehavioralScores: ({ scores }: any) => <div data-testid="behavioral-scores">{scores.length} scores</div>,
  InsightCard: ({ insight }: any) => <div data-testid="insight-card">{insight.title}</div>,
  TradeSpotlight: ({ spotlight }: any) => <div data-testid="trade-spotlight">{spotlight.symbol}</div>,
  InsightsSummary: ({ summary }: any) => <div data-testid="insights-summary">{summary}</div>,
  AuroraBackground: ({ children }: any) => <div data-testid="aurora-background">{children}</div>,
  CostOfEmotionCard: ({ costOfEmotion }: any) => <div data-testid="cost-of-emotion">{costOfEmotion.totalEmotionalCost}</div>,
  StreakTimeline: () => <div data-testid="streak-timeline">Streak Timeline</div>,
  TimeEdgeHeatmap: () => <div data-testid="time-edge-heatmap">Time Edge Heatmap</div>,
  RevengeTradesTable: () => <div data-testid="revenge-trades-table">Revenge Trades Table</div>,
  InsightsChat: ({ isFullscreen, onToggleFullscreen }: any) => (
    <div data-testid="insights-chat" data-fullscreen={isFullscreen}>
      Insights Chat
      <button data-testid="toggle-fullscreen" onClick={onToggleFullscreen}>Toggle</button>
    </div>
  ),
}));

// Import mocked modules for per-test overrides
import { useGetSubscriptionQuery } from '@/store/api';
import { useAccounts } from '@/hooks/useAccounts';
import { useTradeCache } from '@/hooks/useTradeCache';
import { useFirebaseReport } from '@/hooks/useFirebaseAI';
import { useRateLimits } from '@/hooks/useRateLimits';

// ── Default mock return values ──────────────────────────────────────

const sampleTrades = Array.from({ length: 25 }, (_, i) => ({
  tradeId: `t${i + 1}`,
  symbol: i % 2 === 0 ? 'EURUSD' : 'GBPUSD',
  pnl: i % 3 === 0 ? -50 : 100,
}));

const fewTrades = [
  { tradeId: 't1', symbol: 'EURUSD', pnl: 100 },
  { tradeId: 't2', symbol: 'GBPUSD', pnl: -50 },
];

const sampleInsightsData = {
  profile: { type: 'day_trader', typeLabel: 'Day Trader', aggressivenessScore: 6, aggressivenessLabel: 'Aggressive', trend: null, summary: 'Active day trader' },
  scores: [
    { dimension: 'discipline', value: 75, label: 'Discipline' },
    { dimension: 'risk_management', value: 42, label: 'Risk Management' },
  ],
  insights: [
    { severity: 'critical', title: 'Revenge trading detected', detail: 'Detail text', evidence: 'Evidence text' },
    { severity: 'strength', title: 'Consistent EURUSD strategy', detail: 'Detail text', evidence: 'Evidence text' },
  ],
  tradeSpotlights: [
    { tradeId: 't1', symbol: 'EURUSD', date: '2026-04-10', pnl: -420, reason: 'Oversized position' },
  ],
  summary: 'Overall assessment text',
  patterns: {
    revengeTrades: [],
    overtradeDays: [],
    streaks: [],
    longestWinStreak: null,
    longestLossStreak: null,
    currentStreak: null,
    hourlyEdges: [],
    dayOfWeekEdges: [],
    costOfEmotion: { revengeTrading: { count: 0, totalPnl: 0, avgPnl: 0 }, overtrading: { daysCount: 0, excessTradePnl: 0 }, rulesViolations: { count: 0, totalPnl: 0 }, totalEmotionalCost: -150 },
    tradeCount: 25,
    dateRange: { start: '2026-03-01', end: '2026-04-19' },
  },
};

// ── Helper: set up default mocks ────────────────────────────────────

function setupDefaultMocks(overrides: {
  subscription?: any;
  subLoading?: boolean;
  trades?: any[];
  cacheLoading?: boolean;
  cacheSyncing?: boolean;
  cacheError?: string | null;
  insights?: any;
  streaming?: boolean;
  aiError?: string | null;
  rateLimits?: any;
  cacheChecked?: boolean;
  cacheHit?: boolean;
} = {}) {
  vi.mocked(useGetSubscriptionQuery).mockReturnValue({
    data: overrides.subscription ?? { status: 'active' },
    isLoading: overrides.subLoading ?? false,
  } as any);

  vi.mocked(useAccounts).mockReturnValue({
    accounts: [{ id: 'acc1', name: 'Main Account', initialBalance: 10000 }],
    selectedAccountId: null,
    selectedAccount: null,
    setSelectedAccountId: vi.fn(),
  } as any);

  vi.mocked(useTradeCache).mockReturnValue({
    trades: overrides.trades ?? sampleTrades,
    loading: overrides.cacheLoading ?? false,
    syncing: overrides.cacheSyncing ?? false,
    error: overrides.cacheError ?? null,
    refresh: vi.fn(),
  } as any);

  vi.mocked(useFirebaseReport).mockReturnValue({
    data: overrides.insights ?? null,
    streaming: overrides.streaming ?? false,
    error: overrides.aiError ?? null,
    cacheChecked: overrides.cacheChecked ?? true,
    cacheHit: overrides.cacheHit ?? false,
    checkCache: vi.fn(),
    generate: vi.fn(),
    abort: vi.fn(),
  });

  vi.mocked(useRateLimits).mockReturnValue(
    overrides.rateLimits !== undefined
      ? overrides.rateLimits
      : {
          insights: { used: 0, limit: 6, remaining: 6, resetAt: null },
          sessions: { used: 0, limit: 6, remaining: 6, resetAt: null },
        },
  );
}

// ── Tests ────────────────────────────────────────────────────────────

describe('InsightsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders page header', () => {
    render(<InsightsView />);
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(screen.getByText('AI-powered analysis of your trading performance')).toBeInTheDocument();
  });

  it('renders filters', () => {
    render(<InsightsView />);
    expect(screen.getByTestId('account-filter')).toBeInTheDocument();
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
  });

  it('renders date filter with insightsMode enabled', () => {
    render(<InsightsView />);
    const dateFilter = screen.getByTestId('date-range-filter');
    expect(dateFilter).toHaveAttribute('data-insights-mode', 'true');
  });

  it('shows spinner while subscription loads', () => {
    setupDefaultMocks({ subLoading: true });
    render(<InsightsView />);
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    // Should NOT show premium gate or generate button while loading
    expect(screen.queryByText('AI Insights is a Premium Feature')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate Insights')).not.toBeInTheDocument();
  });

  it('shows premium gate for free users', () => {
    setupDefaultMocks({ subscription: { status: 'free' } });
    render(<InsightsView />);
    expect(screen.getByText('AI Insights is a Premium Feature')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
  });

  it('shows "Not Enough Trades" when below threshold', () => {
    setupDefaultMocks({ trades: fewTrades });
    render(<InsightsView />);
    expect(screen.getByText('Not Enough Trades')).toBeInTheDocument();
    expect(screen.getByText(/AI Insights needs at least/)).toBeInTheDocument();
  });

  it('shows "Ready to Analyze" with Generate button when premium and enough trades', () => {
    render(<InsightsView />);
    expect(screen.getByText('Ready to Analyze')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Insights/ })).toBeInTheDocument();
  });

  it('disables Generate button while cache is syncing', () => {
    setupDefaultMocks({ cacheLoading: true, cacheSyncing: true });
    render(<InsightsView />);
    const btn = screen.getByRole('button', { name: /Syncing data/ });
    expect(btn).toBeDisabled();
  });

  it('calls generate with trades, accountId, and datePreset on Generate button click', async () => {
    const generateFn = vi.fn();
    vi.mocked(useFirebaseReport).mockReturnValue({
      data: null,
      streaming: false,
      error: null,
      cacheChecked: true,
      cacheHit: false,
      checkCache: vi.fn(),
      generate: generateFn,
      abort: vi.fn(),
    });

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));
    expect(generateFn).toHaveBeenCalledWith(sampleTrades, 'ALL', 'thisMonth');
  });

  it('shows loading skeleton while streaming without data', () => {
    setupDefaultMocks({ streaming: true, insights: null });
    render(<InsightsView />);
    expect(screen.getByText('Analyzing your trades...')).toBeInTheDocument();
  });

  it('shows syncing indicator when cache is syncing', () => {
    setupDefaultMocks({ cacheSyncing: true, cacheLoading: true });
    render(<InsightsView />);
    expect(screen.getByText('Syncing trade data...')).toBeInTheDocument();
  });

  it('shows cache error', () => {
    setupDefaultMocks({ cacheError: 'Failed to sync trades' });
    render(<InsightsView />);
    expect(screen.getByText('Failed to generate insights')).toBeInTheDocument();
    expect(screen.getByText('Failed to sync trades')).toBeInTheDocument();
  });

  it('shows AI error', () => {
    setupDefaultMocks({ aiError: 'Vertex AI unavailable' });
    render(<InsightsView />);
    expect(screen.getByText('Failed to generate insights')).toBeInTheDocument();
    expect(screen.getByText('Vertex AI unavailable')).toBeInTheDocument();
  });

  describe('tabs and results', () => {
    beforeEach(() => {
      setupDefaultMocks({ insights: sampleInsightsData });
    });

    it('renders 3 tabs when insights are available', () => {
      render(<InsightsView />);
      expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Patterns' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Ask AI' })).toBeInTheDocument();
    });

    it('defaults to Report tab', () => {
      render(<InsightsView />);
      expect(screen.getByRole('tab', { name: 'Report' })).toHaveAttribute('data-state', 'active');
    });

    it('renders summary in Report tab', () => {
      render(<InsightsView />);
      expect(screen.getByTestId('insights-summary')).toBeInTheDocument();
      expect(screen.getByText('Overall assessment text')).toBeInTheDocument();
    });

    it('renders profile card in Report tab', () => {
      render(<InsightsView />);
      expect(screen.getByTestId('profile-score-card')).toBeInTheDocument();
      expect(screen.getByText('Day Trader')).toBeInTheDocument();
    });

    it('renders behavioral scores in Report tab', () => {
      render(<InsightsView />);
      expect(screen.getByTestId('behavioral-scores')).toBeInTheDocument();
      expect(screen.getByText('2 scores')).toBeInTheDocument();
    });

    it('renders insight cards in Report tab', () => {
      render(<InsightsView />);
      const insightCards = screen.getAllByTestId('insight-card');
      expect(insightCards).toHaveLength(2);
      expect(screen.getByText('Revenge trading detected')).toBeInTheDocument();
      expect(screen.getByText('Consistent EURUSD strategy')).toBeInTheDocument();
    });

    it('renders trade spotlights in Report tab', () => {
      render(<InsightsView />);
      const spotlights = screen.getAllByTestId('trade-spotlight');
      expect(spotlights).toHaveLength(1);
      expect(screen.getByText('EURUSD')).toBeInTheDocument();
    });

    it('renders cost of emotion in Report tab when totalEmotionalCost is non-zero', () => {
      render(<InsightsView />);
      expect(screen.getByTestId('cost-of-emotion')).toBeInTheDocument();
    });

    it('switches to Patterns tab', async () => {
      const user = userEvent.setup();
      render(<InsightsView />);

      await user.click(screen.getByRole('tab', { name: 'Patterns' }));

      await waitFor(() => {
        expect(screen.getByTestId('revenge-trades-table')).toBeInTheDocument();
        expect(screen.getByTestId('streak-timeline')).toBeInTheDocument();
        expect(screen.getByTestId('time-edge-heatmap')).toBeInTheDocument();
      });
    });

    it('switches to Ask AI tab', async () => {
      const user = userEvent.setup();
      render(<InsightsView />);

      await user.click(screen.getByRole('tab', { name: 'Ask AI' }));

      await waitFor(() => {
        expect(screen.getByTestId('insights-chat')).toBeInTheDocument();
      });
    });
  });

  describe('streaming state', () => {
    it('shows skeleton sections in Report tab during streaming', () => {
      setupDefaultMocks({
        streaming: true,
        insights: { summary: 'Partial summary' },
      });
      render(<InsightsView />);

      // Summary should be rendered (it's available)
      expect(screen.getByTestId('insights-summary')).toBeInTheDocument();
      // Skeletons should appear for sections not yet received
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
      expect(screen.getByText('Loading scores...')).toBeInTheDocument();
    });

    it('shows Stop button during streaming', () => {
      setupDefaultMocks({
        streaming: true,
        insights: { summary: 'Partial summary' },
      });
      render(<InsightsView />);

      expect(screen.getByRole('button', { name: /Stop/ })).toBeInTheDocument();
    });

    it('calls abort when Stop is clicked', async () => {
      const abortFn = vi.fn();
      vi.mocked(useFirebaseReport).mockReturnValue({
        data: { summary: 'Partial summary' } as any,
        streaming: true,
        error: null,
        cacheChecked: true,
        cacheHit: false,
        checkCache: vi.fn(),
        generate: vi.fn(),
        abort: abortFn,
      });
      setupDefaultMocks();
      // Re-mock useFirebaseReport since setupDefaultMocks overrides it
      vi.mocked(useFirebaseReport).mockReturnValue({
        data: { summary: 'Partial summary' } as any,
        streaming: true,
        error: null,
        cacheChecked: true,
        cacheHit: false,
        checkCache: vi.fn(),
        generate: vi.fn(),
        abort: abortFn,
      });

      const user = userEvent.setup();
      render(<InsightsView />);

      await user.click(screen.getByRole('button', { name: /Stop/ }));
      expect(abortFn).toHaveBeenCalled();
    });

    it('renders sections progressively as they arrive', () => {
      // First just summary
      setupDefaultMocks({
        streaming: true,
        insights: { summary: 'Summary text' },
      });
      const { rerender } = render(<InsightsView />);
      expect(screen.getByTestId('insights-summary')).toBeInTheDocument();
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();

      // Now profile arrives too
      vi.mocked(useFirebaseReport).mockReturnValue({
        data: {
          summary: 'Summary text',
          profile: sampleInsightsData.profile,
        } as any,
        streaming: true,
        error: null,
        cacheChecked: true,
        cacheHit: false,
        checkCache: vi.fn(),
        generate: vi.fn(),
        abort: vi.fn(),
      });
      rerender(<InsightsView />);
      expect(screen.getByTestId('profile-score-card')).toBeInTheDocument();
    });
  });

  describe('rate limits', () => {
    it('shows rate limit remaining text below Generate button', () => {
      setupDefaultMocks({
        rateLimits: {
          insights: { used: 3, limit: 6, remaining: 3, resetAt: null },
          sessions: { used: 0, limit: 6, remaining: 6, resetAt: null },
        },
      });
      render(<InsightsView />);
      expect(screen.getByText('3/6 insights remaining')).toBeInTheDocument();
    });

    it('disables Generate button when rate limited (remaining: 0)', () => {
      setupDefaultMocks({
        rateLimits: {
          insights: { used: 6, limit: 6, remaining: 0, resetAt: new Date() },
          sessions: { used: 0, limit: 6, remaining: 6, resetAt: null },
        },
      });
      render(<InsightsView />);
      const btn = screen.getByRole('button', { name: /Generate Insights/ });
      expect(btn).toBeDisabled();
    });

    it('does not show rate limit text when rateLimits is null', () => {
      setupDefaultMocks({ rateLimits: null });
      render(<InsightsView />);
      expect(screen.queryByText(/insights remaining/)).not.toBeInTheDocument();
    });
  });

  describe('retry on error', () => {
    it('retry button calls generate again', async () => {
      const generateFn = vi.fn();
      setupDefaultMocks({ aiError: 'Network error' });
      vi.mocked(useFirebaseReport).mockReturnValue({
        data: null,
        streaming: false,
        error: 'Network error',
        cacheChecked: true,
        cacheHit: false,
        checkCache: vi.fn(),
        generate: generateFn,
        abort: vi.fn(),
      });

      const user = userEvent.setup();
      render(<InsightsView />);

      await user.click(screen.getByRole('button', { name: /Retry/ }));
      expect(generateFn).toHaveBeenCalledWith(sampleTrades, 'ALL', 'thisMonth');
    });
  });

  describe('cache auto-check', () => {
    it('auto-shows cached insight without Generate button when cacheHit is true', () => {
      setupDefaultMocks({
        insights: sampleInsightsData,
        cacheChecked: true,
        cacheHit: true,
      });
      render(<InsightsView />);

      // Should render the tabs (insights data is set)
      expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument();
      // Should NOT show Generate button
      expect(screen.queryByText('Ready to Analyze')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Generate Insights/ })).not.toBeInTheDocument();
    });

    it('shows Generate button when cacheChecked is true but cacheHit is false', () => {
      setupDefaultMocks({
        cacheChecked: true,
        cacheHit: false,
      });
      render(<InsightsView />);

      expect(screen.getByText('Ready to Analyze')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Insights/ })).toBeInTheDocument();
    });

    it('shows checking indicator while cacheChecked is false', () => {
      setupDefaultMocks({
        cacheChecked: false,
        cacheHit: false,
      });
      render(<InsightsView />);

      expect(screen.getByText('Checking for cached insights...')).toBeInTheDocument();
      // Should NOT show Generate button while checking
      expect(screen.queryByText('Ready to Analyze')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Generate Insights/ })).not.toBeInTheDocument();
    });

    it('calls checkCache when trades are ready and user is premium', () => {
      const checkCacheFn = vi.fn();
      vi.mocked(useFirebaseReport).mockReturnValue({
        data: null,
        streaming: false,
        error: null,
        cacheChecked: false,
        cacheHit: false,
        checkCache: checkCacheFn,
        generate: vi.fn(),
        abort: vi.fn(),
      });
      render(<InsightsView />);

      expect(checkCacheFn).toHaveBeenCalledWith(sampleTrades, 'ALL', 'thisMonth');
    });

    it('does not call checkCache when trades are below threshold', () => {
      const checkCacheFn = vi.fn();
      vi.mocked(useFirebaseReport).mockReturnValue({
        data: null,
        streaming: false,
        error: null,
        cacheChecked: false,
        cacheHit: false,
        checkCache: checkCacheFn,
        generate: vi.fn(),
        abort: vi.fn(),
      });
      vi.mocked(useTradeCache).mockReturnValue({
        trades: fewTrades,
        loading: false,
        syncing: false,
        error: null,
        refresh: vi.fn(),
      } as any);
      render(<InsightsView />);

      expect(checkCacheFn).not.toHaveBeenCalled();
    });

    it('does not call checkCache for free users', () => {
      const checkCacheFn = vi.fn();
      setupDefaultMocks({ subscription: { status: 'free' } });
      vi.mocked(useFirebaseReport).mockReturnValue({
        data: null,
        streaming: false,
        error: null,
        cacheChecked: false,
        cacheHit: false,
        checkCache: checkCacheFn,
        generate: vi.fn(),
        abort: vi.fn(),
      });
      render(<InsightsView />);

      expect(checkCacheFn).not.toHaveBeenCalled();
    });

    it('does not show checking indicator when not enough trades', () => {
      setupDefaultMocks({
        trades: fewTrades,
        cacheChecked: false,
        cacheHit: false,
      });
      render(<InsightsView />);

      expect(screen.queryByText('Checking for cached insights...')).not.toBeInTheDocument();
    });
  });

  describe('fullscreen chat', () => {
    beforeEach(() => {
      setupDefaultMocks({ insights: sampleInsightsData });
    });

    it('enters fullscreen mode when chat toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<InsightsView />);

      // Switch to Ask AI tab first
      await user.click(screen.getByRole('tab', { name: 'Ask AI' }));

      await waitFor(() => {
        expect(screen.getByTestId('insights-chat')).toBeInTheDocument();
      });

      // Click the toggle button inside the mocked InsightsChat
      await user.click(screen.getByTestId('toggle-fullscreen'));

      await waitFor(() => {
        expect(screen.getByTestId('fullscreen-chat-container')).toBeInTheDocument();
      });

      // Verify the InsightsChat receives isFullscreen=true
      const chat = screen.getByTestId('insights-chat');
      expect(chat).toHaveAttribute('data-fullscreen', 'true');
    });

    it('exits fullscreen mode and shows tabs again', async () => {
      const user = userEvent.setup();
      render(<InsightsView />);

      // Enter fullscreen via Ask AI tab
      await user.click(screen.getByRole('tab', { name: 'Ask AI' }));
      await waitFor(() => {
        expect(screen.getByTestId('insights-chat')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('toggle-fullscreen'));

      await waitFor(() => {
        expect(screen.getByTestId('fullscreen-chat-container')).toBeInTheDocument();
      });

      // Exit fullscreen
      await user.click(screen.getByTestId('toggle-fullscreen'));

      await waitFor(() => {
        expect(screen.queryByTestId('fullscreen-chat-container')).not.toBeInTheDocument();
      });

      // Tabs should be visible again
      expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Patterns' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Ask AI' })).toBeInTheDocument();
    });

    it('fullscreen hides header and filters', async () => {
      const user = userEvent.setup();
      render(<InsightsView />);

      // Enter fullscreen
      await user.click(screen.getByRole('tab', { name: 'Ask AI' }));
      await waitFor(() => {
        expect(screen.getByTestId('insights-chat')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('toggle-fullscreen'));

      await waitFor(() => {
        expect(screen.getByTestId('fullscreen-chat-container')).toBeInTheDocument();
      });

      // Header, filters, and tabs should be hidden
      expect(screen.queryByText('AI Insights')).not.toBeInTheDocument();
      expect(screen.queryByTestId('account-filter')).not.toBeInTheDocument();
      expect(screen.queryByTestId('date-range-filter')).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Report' })).not.toBeInTheDocument();
    });
  });
});
