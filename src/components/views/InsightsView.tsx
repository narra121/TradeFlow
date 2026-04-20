import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { AccountFilter } from '@/components/account/AccountFilter';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { useGetSubscriptionQuery } from '@/store/api';
import { useTradeCache } from '@/hooks/useTradeCache';
import { useFirebaseReport } from '@/hooks/useFirebaseAI';
import { useRateLimits } from '@/hooks/useRateLimits';
import { useTrimmedTrades } from '@/hooks/useTrimmedTrades';
import { TradeDetailModal } from '@/components/trade/TradeDetailModal';
import type { Trade } from '@/types/trade';
import {
  InsightsChat,
  InsightsReportContent,
} from '@/components/insights';
import {
  Sparkles,
  Lock,
  AlertTriangle,
  Brain,
  Loader2,
  Square,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

function InsightsLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center animate-in fade-in-0 duration-500">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary animate-pulse" />
        </div>
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

function formatResetTime(resetAt: Date | null): string {
  if (!resetAt) return '';
  return formatDistanceToNow(resetAt, { addSuffix: false });
}

export function InsightsView() {
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [localAccountId, setLocalAccountId] = useState<string | null>(null);
  const [chatFullscreen, setChatFullscreen] = useState(false);

  // Trade reference modal state
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(0);

  const localDates = useMemo(() => {
    const range = getDateRangeFromPreset(datePreset);
    return {
      startDate: formatLocalDateOnly(range.from),
      endDate: formatLocalDateOnly(range.to),
    };
  }, [datePreset]);

  const accountId = localAccountId || 'ALL';

  const { data: subscription, isLoading: subLoading } = useGetSubscriptionQuery();
  const isPremium = isSubscriptionActive(subscription);


  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
  };

  const {
    trades,
    loading: cacheSyncing,
    syncing,
    error: cacheError,
  } = useTradeCache({
    accountId,
    startDate: localDates.startDate,
    endDate: localDates.endDate,
  });

  const totalTrades = trades.length;
  const trimmedData = useTrimmedTrades(trades);

  const {
    data: insights,
    streaming,
    error: aiError,
    cacheChecked,
    isStale,
    cachedInsightId,
    checkCache,
    generate,
    abort,
  } = useFirebaseReport();

  const rateLimits = useRateLimits();

  useEffect(() => {
    if (!syncing && trimmedData && trades.length >= MIN_TRADES_FOR_INSIGHTS && isPremium) {
      checkCache(trimmedData, accountId, String(datePreset));
    }
  }, [syncing, trimmedData, accountId, datePreset, isPremium, checkCache, trades.length]);

  const error = cacheError || aiError;
  const [activeTab, setActiveTab] = useState<string>('report');

  const sortedInsights = useMemo(() => {
    if (!insights?.insights) return [];
    const order = { critical: 0, warning: 1, info: 2, strength: 3 };
    return [...insights.insights].sort(
      (a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
    );
  }, [insights?.insights]);

  const handleGenerate = () => {
    if (!trimmedData) return;
    generate(trimmedData, accountId, String(datePreset));
  };

  // Trade reference handlers
  const handleViewTrade = useCallback((tradeId: string) => {
    setSelectedTradeIds([tradeId]);
    setSelectedTradeIndex(0);
    setTradeModalOpen(true);
  }, []);

  const handleViewTrades = useCallback((tradeIds: string[]) => {
    setSelectedTradeIds(tradeIds);
    setSelectedTradeIndex(0);
    setTradeModalOpen(true);
  }, []);

  // Resolve trade IDs to Trade objects (check both id and tradeId for IndexedDB compatibility)
  const selectedTrades = useMemo(() => {
    return selectedTradeIds
      .map(id => trades.find(t => t.id === id || (t as any).tradeId === id))
      .filter((t): t is Trade => t != null);
  }, [selectedTradeIds, trades]);

  const currentSelectedTrade = selectedTrades[selectedTradeIndex] ?? null;

  // Fullscreen chat mode
  if (chatFullscreen) {
    return (
      <div className="h-[calc(100vh-2rem)] flex flex-col animate-fade-in" data-testid="fullscreen-chat-container">
        <InsightsChat
          accountId={accountId}
          period={String(datePreset)}
          startDate={localDates.startDate}
          endDate={localDates.endDate}
          trimmedData={trimmedData}
          isFullscreen={true}
          onToggleFullscreen={() => setChatFullscreen(false)}
          rateLimits={rateLimits}
          insightId={cachedInsightId ?? undefined}
          hasInsights={!!insights}
        />
      </div>
    );
  }

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
          <AccountFilter value={localAccountId} onValueChange={setLocalAccountId} />
          <DateRangeFilter
            selectedPreset={datePreset}
            onPresetChange={handleDatePresetChange}
            insightsMode
          />
        </div>
      </div>

      {/* Subscription gate */}
      {!isPremium ? (
        <PremiumGate />
      ) : (
        <>
          {/* Cache sync status */}
          {syncing && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-400/8 border-l-2 border-blue-400 animate-fade-in">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Syncing trade data...</p>
            </div>
          )}

          {/* Stale trades banner */}
          {isStale && insights && !streaming && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-warning/8 border-l-2 border-warning animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">Your trades have changed since these insights were generated</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Regenerate to include the latest data in your analysis.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={handleGenerate}
                  disabled={cacheSyncing || (rateLimits !== null && rateLimits.insights.remaining <= 0)}
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </Button>
                {rateLimits && (
                  <span className="text-[10px] text-muted-foreground">
                    {rateLimits.insights.remaining > 0 ? (
                      <>{rateLimits.insights.remaining}/{rateLimits.insights.limit} remaining</>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Resets in {formatResetTime(rateLimits.insights.resetAt)}
                      </span>
                    )}
                  </span>
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
                disabled={cacheSyncing || streaming}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Not enough trades */}
          {!insights && !streaming && !error && totalTrades < MIN_TRADES_FOR_INSIGHTS && (
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

          {/* Checking cache indicator */}
          {!cacheChecked && !streaming && !error && totalTrades >= MIN_TRADES_FOR_INSIGHTS && (
            <div className="flex items-center gap-2 justify-center py-16 sm:py-24 animate-in fade-in-0 duration-300">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Checking for cached insights...</p>
            </div>
          )}

          {/* Generate button — shown when enough trades but no insights yet and not streaming */}
          {!insights && !streaming && !error && cacheChecked && totalTrades >= MIN_TRADES_FOR_INSIGHTS && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Analyze</h3>
              <p className="text-muted-foreground max-w-md mb-8">
                {totalTrades} trade{totalTrades !== 1 ? 's' : ''} in this period. Generate AI-powered insights
                to understand your trading patterns, strengths, and areas to improve.
              </p>
              <Button
                onClick={handleGenerate}
                size="lg"
                className="gap-2"
                disabled={cacheSyncing || (rateLimits !== null && rateLimits.insights.remaining <= 0)}
              >
                <Sparkles className="w-4 h-4" />
                {cacheSyncing ? 'Syncing data...' : 'Generate Insights'}
              </Button>
              {rateLimits && (
                <p className="text-xs text-muted-foreground mt-1">
                  {rateLimits.insights.remaining > 0 ? (
                    <>{rateLimits.insights.remaining}/{rateLimits.insights.limit} insights remaining</>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 inline" />
                      Limit reached. Resets in {formatResetTime(rateLimits.insights.resetAt)}.
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Streaming initial state — skeleton while waiting for first data */}
          {streaming && !insights && (
            <InsightsLoadingSkeleton />
          )}

          {/* Tab layout — shown when insights data exists (including partial during streaming) */}
          {(insights || (streaming && insights)) && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="report">Report</TabsTrigger>
                  <TabsTrigger value="ask-ai">Ask AI</TabsTrigger>
                </TabsList>
                {streaming && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={abort}
                  >
                    <Square className="w-3 h-3" />
                    Stop
                  </Button>
                )}
              </div>

              <TabsContent value="report">
                <InsightsReportContent
                  insights={insights}
                  sortedInsights={sortedInsights}
                  streaming={streaming}
                  onViewTrade={handleViewTrade}
                  onViewTrades={handleViewTrades}
                />
              </TabsContent>

              {/* Ask AI tab */}
              <TabsContent value="ask-ai">
                <InsightsChat
                  accountId={accountId}
                  period={String(datePreset)}
                  startDate={localDates.startDate}
                  endDate={localDates.endDate}
                  trimmedData={trimmedData}
                  isFullscreen={false}
                  onToggleFullscreen={() => { setActiveTab('ask-ai'); setChatFullscreen(true); }}
                  rateLimits={rateLimits}
                  insightId={cachedInsightId ?? undefined}
                  hasInsights={!!insights}
                />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {/* Trade Detail Modal — for trade references in insights */}
      <TradeDetailModal
        trade={currentSelectedTrade}
        isOpen={tradeModalOpen}
        onClose={() => {
          setTradeModalOpen(false);
          setSelectedTradeIds([]);
          setSelectedTradeIndex(0);
        }}
        onPrevious={selectedTrades.length > 1 ? () => setSelectedTradeIndex(i => Math.max(0, i - 1)) : undefined}
        onNext={selectedTrades.length > 1 ? () => setSelectedTradeIndex(i => Math.min(selectedTrades.length - 1, i + 1)) : undefined}
        hasPrevious={selectedTradeIndex > 0}
        hasNext={selectedTradeIndex < selectedTrades.length - 1}
        currentIndex={selectedTradeIndex}
        totalCount={selectedTrades.length}
      />
    </div>
  );
}
