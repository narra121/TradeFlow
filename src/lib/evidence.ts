import type { Range, SampleLabel, Verdict } from '@/types/analysis';
import { formatPercent, formatR } from '@/lib/format';

export type { SampleLabel, Verdict };

/**
 * Evidence rules of the research report §3.3 (CONTRACT I3), mirrored from JournalAWSSetup
 * src/features/analysis/evidence.ts: change both. Verdicts are computed by the server only.
 */
export const MIN_RANGE_TRADES = 20;
export const MIN_VERDICT_TRADES = 30;

export function sampleLabel(n: number): SampleLabel {
  if (n < 20) return 'too-few';
  if (n < 30) return 'early';
  if (n < 100) return 'provisional';
  return 'established';
}

export const SAMPLE_TEXT: Record<SampleLabel, string> = { 'too-few': 'too few to tell', early: 'early', provisional: 'provisional', established: 'established' };

/** Account-level label line (§3.3 rule 2). */
export const ACCOUNT_SAMPLE_TEXT: Record<SampleLabel, string> = {
  'too-few': 'Too few trades: numbers will move a lot',
  early: 'Early: numbers will move a lot',
  provisional: 'Provisional',
  established: 'Established',
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export interface Evidence {
  /** What the cell says: `Edge`, `Leak`, `Pattern to watch` or `Too early to tell`. */
  text: string;
  /** The line under it: the trades behind it, or how many more are needed. */
  detail: string;
  /** Only an edge or a leak may be coloured. */
  tone: 'edge' | 'leak' | 'neutral';
}

/**
 * The words for a judged segment or behaviour (§3.3 rule 3, §4.1 rule 3): edge or leak only when the server said so;
 * otherwise a pattern to watch with its count, or too early to tell and how many more trades a verdict needs.
 */
export function evidenceOf(verdict: Verdict, trades: number): Evidence {
  if (verdict === 'edge') return { text: 'Edge', detail: plural(trades, 'trade'), tone: 'edge' };
  if (verdict === 'leak') return { text: 'Leak', detail: plural(trades, 'trade'), tone: 'leak' };
  if (trades < MIN_VERDICT_TRADES) return { text: 'Too early to tell', detail: `${plural(trades, 'trade')}; ${MIN_VERDICT_TRADES - trades} more needed`, tone: 'neutral' };
  return { text: 'Pattern to watch', detail: plural(trades, 'trade'), tone: 'neutral' };
}

/** `pattern to watch (8 trades)` as one phrase, for lists. */
export function evidencePhrase(verdict: Verdict, trades: number): string {
  if (verdict === 'edge') return `edge (${plural(trades, 'trade')})`;
  if (verdict === 'leak') return `leak (${plural(trades, 'trade')})`;
  return trades < MIN_VERDICT_TRADES ? `too early to tell (${plural(trades, 'trade')})` : `pattern to watch (${plural(trades, 'trade')})`;
}

/** `39.1–67.1%` from fractions; empty without a range. */
export const rateRangeText = (r: Range | null | undefined): string => (r ? `${formatPercent(r.lo * 100)}–${formatPercent(r.hi * 100)}` : '');

/** `−0.22R to +0.66R`; empty without a range. */
export const rRangeText = (r: Range | null | undefined): string => (r ? `${formatR(r.lo)} to ${formatR(r.hi)}` : '');

/** Whether a 95% range lies wholly above or below zero. */
export const rangeExcludesZero = (r: Range | null | undefined): boolean => !!r && (r.lo > 0 || r.hi < 0);
