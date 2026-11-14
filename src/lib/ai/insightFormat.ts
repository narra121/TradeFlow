import { formatDateShort, parseLocalDate } from '@/lib/format';
import type { Insight, InsightSection } from '@/types/insights';
import { reviewAsLines } from './reviewFormat';

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

/** `October 2026`, `2026`, `1 Oct – 31 Oct 2026`, or `All time` for the open-ended "All time" period. */
export function periodLabel(from: string, to: string): string {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${from} – ${to}`;
  if (a.getFullYear() <= 2001) return 'All time';
  const lastOfMonth = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === 1 && b.getDate() === lastOfMonth) return MONTH.format(a);
  if (a.getMonth() === 0 && a.getDate() === 1 && b.getMonth() === 11 && b.getDate() === 31 && a.getFullYear() === b.getFullYear()) return String(a.getFullYear());
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  const range = `${formatDateShort(from)} – ${formatDateShort(to, true)}`;
  return days === 7 ? `Week of ${formatDateShort(from)}` : range;
}

export const KIND_LABEL: Record<InsightSection['kind'], string> = {
  leak: 'Leak',
  strength: 'Strength',
  pattern: 'Pattern',
  action: 'Action',
};

/** Money impact first (largest absolute currency figure), findings without one after them, actions last. */
export function orderSections(sections: InsightSection[]): InsightSection[] {
  const impact = (s: InsightSection) => (s.metric && s.metric.unit === 'currency' && s.metric.value !== null ? Math.abs(s.metric.value) : -1);
  const indexed = sections.map((s, i) => ({ s, i }));
  const rank = (s: InsightSection) => (s.kind === 'action' ? 1 : 0);
  return indexed.sort((x, y) => rank(x.s) - rank(y.s) || impact(y.s) - impact(x.s) || x.i - y.i).map((x) => x.s);
}

/** The rule wording offered by `Make this a rule`: the finding's title, phrased as something to avoid or keep doing. */
export function ruleTextFrom(section: InsightSection): string {
  const t = section.title.trim().replace(/[.]+$/, '');
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  return section.kind === 'strength' ? `Keep doing this: ${lower}` : `Avoid this: ${lower}`;
}

/** Plain-text copy of a report for `Copy summary`. */
export function reportAsText(insight: Insight, title: string): string {
  const lines = [title, `${insight.tradeCount} trades · generated ${formatDateShort(insight.createdAt, true)}`, '', trueMinus(insight.summary), ''];
  if (insight.review) lines.push(...reviewAsLines(insight.review).map(trueMinus));
  else {
    for (const s of orderSections(insight.sections)) {
      lines.push(`${KIND_LABEL[s.kind]}: ${s.title}${s.metric ? ` (${s.metric.label}: ${trueMinus(s.metric.display)})` : ''}`, trueMinus(s.body), '');
    }
  }
  lines.push('Based on your journal data. Not investment advice.');
  return lines.join('\n');
}

/** Count from the API's NOT_ENOUGH_TRADES message (`… this period has 3.`), when present. */
export function tradesInMessage(message: string | undefined): number | null {
  const m = /has (\d+)\b/.exec(message ?? '');
  return m ? Number(m[1]) : null;
}

/** The model and the API print negatives with a hyphen; a minus sign in front of a figure is the true minus (D.3). */
export function trueMinus(text: string): string {
  return text.replace(/(^|[\s(:])-(?=\d)/g, '$1−');
}

/** Several currencies are in scope: no account chosen and the accounts do not share one currency. */
export function isMixedCurrency(accounts: { currency?: string }[], accountId: string | null): boolean {
  return !accountId && new Set(accounts.map((a) => a.currency).filter(Boolean)).size > 1;
}

/** The API accepts a report period of at most 366 days. */
export const MAX_REPORT_DAYS = 366;

export interface ReportRange {
  from: string;
  to: string;
  /** the scope was longer than the API allows, so only its last 366 days are sent */
  clamped: boolean;
}

const DAY = 86_400_000;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The period sent to POST /insights/generate for the scope in the bar: `All time` ends today; anything above 366 days keeps its last 366. */
export function reportRange(preset: string | number, startDate: string, endDate: string, today: Date = new Date()): ReportRange {
  const to = preset === 'all' ? iso(today) : endDate;
  const from = preset === 'all' ? '2000-01-01' : startDate;
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  const days = Math.round((b.getTime() - a.getTime()) / DAY) + 1;
  if (Number.isNaN(days) || days <= MAX_REPORT_DAYS) return { from, to, clamped: false };
  return { from: iso(new Date(b.getFullYear(), b.getMonth(), b.getDate() - (MAX_REPORT_DAYS - 1))), to, clamped: true };
}

/** `the last 12 months` for a period ending today, else `the 12 months to 31 Oct 2026`. */
export function clampedLabel(to: string, today: Date = new Date()): string {
  return to === iso(today) ? 'the last 12 months' : `the 12 months to ${formatDateShort(to, true)}`;
}
