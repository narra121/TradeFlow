// Mirrors JournalAWSSetup src/features/insights (POST /insights/generate, GET /insights).

export type InsightSectionKind = 'strength' | 'leak' | 'pattern' | 'action';
export type InsightMetricUnit = 'currency' | 'percent' | 'count' | 'ratio' | 'streak';

export interface InsightMetric {
  label: string;
  value: number | null;
  unit: InsightMetricUnit;
  /** formatted by the server, e.g. "-1,234.50" or "42.5%" */
  display: string;
}

export interface InsightSection {
  kind: InsightSectionKind;
  title: string;
  body: string;
  metric?: InsightMetric;
  /** always the user's own trades */
  tradeIds?: string[];
}

export interface Insight {
  id: string;
  createdAt: string;
  period: { from: string; to: string };
  accountId: string | null;
  summary: string;
  sections: InsightSection[];
  model: string;
  tradeCount: number;
  /** true when the period held more trades than could be loaded; the insight covers the oldest ones only */
  truncated?: boolean;
}

export interface GenerateInsightRequest {
  accountId?: string;
  /** ISO date YYYY-MM-DD */
  from: string;
  to: string;
}

export interface ListInsightsParams {
  accountId?: string;
  limit?: number;
  cursor?: string;
}

export interface ListInsightsResponse {
  insights: Insight[];
  nextCursor: string | null;
}
