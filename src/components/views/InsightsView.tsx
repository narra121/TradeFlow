import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { AccountFilter } from '@/components/account/AccountFilter';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { useGetStatsQuery, useGetSubscriptionQuery } from '@/store/api';
import { useAccounts } from '@/hooks/useAccounts';
import { insightsApi } from '@/lib/api/insights';
import { handleApiError } from '@/lib/api/api';
import type { InsightsResponse, InsightsApiResponse } from '@/types/insights';
import {
  ProfileScoreCard,
  BehavioralScores,
  InsightCard,
  TradeSpotlight,
  InsightsSummary,
  AuroraBackground,
  CostOfEmotionCard,
  StreakTimeline,
  TimeEdgeHeatmap,
  RevengeTradesTable,
  InsightsChat,
} from '@/components/insights';
import {
  Sparkles,
  Lock,
  RefreshCw,
  Clock,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

// ── Constants ────────────────────────────────────────────────────────

const MIN_TRADES_FOR_INSIGHTS = 10;
const ACTIVE_STATUSES = ['active', 'trialing'];

function isSubscriptionActive(subscription: any): boolean {
  if (!subscription) return false;
  if (ACTIVE_STATUSES.includes(subscription.status)) {
    if (subscription.status === 'trialing' && subscription.trialEnd) {
      return new Date(subscription.trialEnd) > new Date();
    }
    return true;
  }
  return false;
}

// ── Loading animation ────────────────────────────────────────────────

function InsightsLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center animate-in fade-in-0 duration-500">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary animate-pulse" />
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-primary/60" />
        </div>
        <div className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: '3s', animationDelay: '1s' }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-primary/40" />
        </div>
        <div className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: '3s', animationDelay: '2s' }}>
          <div className="absolute top-1/2 right-0 translate-x-1 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/30" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-2">Analyzing your trades...</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 animate-pulse">
        Our AI is reviewing your trading patterns, identifying strengths and areas for improvement
      </p>

      {/* Animated progress steps */}
      <div className="space-y-2 text-left max-w-xs w-full">
        {['Evaluating trade patterns', 'Scoring behavioral dimensions', 'Generating insights'].map(
          (step, i) => (
            <div
              key={step}
              className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-0 slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${i * 0.8}s`, animationFillMode: 'backwards' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
              <span>{step}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Premium gate ─────────────────────────────────────────────────────

function PremiumGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-primary/60" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">AI Insights is a Premium Feature</h3>
      <p className="text-muted-foreground max-w-md mb-8">
        Upgrade to unlock personalized trading analysis powered by AI. Get actionable insights,
        behavioral scores, and trade spotlights tailored to your trading style.
      </p>
      <Button asChild variant="glow" size="lg" className="gap-2">
        <Link to="/app/profile">
          <Sparkles className="w-4 h-4" />
          Upgrade to Premium
        </Link>
      </Button>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────

export function InsightsView() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.trades.filters);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  // Subscription check
  const { data: subscription, isLoading: subLoading } = useGetSubscriptionQuery();
  const isPremium = isSubscriptionActive(subscription);

  // Account info
  const { selectedAccountId, accounts } = useAccounts();
  const totalCapital = useMemo(() => {
    const accountId = selectedAccountId || 'ALL';
    if (accountId === 'ALL') {
      return accounts
        .filter((acc) => acc.id && acc.id !== '-1')
        .reduce((sum, acc) => sum + (acc.initialBalance || 0), 0);
    }
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.initialBalance || 0;
  }, [selectedAccountId, accounts]);

  // Fetch stats to know trade count
  const statsQueryParams = useMemo(
    () => ({
      accountId: filters.accountId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      totalCapital,
    }),
    [filters.accountId, filters.startDate, filters.endDate, totalCapital]
  );
  const { data: statsData } = useGetStatsQuery(statsQueryParams);
  const totalTrades = statsData?.totalTrades ?? 0;

  // Date preset handling
  const [datePreset, setDatePreset] = useState<DatePreset>(filters.datePreset || 'thisMonth');

  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset, customRange);
    dispatch(
      setDateRangeFilter({
        startDate: formatLocalDateOnly(range.from),
        endDate: formatLocalDateOnly(range.to),
        datePreset: preset,
      })
    );
    if (preset === 'custom') {
      setCustomRange(range);
    }
    setDatePreset(preset);
  };

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('report');

  // Insights state — direct API call, not RTK Query
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [meta, setMeta] = useState<InsightsApiResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await insightsApi.generateInsights({
        accountId: filters.accountId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setInsights(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters.accountId, filters.startDate, filters.endDate]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await insightsApi.generateInsights({
        accountId: filters.accountId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setInsights(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters.accountId, filters.startDate, filters.endDate]);

  // Sort insights: critical first, then warning, info, strength
  const sortedInsights = useMemo(() => {
    if (!insights?.insights) return [];
    const order = { critical: 0, warning: 1, info: 2, strength: 3 };
    return [...insights.insights].sort(
      (a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
    );
  }, [insights?.insights]);

  // Don't show the gate flash while subscription loads
  if (subLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">AI Insights</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              AI-powered analysis of your trading performance
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold ai-shimmer-text">AI Insights</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Beta</Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              AI-powered analysis of your trading performance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <AccountFilter />
          <DateRangeFilter
            selectedPreset={datePreset}
            onPresetChange={handleDatePresetChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            showCustomPicker
          />
        </div>
      </div>

      {/* Tab navigation — only show when insights exist or loading */}
      {(insights || loading) && isPremium && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="report">AI Report</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="chat">Ask AI</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Subscription gate */}
      {!isPremium ? (
        <PremiumGate />
      ) : loading ? (
        <InsightsLoadingSkeleton />
      ) : (
        <>
          {/* Cache status */}
          {meta?.cached && insights && (
            <div className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-lg animate-fade-in',
              meta.upToDate
                ? 'bg-success/8 border-l-2 border-success'
                : 'bg-yellow-400/8 border-l-2 border-yellow-400'
            )}>
              <Clock className={cn('w-4 h-4 mt-0.5 shrink-0', meta.upToDate ? 'text-success' : 'text-yellow-400')} />
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {meta.upToDate ? (
                  <p className="text-sm text-muted-foreground">
                    Up to date &mdash; generated{' '}
                    <span className="text-foreground font-medium">
                      {formatDistanceToNow(new Date(meta.generatedAt), { addSuffix: true })}
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Your trades have changed since this analysis was generated{' '}
                      <span className="text-foreground font-medium">
                        {formatDistanceToNow(new Date(meta.generatedAt), { addSuffix: true })}
                      </span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs shrink-0 h-7"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-destructive/8 border-l-2 border-destructive animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">Failed to generate insights</p>
                <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs shrink-0 h-7"
                onClick={handleGenerate}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Not enough trades */}
          {!insights && !error && totalTrades < MIN_TRADES_FOR_INSIGHTS && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-warning/60" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Not Enough Trades</h3>
              <p className="text-muted-foreground max-w-md mb-2">
                You have <span className="text-foreground font-medium">{totalTrades}</span> trade{totalTrades !== 1 ? 's' : ''} in
                the selected period. AI Insights needs at least{' '}
                <span className="text-foreground font-medium">{MIN_TRADES_FOR_INSIGHTS}</span> trades for meaningful analysis.
              </p>
              <p className="text-sm text-muted-foreground">
                Try expanding your date range or adding more trades.
              </p>
            </div>
          )}

          {/* Generate button — shown when enough trades but no insights yet */}
          {!insights && !error && totalTrades >= MIN_TRADES_FOR_INSIGHTS && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Analyze</h3>
              <p className="text-muted-foreground max-w-md mb-8">
                {totalTrades} trade{totalTrades !== 1 ? 's' : ''} in this period. Generate AI-powered insights
                to understand your trading patterns, strengths, and areas to improve.
              </p>
              <Button onClick={handleGenerate} size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Insights
              </Button>
            </div>
          )}

          {/* Report tab — existing insights results */}
          {activeTab === 'report' && insights && (
            <AuroraBackground>
              <div className="space-y-6 animate-in fade-in-0 duration-500 p-1">
                {/* Summary */}
                {insights.summary && <InsightsSummary summary={insights.summary} />}

                {/* Profile + Behavioral Scores */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {insights.profile && (
                    <ProfileScoreCard profile={insights.profile} />
                  )}
                  {insights.scores && insights.scores.length > 0 && (
                    <BehavioralScores scores={insights.scores} />
                  )}
                </div>

                {/* Cost of Emotion — only show if there's a cost */}
                {insights.patterns?.costOfEmotion && insights.patterns.costOfEmotion.totalEmotionalCost !== 0 && (
                  <CostOfEmotionCard costOfEmotion={insights.patterns.costOfEmotion} />
                )}

                {/* Insights */}
                {sortedInsights.length > 0 && (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      Key Insights
                      <span className="text-xs text-muted-foreground font-normal">
                        ({sortedInsights.length})
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {sortedInsights.map((insight, index) => (
                        <InsightCard
                          key={`${insight.severity}-${insight.title}-${index}`}
                          insight={insight}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trade Spotlights */}
                {insights.tradeSpotlights && insights.tradeSpotlights.length > 0 && (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      Trade Spotlights
                      <span className="text-xs text-muted-foreground font-normal">
                        ({insights.tradeSpotlights.length})
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {insights.tradeSpotlights.map((spotlight) => (
                        <TradeSpotlight key={spotlight.tradeId} spotlight={spotlight} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AuroraBackground>
          )}

          {/* Patterns tab */}
          {activeTab === 'patterns' && insights?.patterns && (
            <AuroraBackground>
              <div className="space-y-6 animate-in fade-in-0 duration-500 p-1">
                <CostOfEmotionCard costOfEmotion={insights.patterns.costOfEmotion} />
                <RevengeTradesTable revengeTrades={insights.patterns.revengeTrades} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <StreakTimeline
                    streaks={insights.patterns.streaks}
                    longestWinStreak={insights.patterns.longestWinStreak}
                    longestLossStreak={insights.patterns.longestLossStreak}
                    currentStreak={insights.patterns.currentStreak}
                  />
                  <TimeEdgeHeatmap
                    hourlyEdges={insights.patterns.hourlyEdges}
                    dayOfWeekEdges={insights.patterns.dayOfWeekEdges}
                  />
                </div>
              </div>
            </AuroraBackground>
          )}

          {/* Ask AI tab */}
          {activeTab === 'chat' && isPremium && (
            <InsightsChat
              accountId={filters.accountId}
              startDate={filters.startDate}
              endDate={filters.endDate}
              totalTrades={totalTrades}
            />
          )}
        </>
      )}
    </div>
  );
}
