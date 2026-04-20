import { Sparkles } from 'lucide-react';
import type { InsightsResponse, Insight } from '@/types/insights';
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
} from '@/components/insights';

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-primary/20" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted/50 rounded w-3/4" />
        <div className="h-4 bg-muted/50 rounded w-1/2" />
        <div className="h-4 bg-muted/50 rounded w-2/3" />
      </div>
    </div>
  );
}

interface InsightsReportContentProps {
  insights: Partial<InsightsResponse> | null;
  sortedInsights: Insight[];
  streaming: boolean;
  onViewTrade: (tradeId: string) => void;
  onViewTrades: (tradeIds: string[]) => void;
}

export function InsightsReportContent({
  insights,
  sortedInsights,
  streaming,
  onViewTrade,
  onViewTrades,
}: InsightsReportContentProps) {
  return (
    <AuroraBackground>
      <div className="space-y-6 animate-in fade-in-0 duration-500 p-1">
        {insights?.summary ? (
          <InsightsSummary summary={insights.summary} />
        ) : streaming ? (
          <SectionSkeleton label="Loading summary..." />
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {insights?.profile ? (
            <ProfileScoreCard profile={insights.profile} />
          ) : streaming ? (
            <SectionSkeleton label="Loading profile..." />
          ) : null}
          {insights?.scores && insights.scores.length > 0 ? (
            <BehavioralScores scores={insights.scores} />
          ) : streaming ? (
            <SectionSkeleton label="Loading scores..." />
          ) : null}
        </div>

        {insights?.patterns?.costOfEmotion && insights.patterns.costOfEmotion.totalEmotionalCost !== 0 && (
          <CostOfEmotionCard costOfEmotion={insights.patterns.costOfEmotion} />
        )}

        {sortedInsights.length > 0 ? (
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
                  onViewTrades={onViewTrades}
                />
              ))}
            </div>
          </div>
        ) : streaming ? (
          <SectionSkeleton label="Loading insights..." />
        ) : null}

        {insights?.tradeSpotlights && insights.tradeSpotlights.length > 0 ? (
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
                <TradeSpotlight
                  key={spotlight.tradeId}
                  spotlight={spotlight}
                  onViewTrade={onViewTrade}
                />
              ))}
            </div>
          </div>
        ) : streaming ? (
          <SectionSkeleton label="Loading trade spotlights..." />
        ) : null}

        {insights?.patterns ? (
          <>
            <RevengeTradesTable
              revengeTrades={insights.patterns.revengeTrades}
              onViewTrade={onViewTrade}
            />
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
          </>
        ) : streaming ? (
          <div className="space-y-4">
            <SectionSkeleton label="Loading pattern analysis..." />
            <SectionSkeleton label="Loading streak data..." />
          </div>
        ) : null}
      </div>
    </AuroraBackground>
  );
}
