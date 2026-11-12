import { tradeDayKey } from '@/lib/calendar';
import type { Trade } from '@/types/trade';

export type MissingKind = 'account' | 'strategy' | 'screenshot' | 'lesson';

export const MISSING_LABEL: Record<MissingKind, string> = { account: 'no account', strategy: 'no strategy', screenshot: 'no screenshot', lesson: 'losers with no key lesson' };

export interface DrillDown {
  /** Where the link came from; Trades offers a way back. */
  src: 'dashboard' | 'analytics' | null;
  missing?: MissingKind;
  /** `YYYY-MM-DD`, the day in the browser's zone. */
  on?: string;
  symbol?: string;
  strategy?: string;
  session?: string;
  direction?: 'LONG' | 'SHORT';
  assetClass?: string;
  /** English day name, UTC, as `/stats` reports it. */
  weekday?: string;
  /** 0-23, UTC hour of the entry. */
  hour?: number;
  mistake?: string;
  /** Rule ids; a trade matches when it broke any of them. */
  rules?: string[];
}

/** URL parameters this module owns, so a caller can strip them again. */
export const DRILL_KEYS = ['src', 'missing', 'on', 'symbol', 'strategy', 'session', 'direction', 'assetClass', 'weekday', 'hour', 'mistake', 'rule', 'broken'] as const;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** `null` when the URL carries no filter (`src` alone is not one). */
export function parseDrillDown(search: string): DrillDown | null {
  const q = new URLSearchParams(search);
  const get = (k: string) => q.get(k)?.trim() || undefined;
  const d: DrillDown = { src: q.get('src') === 'dashboard' ? 'dashboard' : q.get('src') === 'analytics' ? 'analytics' : null };
  const missing = get('missing');
  if (missing === 'account' || missing === 'strategy' || missing === 'screenshot' || missing === 'lesson') d.missing = missing;
  const on = get('on');
  if (on && /^\d{4}-\d{2}-\d{2}$/.test(on)) d.on = on;
  d.symbol = get('symbol');
  d.strategy = get('strategy');
  d.session = get('session');
  const direction = get('direction')?.toUpperCase();
  if (direction === 'LONG' || direction === 'SHORT') d.direction = direction;
  d.assetClass = get('assetClass');
  const weekday = get('weekday');
  if (weekday && WEEKDAYS.includes(weekday)) d.weekday = weekday;
  const hour = get('hour');
  if (hour !== undefined && /^\d{1,2}$/.test(hour) && Number(hour) < 24) d.hour = Number(hour);
  d.mistake = get('mistake');
  const rules = [...(get('broken')?.split(',') ?? []), ...(get('rule') ? [get('rule') as string] : [])].map((r) => r.trim()).filter(Boolean);
  if (rules.length) d.rules = rules;
  const { src, ...filters } = d;
  void src;
  return Object.values(filters).some((v) => v !== undefined) ? d : null;
}

export function drillMatch(t: Trade, d: DrillDown): boolean {
  if (d.missing) {
    const hit = d.missing === 'account' ? !t.accountId : d.missing === 'strategy' ? !(t.strategy || t.setup) : d.missing === 'screenshot' ? !t.images || t.images.length === 0 : t.pnl < 0 && !t.keyLesson;
    if (!hit) return false;
  }
  if (d.on && tradeDayKey(t) !== d.on) return false;
  if (d.symbol && t.symbol !== d.symbol) return false;
  if (d.strategy && (t.strategy ?? t.setup ?? '') !== d.strategy) return false;
  if (d.session && (t.session ?? '') !== d.session) return false;
  if (d.direction && t.direction !== d.direction) return false;
  if (d.assetClass && (t.assetClass ?? '') !== d.assetClass) return false;
  if (d.mistake && !(t.mistakes ?? []).includes(d.mistake)) return false;
  if (d.rules && !(t.brokenRuleIds ?? []).some((r) => d.rules?.includes(r))) return false;
  if (d.weekday !== undefined || d.hour !== undefined) {
    const entry = new Date(t.entryDate);
    if (Number.isNaN(entry.getTime())) return false;
    if (d.weekday !== undefined && WEEKDAYS[entry.getUTCDay()] !== d.weekday) return false;
    if (d.hour !== undefined && entry.getUTCHours() !== d.hour) return false;
  }
  return true;
}

/** `From Analytics: Strategy = Breakout`; several filters are joined with `·`. */
export function drillLabel(d: DrillDown, ruleName: (id: string) => string = () => 'Rule'): string {
  const parts: string[] = [];
  if (d.missing) parts.push(MISSING_LABEL[d.missing]);
  if (d.on) parts.push(`Day = ${d.on}`);
  if (d.symbol) parts.push(`Symbol = ${d.symbol}`);
  if (d.strategy) parts.push(`Strategy = ${d.strategy}`);
  if (d.session) parts.push(`Session = ${d.session}`);
  if (d.direction) parts.push(`Direction = ${d.direction === 'LONG' ? 'Long' : 'Short'}`);
  if (d.assetClass) parts.push(`Asset class = ${d.assetClass}`);
  if (d.weekday) parts.push(`Weekday = ${d.weekday}`);
  if (d.hour !== undefined) parts.push(`Hour = ${String(d.hour).padStart(2, '0')}:00 UTC`);
  if (d.mistake) parts.push(`Mistake = ${d.mistake}`);
  if (d.rules) parts.push(`Broken rule = ${[...new Set(d.rules.map(ruleName))].join(', ')}`);
  const origin = d.src === 'analytics' ? 'From Analytics: ' : d.src === 'dashboard' ? 'From Dashboard: ' : '';
  return origin + parts.join(' · ');
}

/** Where the way back leads. */
export const DRILL_ORIGIN_PATH = { dashboard: '/app/dashboard', analytics: '/app/analytics' } as const;
