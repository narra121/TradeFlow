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

export interface InsightsResponse {
  profile: TraderProfile;
  scores: BehavioralScore[];
  insights: Insight[];
  tradeSpotlights: TradeSpotlight[];
  summary: string;
}

export interface InsightsApiResponse {
  data: InsightsResponse;
  meta: {
    cached: boolean;
    generatedAt: string;
    newTradesSince: number;
    elapsedMs: number;
  };
}

export interface GenerateInsightsRequest {
  accountId?: string;
  startDate: string;
  endDate: string;
}
