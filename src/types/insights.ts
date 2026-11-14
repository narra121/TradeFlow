// Mirrors JournalAWSSetup src/features/insights (POST /insights/generate, GET /insights) and src/features/insights/types.ts
// + src/features/focus/types.ts (weekly review, CONTRACT I6): change those files, then copy them here.
// Review money is in `Review.currency`, rounded to cents; R is realised R (CONTRACT I2); shares are fractions (0.25 = 25%).
import type { SampleLabel, Verdict, WhatIfRule } from './analysis';

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

/**
 * A focus rule: one what-if rule, or a behaviour rule judged per trade: `exitAtStop` (a losing trade ends at its stop),
 * `setStop` (every trade has a stop), `pauseAfterLoss` (no entry within `minutes` of a losing trade closing the same day).
 */
export type FocusRule = WhatIfRule | { kind: 'exitAtStop' } | { kind: 'setStop' } | { kind: 'pauseAfterLoss'; minutes: number };

export interface Focus {
  rule: FocusRule;
  /** the if-then sentence the trader committed to */
  text: string;
  /** ISO instant; only trades opened at or after it are checked */
  startedAt: string;
  findingKey: string | null;
}

/** Kept/broken of a focus rule over the trades in scope. */
export interface FocusCheck {
  /** trades the rule applies to (for exitAtStop: losing trades with a stop) */
  checked: number;
  kept: number;
  broken: number;
  brokenTradeIds: string[];
  brokenNet: number;
  /** money the breaks cost, never negative */
  cost: number;
}

/** `detector:<DetectorId>`, `segment:<Dimension>:<key>`, `rule:<text>`, `mistake:<tag>`, `different:<measure>` */
export type FindingKey = string;
export type FindingSource = 'detector' | 'segment' | 'rule' | 'mistake';

export interface FindingHistory {
  /** consecutive ISO weeks, this one included, in which the finding had trades */
  weeksInRow: number;
  /** trades of the finding in the previous ISO week; null when that week has no record of it */
  lastWeekCount: number | null;
  status: 'new' | 'down' | 'up' | 'same';
}

export interface ReviewFinding {
  key: FindingKey;
  source: FindingSource;
  title: string;
  /** trades of this period attributed to the finding; a trade is attributed to one finding at most */
  trades: number;
  /** at most 100 */
  tradeIds: string[];
  /** money the behaviour cost this period (positive) */
  cost: number;
  /** null when none of its trades has a stop */
  costR: number | null;
  net: number;
  avgR: number | null;
  /** trades with the behaviour in the baseline and the period together */
  evidenceTrades: number;
  label: SampleLabel;
  verdict: Verdict;
  /** accounting: a process break, counted and summed; evidence: a pattern that passed the evidence rule as a leak */
  basis: 'accounting' | 'evidence';
  ruleText: string;
  /** null when the rule cannot be checked from trade data (a rule or mistake tag of the trader's own) */
  rule: FocusRule | null;
  replay: { actualNet: number; replayNet: number; removed: number } | null;
  overlaps: { key: FindingKey; title: string; shared: number }[];
  history: FindingHistory;
  text: string;
}

export interface ReviewVerdict {
  result: 'winning' | 'losing' | 'flat';
  /** clean: 80%+ of trades free of process breaks; mixed: 50-79%; poor: under 50% */
  process: 'clean' | 'mixed' | 'poor';
  net: number;
  netR: number | null;
  tradesWithR: number;
  cleanShare: number;
  stopShare: number;
  keptToStopShare: number | null;
  insideCapShare: number | null;
  selfInflictedShare: number | null;
  headline: string;
  text: string;
}

export interface LastFocus extends FocusCheck {
  rule: FocusRule;
  ruleText: string;
  startedAt: string;
  text: string;
}

export interface KeepDoing {
  key: FindingKey;
  title: string;
  /** over the baseline and the period */
  trades: number;
  periodTrades: number;
  winRate: number;
  avgR: number | null;
  avgRRange: { lo: number; hi: number } | null;
  label: SampleLabel;
  text: string;
}

export type DifferentMeasure = 'tradesPerDay' | 'riskPerTrade' | 'avgR' | 'winRate';
export interface DifferentItem {
  key: FindingKey;
  measure: DifferentMeasure;
  /** tradesPerDay: trades a trading day; riskPerTrade: median money at the stop; avgR: R; winRate: share */
  value: number;
  /** lowest and highest weekly value of the last 12 weeks (weeks with trades only) */
  normalLo: number;
  normalHi: number;
  weeks: number;
  direction: 'above' | 'below';
  text: string;
}

export interface NoteTheme {
  theme: string;
  side: 'winning' | 'losing' | 'both';
  /** the trader's own words, checked against the notes */
  quotes: { tradeId: string; quote: string }[];
}

export interface WatchItem {
  key: FindingKey;
  source: FindingSource;
  title: string;
  trades: number;
  wins: number;
  net: number;
  avgR: number | null;
  tradeIds: string[];
  evidenceTrades: number;
  label: SampleLabel;
  /** net positive although tagged a mistake or a broken rule: it paid, which is not evidence that it works */
  paidSoFar: boolean;
  overlaps: { key: FindingKey; title: string; shared: number }[];
  text: string;
}

export interface Review {
  version: 1;
  currency: string | null;
  timeZone: string;
  baseline: { from: string; to: string; trades: number };
  verdict: ReviewVerdict;
  /** null when nothing cost money */
  theOne: ReviewFinding | null;
  /** at most two */
  more: ReviewFinding[];
  /** present when a focus was active during the period */
  lastFocus?: LastFocus;
  keepDoing?: KeepDoing;
  different: DifferentItem[];
  /** present only when the trader has switched on Use my notes */
  fromNotes?: NoteTheme[];
  /** at most four */
  watch: WatchItem[];
  /** findings shown last week that have no trades this week */
  resolved: { key: FindingKey; title: string; lastWeekCount: number }[];
  /** keys marked not useful in the last 30 days, left out of this review */
  muted: FindingKey[];
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
  /** absent on reports made before the weekly review */
  review?: Review;
  currency?: string | null;
  timeZone?: string;
  /** the trader's Useful (true) / Not useful (false) answers by finding key */
  feedback?: Record<FindingKey, boolean>;
}

export interface GenerateInsightRequest {
  accountId?: string;
  /** with no account: only the accounts in this currency */
  currency?: string;
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

export interface InsightSettings {
  /** send the notes and key lessons of a report's trades to the model; off unless switched on */
  useNotes: boolean;
}

export interface InsightFeedbackRequest {
  id: string;
  key: FindingKey;
  useful: boolean;
}

export interface SetFocusRequest {
  rule: FocusRule;
  text?: string;
  findingKey?: string;
}
