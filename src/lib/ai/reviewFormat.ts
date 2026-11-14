import { MIN_VERDICT_TRADES, plural } from '@/lib/evidence';
import { formatMoney, formatPercent, parseLocalDate } from '@/lib/format';
import type { DifferentItem, FindingHistory, NoteTheme, Review, ReviewVerdict } from '@/types/insights';

const DAY = 86_400_000;

/** History is recorded for 7-day periods only, so week wording applies to those. */
export function isWeekPeriod(from: string, to: string): boolean {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / DAY) + 1 === 7;
}

const ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
const ordinal = (n: number) => ORDINALS[n] ?? `${n}th`;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `Third week in a row · down from 7 trades last week`, `New this week`; null outside a weekly review. */
export function historyText(h: FindingHistory | undefined, isWeek: boolean): string | null {
  if (!h || !isWeek) return null;
  const parts: string[] = [];
  if (h.weeksInRow >= 2) parts.push(`${ordinal(h.weeksInRow)} week in a row`);
  else if (h.status === 'new') parts.push('new this week');
  if (h.lastWeekCount !== null) {
    if (h.status === 'down') parts.push(`down from ${plural(h.lastWeekCount, 'trade')} last week`);
    else if (h.status === 'up') parts.push(`up from ${plural(h.lastWeekCount, 'trade')} last week`);
    else if (h.status === 'same') parts.push(`as many trades as last week (${h.lastWeekCount})`);
  }
  return parts.length ? capital(parts.join(' · ')) : null;
}

/** What a pattern to watch needs before it can be judged (the evidence rule needs 30 trades on each side). */
export function checkAgainText(evidenceTrades: number): string {
  const more = MIN_VERDICT_TRADES - evidenceTrades;
  return more > 0 ? `Check again after ${plural(more, 'more trade')}` : `No clear difference after ${plural(evidenceTrades, 'trade')}`;
}

/** R with zero shown as 0.00R: in a review an R of 0 is a real breakeven, not a missing stop. */
export function rText(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  const r = Number(v.toFixed(2));
  return r === 0 ? '0.00R' : `${r < 0 ? '−' : '+'}${Math.abs(r).toFixed(2)}R`;
}

export const pct = (share: number | null | undefined, decimals = 0) => (typeof share === 'number' ? formatPercent(share * 100, decimals) : '—');

export const RESULT_WORD: Record<ReviewVerdict['result'], string> = { winning: 'Winning', losing: 'Losing', flat: 'Flat' };
export const PROCESS_WORD: Record<ReviewVerdict['process'], string> = { clean: 'Followed', mixed: 'Partly followed', poor: 'Often broken' };

/** The facts behind the process half of the verdict, as short phrases. */
export function processFacts(v: ReviewVerdict, tradeCount: number): string[] {
  const out = [`${Math.round(v.cleanShare * tradeCount)} of ${plural(tradeCount, 'trade')} without a process break`, `stop set on ${pct(v.stopShare)}`];
  if (v.keptToStopShare !== null) out.push(`losses kept to the stop: ${pct(v.keptToStopShare)}`);
  if (v.insideCapShare !== null) out.push(`inside your daily cap: ${pct(v.insideCapShare)}`);
  return out;
}

export const MEASURE_LABEL: Record<DifferentItem['measure'], string> = {
  tradesPerDay: 'Trades per trading day',
  riskPerTrade: 'Money at risk per trade',
  avgR: 'Average R',
  winRate: 'Win rate',
};

export function measureValue(measure: DifferentItem['measure'], v: number, currency: string | null | undefined): string {
  if (measure === 'tradesPerDay') return v.toFixed(1);
  if (measure === 'riskPerTrade') return formatMoney(v, currency ?? undefined);
  if (measure === 'avgR') return rText(v);
  return pct(v, 1);
}

export const NOTE_SIDE: Record<NoteTheme['side'], string> = { losing: 'In losing trades', winning: 'In winning trades', both: 'In winning and losing trades' };

/** Plain-text lines of a weekly review, for Copy summary. */
export function reviewAsLines(r: Review): string[] {
  const money = (v: number) => formatMoney(v, r.currency ?? undefined);
  const lines = [`Verdict: ${r.verdict.headline}`, r.verdict.text, ''];
  for (const [i, f] of [r.theOne, ...r.more].entries()) {
    if (!f) continue;
    lines.push(`${i === 0 ? 'The one thing' : 'Also costly'}: ${f.title} (${plural(f.trades, 'trade')}, cost ${money(f.cost)})`, f.text, `Rule: ${f.ruleText}`, '');
  }
  if (r.lastFocus) lines.push(`Focus: ${r.lastFocus.ruleText}`, r.lastFocus.text, '');
  if (r.keepDoing) lines.push(`Keep doing: ${r.keepDoing.title}`, r.keepDoing.text, '');
  for (const d of r.different) lines.push(`Different from your normal: ${d.text}`);
  if (r.different.length) lines.push('');
  for (const n of r.fromNotes ?? []) lines.push(`From your notes: ${n.theme}`, ...n.quotes.map((q) => `  "${q.quote}"`));
  if (r.fromNotes?.length) lines.push('');
  for (const w of r.watch) lines.push(`Pattern to watch: ${w.text}`);
  if (r.watch.length) lines.push('');
  return lines;
}
