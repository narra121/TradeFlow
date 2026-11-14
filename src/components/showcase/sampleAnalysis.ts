import { SAMPLE_BROKEN_RULES, SAMPLE_TRADES } from './sampleJournal';

/**
 * The Analytics and Insights figures of the sample month, computed from SAMPLE_TRADES with the product's own rules
 * (JournalAWSSetup src/features/analysis/{evidence,analysis,detectors,whatif}.ts, focus/rules.ts and insights/review.ts).
 * A change to a rule there must be repeated here, or the public pictures stop matching the app.
 */

export interface Range {
  lo: number;
  hi: number;
}

export interface SampleFact {
  day: number;
  symbol: string;
  pnl: number;
  r: number;
  /** Minutes after midnight. */
  open: number;
  close: number;
  /** The latest trade of the same day that had closed when this one opened. */
  prev: { pnl: number; minutesSinceClose: number } | null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const r4 = (n: number) => Math.round(n * 10_000) / 10_000;
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const net = (fs: SampleFact[]) => round2(fs.reduce((s, f) => s + f.pnl, 0));
const avgR = (fs: SampleFact[]) => (fs.length ? r4(mean(fs.map((f) => f.r))) : null);
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export const SAMPLE_FACTS: SampleFact[] = SAMPLE_TRADES.map((t, i, all) => {
  const close = minutes(t.closed);
  const open = close - t.mins;
  const before = all.slice(0, i).filter((p) => p.day === t.day && minutes(p.closed) <= open).at(-1);
  return { day: t.day, symbol: t.symbol, pnl: t.pnl, r: t.r, open, close, prev: before ? { pnl: before.pnl, minutesSinceClose: open - minutes(before.closed) } : null };
});

const Z95 = 1.959963984540054;
export const MIN_RANGE_TRADES = 20;
export const MIN_VERDICT_TRADES = 30;
export const REENTRY_MINUTES = 15;
const BEYOND_STOP_R = -1.05;

/** Wilson score interval (95%) of k wins in n trades. */
export function wilson(k: number, n: number): Range {
  const p = k / n;
  const z2 = Z95 * Z95;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (Z95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

/** Percentile bootstrap (95%) of the mean: 2,000 resamples from the product's seeded generator (mulberry32, seed 20261113). */
export function bootstrapMean(xs: number[]): Range {
  let a = 20261113 >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const iterations = 2000;
  const means = new Float64Array(iterations);
  for (let i = 0; i < iterations; i++) {
    let s = 0;
    for (let j = 0; j < xs.length; j++) s += xs[Math.floor(rand() * xs.length)];
    means[i] = s / xs.length;
  }
  means.sort();
  return { lo: r4(means[Math.floor(0.025 * iterations)]), hi: r4(means[Math.floor(0.975 * iterations)]) };
}

export type SampleLabel = 'too-few' | 'early' | 'provisional' | 'established';
export const sampleLabel = (n: number): SampleLabel => (n < 20 ? 'too-few' : n < 30 ? 'early' : n < 100 ? 'provisional' : 'established');
/** The app's words for a sample (TradeFlow src/lib/evidence.ts ACCOUNT_SAMPLE_TEXT). */
export const SAMPLE_LABEL_TEXT: Record<SampleLabel, string> = {
  'too-few': 'Too few trades: numbers will move a lot',
  early: 'Early: numbers will move a lot',
  provisional: 'Provisional',
  established: 'Established',
};

export interface SampleEdge {
  trades: number;
  label: SampleLabel;
  /** Fractions, 0–1. */
  winRate: number;
  winRateRange: Range;
  payoff: number;
  breakEvenWinRate: number;
  expectancyR: number;
  expectancyRRange: Range;
  /** Trades it would take for the range to leave zero at this spread; null when it already has. */
  tradesNeeded: number | null;
}

/** Overview › "Do I have an edge?" for the sample month. */
export function sampleEdge(facts: SampleFact[] = SAMPLE_FACTS): SampleEdge {
  const wins = facts.filter((f) => f.pnl > 0);
  const losses = facts.filter((f) => f.pnl < 0);
  const payoff = mean(wins.map((f) => f.pnl)) / mean(losses.map((f) => -f.pnl));
  const rs = facts.map((f) => f.r);
  const m = mean(rs);
  const range = bootstrapMean(rs);
  const sd = Math.sqrt(rs.reduce((s, x) => s + (x - m) ** 2, 0) / (rs.length - 1));
  const proven = range.lo > 0 || range.hi < 0;
  return {
    trades: facts.length,
    label: sampleLabel(facts.length),
    winRate: wins.length / facts.length,
    winRateRange: wilson(wins.length, facts.length),
    payoff: r4(payoff),
    breakEvenWinRate: r4((wins.length + losses.length) / facts.length / (1 + payoff)),
    expectancyR: r4(m),
    expectancyRRange: range,
    tradesNeeded: proven ? null : Math.max(Math.ceil(((Z95 * sd) / m) ** 2), MIN_RANGE_TRADES, rs.length + 1),
  };
}

export interface SampleBehaviour {
  id: 'brokenRule' | 'beyondStop' | 'reentryAfterLoss' | 'afterLoss';
  title: string;
  trades: number;
  net: number;
  avgR: number | null;
  /** Average R of the comparison group. */
  normalAvgR: number | null;
}

const isReentry = (f: SampleFact) => !!f.prev && f.prev.pnl < 0 && f.prev.minutesSinceClose <= REENTRY_MINUTES;
const isAfterLoss = (f: SampleFact) => !!f.prev && f.prev.pnl < 0;
const brokeRule = (f: SampleFact) => SAMPLE_BROKEN_RULES.some((b) => b.day === f.day);
/** The part of a loss below −1R: |loss| × (1 − 1 ÷ |R|); 0 within the stop. */
const beyondStop = (f: SampleFact) => (f.r < BEYOND_STOP_R && f.pnl < 0 ? Math.abs(f.pnl) * (1 - 1 / Math.abs(f.r)) : 0);

/** Behaviour › the detector rows seen in the sample month, costliest first as the board sorts them on Pro. */
export function sampleBehaviours(facts: SampleFact[] = SAMPLE_FACTS): SampleBehaviour[] {
  const row = (id: SampleBehaviour['id'], title: string, hit: (f: SampleFact) => boolean, normal?: (f: SampleFact) => boolean): SampleBehaviour => {
    const members = facts.filter(hit);
    return { id, title, trades: members.length, net: net(members), avgR: avgR(members), normalAvgR: avgR(facts.filter(normal ?? ((f) => !hit(f)))) };
  };
  return [
    row('brokenRule', 'Broken rules', brokeRule),
    row('beyondStop', 'Losses beyond the stop', (f) => f.r < BEYOND_STOP_R),
    row('reentryAfterLoss', 'Re-entry after a loss', isReentry),
    row('afterLoss', 'Next trade after a loss', isAfterLoss, (f) => !!f.prev && f.prev.pnl > 0),
  ].sort((a, b) => a.net - b.net);
}

/** Money lost past the stop in the month, and how many losing trades went past it. */
export function sampleBeyondStop(facts: SampleFact[] = SAMPLE_FACTS) {
  return { trades: facts.filter((f) => beyondStop(f) > 0).length, losingTrades: facts.filter((f) => f.pnl < 0).length, amount: round2(facts.reduce((s, f) => s + beyondStop(f), 0)) };
}

/** Behaviour › what-if replay of "stop for the day after n losing trades": only trades the rule still let through count. */
export function sampleReplay(n: number, facts: SampleFact[] = SAMPLE_FACTS) {
  const kept: SampleFact[] = [];
  for (const f of facts) {
    const lossesKnown = kept.filter((g) => g.day === f.day && g.close <= f.open && g.pnl < 0).length;
    if (lossesKnown < n) kept.push(f);
  }
  return { actualNet: net(facts), replayNet: net(kept), removed: facts.length - kept.length, trades: facts.length };
}

export interface SequenceRow {
  group: string;
  trades: number;
  wins: number;
  net: number;
  avgR: number | null;
}

/** Chat › the `sequence` calculation behind "How do I perform after a losing trade?" (after a loss, same day). */
export function sampleSequence(facts: SampleFact[] = SAMPLE_FACTS): { rows: SequenceRow[]; label: SampleLabel } {
  const row = (group: string, fs: SampleFact[]): SequenceRow => ({ group, trades: fs.length, wins: fs.filter((f) => f.pnl > 0).length, net: net(fs), avgR: avgR(fs) });
  const members = facts.filter(isAfterLoss);
  return { rows: [row('After a loss the same day', members), row('All other trades', facts.filter((f) => !isAfterLoss(f)))], label: sampleLabel(members.length) };
}

export interface SampleReviewWeek {
  from: number;
  to: number;
  trades: number;
  net: number;
  /** One of the review's fixed verdict sentences. */
  headline: string;
  theOne: { title: string; trades: number; cost: number; ownRule: boolean };
}

/** The if-then sentence the review offers for re-entry after a loss (focus/rules.ts, `pauseAfterLoss`). */
export const SAMPLE_FOCUS_TEXT = `If a trade closes at a loss, I wait ${REENTRY_MINUTES} minutes before the next entry.`;

function reviewWeek(from: number, to: number): SampleReviewWeek {
  const week = SAMPLE_FACTS.filter((f) => f.day >= from && f.day <= to);
  const lost = (fs: SampleFact[]) => Math.max(0, -net(fs));
  const reentries = week.filter(isReentry);
  const candidates = [
    { title: 'Re-entry after a loss', members: reentries, ownRule: false, cost: lost(reentries) },
    { title: 'Losses beyond the stop', members: week.filter((f) => beyondStop(f) > 0), ownRule: false, cost: round2(week.reduce((s, f) => s + beyondStop(f), 0)) },
    ...SAMPLE_BROKEN_RULES.map((b) => {
      const members = week.filter((f) => f.day === b.day);
      return { title: `Broke "${b.rule}"`, members, ownRule: true, cost: lost(members) };
    }),
  ];
  const top = candidates.reduce((best, c) => (c.cost > best.cost ? c : best));
  const total = net(week);
  const clean = (week.length - new Set(candidates.flatMap((c) => c.members)).size) / week.length >= 0.8;
  const best = Math.max(...week.map((f) => f.pnl));
  const headline = total <= 0 ? 'A losing week.' : best >= total ? 'A winning week, but one trade made it.' : clean ? 'A winning week, played well.' : 'A winning week, with process breaks.';
  return { from, to, trades: week.length, net: total, headline, theOne: { title: top.title, trades: top.members.length, cost: top.cost, ownRule: top.ownRule } };
}

/**
 * Insights › two weekly reviews in a row. The first names its costliest behaviour; adopted as the focus rule on the
 * Monday after, the second counts how often it was kept and what the breaks cost.
 */
export function sampleReview() {
  const first = reviewWeek(2, 6);
  const second = reviewWeek(9, 13);
  const checked = SAMPLE_FACTS.filter((f) => f.day >= second.from && f.day <= second.to);
  const breaks = checked.filter(isReentry);
  return { first, second, focus: { text: SAMPLE_FOCUS_TEXT, checked: checked.length, kept: checked.length - breaks.length, broken: breaks.length, cost: Math.max(0, -net(breaks)) } };
}
