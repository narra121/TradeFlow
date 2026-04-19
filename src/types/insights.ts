export interface TraderProfile {
  type: 'scalper' | 'day_trader' | 'swing_trader' | 'conservative';
  typeLabel: string;
  aggressivenessScore: number;
  aggressivenessLabel: string;
  trend: string | null;
  summary: string;
}

export interface BehavioralScore {
  dimension: string;
  value: number;
  label: string;
}

export interface Insight {
  severity: 'critical' | 'warning' | 'info' | 'strength';
  title: string;
  detail: string;
  evidence: string;
  tradeIds?: string[];
}

export interface TradeSpotlight {
  tradeId: string;
  symbol: string;
  date: string;
  pnl: number;
  reason: string;
}

export interface RevengeTradeSignal {
  tradeId: string;
  triggerTradeId: string;
  gapMinutes: number;
  triggerPnl: number;
  revengePnl: number;
}

export interface OvertradeDay {
  date: string;
  tradeCount: number;
  pnl: number;
  avgTradesPerDay: number;
}

export interface StreakInfo {
  type: 'win' | 'loss';
  length: number;
  totalPnl: number;
  startDate: string;
  endDate: string;
  tradeIds: string[];
}

export interface HourlyEdge {
  hour: number;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  label: 'green_zone' | 'red_zone' | 'neutral';
}

export interface DayOfWeekEdge {
  day: number;
  dayName: string;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  label: 'green_zone' | 'red_zone' | 'neutral';
}

export interface CostOfEmotion {
  revengeTrading: { count: number; totalPnl: number; avgPnl: number };
  overtrading: { daysCount: number; excessTradePnl: number };
  rulesViolations: { count: number; totalPnl: number };
  totalEmotionalCost: number;
}

export interface PatternDetectionResult {
  revengeTrades: RevengeTradeSignal[];
  overtradeDays: OvertradeDay[];
  streaks: StreakInfo[];
  longestWinStreak: StreakInfo | null;
  longestLossStreak: StreakInfo | null;
  currentStreak: StreakInfo | null;
  hourlyEdges: HourlyEdge[];
  dayOfWeekEdges: DayOfWeekEdge[];
  costOfEmotion: CostOfEmotion;
  tradeCount: number;
  dateRange: { start: string; end: string };
}

export interface InsightsResponse {
  profile: TraderProfile;
  scores: BehavioralScore[];
  insights: Insight[];
  tradeSpotlights: TradeSpotlight[];
  summary: string;
  patterns?: PatternDetectionResult;
}

export interface InsightsApiResponse {
  data: InsightsResponse;
  meta: {
    cached: boolean;
    generatedAt: string;
    newTradesSince: number;
    elapsedMs: number;
    upToDate?: boolean;
  };
}

export interface GenerateInsightsRequest {
  accountId?: string;
  startDate: string;
  endDate: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface TrimmedTrade {
  tradeId: string;
  symbol: string;
  side: string;
  openDate: string;
  closeDate: string;
  pnl: number;
  volume: number;
  accountId?: string;
  tags?: string[];
  brokenRules?: string[];
  mistakes?: string[];
  lessons?: string[];
}
