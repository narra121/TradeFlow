import { format } from 'date-fns';
import { dayMetric, type CalendarMetric, type DayCell } from '@/lib/calendar';
import { formatCompactMoney, formatMoney, formatR } from '@/lib/format';
import { appTimeZone } from '@/lib/appTimeZone';
import { canonicalZone } from '@/components/settings/timeZones';

/** Compact only above 4 digits (D.3): under 1,000 a whole unit, so `+$64` and not `+$64.4`. */
export function compactMoney(value: number, currency?: string): string {
  return Math.abs(value) < 1000 ? formatMoney(value, currency, { sign: true, decimals: 0 }) : formatCompactMoney(value, { sign: true, currency });
}

/** The zone the calendar buckets and shows times in (the Settings preference, else this browser's), under its canonical IANA name. */
export function zoneName(): string {
  return canonicalZone(appTimeZone());
}
import { plural } from '@/components/calendar/dayText';

export const METRIC_LABEL: Record<CalendarMetric, string> = { pnl: 'Net P&L', r: 'R', trades: 'Trades', win: 'Win %' };

export function metricText(d: DayCell, metric: CalendarMetric): string | null {
  const v = dayMetric(d, metric);
  if (v === null) return null;
  switch (metric) {
    case 'pnl':
      return compactMoney(v, d.byCurrency[0]?.currency);
    case 'r':
      return formatR(v);
    case 'trades':
      return String(v);
    case 'win':
      return `${v.toFixed(0)}%`;
  }
}

/** The full-text name of a cell, so the tint, the amount and the marks all reach a screen reader. */
export function cellName(d: DayCell, hasNote: boolean): string {
  const day = format(d.date, 'EEEE d MMMM');
  if (!d.trades.length) return `${day}, no trades${hasNote ? ', has a note' : ''}`;
  const net = d.byCurrency.map((c) => formatMoney(c.net, c.currency, { sign: true })).join(' and ');
  return [
    day,
    net ? `net ${net}` : null,
    plural(d.trades.length, 'trade'),
    plural(d.wins, 'win'),
    d.ruleBreaks ? `${plural(d.ruleBreaks, 'trade')} with a broken rule` : null,
    hasNote ? 'has a note' : null,
  ].filter(Boolean).join(', ');
}
