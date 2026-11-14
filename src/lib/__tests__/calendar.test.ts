import { afterEach, describe, expect, it } from 'vitest';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import { buildMonth, summarizeDays, dayMetric, defaultMetric, gridRange, isoWeek, metricScale, metricTint, monthKey, parseMetric, parseMonth, tintStep, tradeDayKey } from '../calendar';
import type { Trade, TradingAccount } from '@/types/trade';

const accounts = new Map(
  [
    { id: 'usd', currency: 'USD', name: 'U' },
    { id: 'inr', currency: 'INR', name: 'I' },
  ].map((a) => [a.id, a as TradingAccount]),
);

const t = (id: string, exit: string, pnl: number, accountId = 'usd'): Trade =>
  ({ id, symbol: 'X', direction: 'LONG', entryDate: exit, exitDate: exit, pnl, accountId, outcome: pnl >= 0 ? 'TP' : 'SL' }) as Trade;

describe('calendar model', () => {
  const nov = new Date(2026, 10, 1);

  it('starts the grid on Monday and covers the neighbouring days it shows', () => {
    expect(gridRange(nov)).toEqual({ startDate: '2026-10-26', endDate: '2026-12-06' });
    const m = buildMonth([], nov, accounts);
    expect(m.weeks[0].days[0].key).toBe('2026-10-26');
    expect(m.weeks).toHaveLength(6);
  });

  it('buckets trades by local open day and sums per currency', () => {
    const m = buildMonth([t('1', '2026-11-04T10:00:00', 100), t('2', '2026-11-04T15:00:00', -40), t('3', '2026-11-05T10:00:00', -10)], nov, accounts);
    const day = m.weeks.flatMap((w) => w.days).find((d) => d.key === '2026-11-04')!;
    expect(day.trades).toHaveLength(2);
    expect(day.wins).toBe(1);
    expect(day.losses).toBe(1);
    expect(day.byCurrency).toEqual([{ currency: 'USD', net: 60 }]);
    expect(m.tradingDays).toBe(2);
    expect(m.greenDays).toBe(1);
    expect(m.redDays).toBe(1);
    expect(m.best).toEqual({ key: '2026-11-04', net: 60 });
    expect(m.worst).toEqual({ key: '2026-11-05', net: -10 });
  });

  it('keeps currencies apart and does not name a best day in a mixed scope', () => {
    const m = buildMonth([t('1', '2026-11-04T10:00:00', 100), t('2', '2026-11-06T10:00:00', 5000, 'inr')], nov, accounts);
    expect(m.mixed).toBe(true);
    expect(m.byCurrency).toEqual([{ currency: 'USD', net: 100 }, { currency: 'INR', net: 5000 }]);
    expect(m.best).toBeNull();
  });

  it('computes week totals', () => {
    const m = buildMonth([t('1', '2026-11-02T10:00:00', 10), t('2', '2026-11-08T10:00:00', 5)], nov, accounts);
    const week = m.weeks.find((w) => w.days.some((d) => d.key === '2026-11-02'))!;
    expect(week.count).toBe(2);
    expect(week.byCurrency).toEqual([{ currency: 'USD', net: 15 }]);
  });

  it('puts a late-evening local trade on its own day', () => {
    expect(tradeDayKey(t('1', '2026-11-04T23:30:00', 1))).toBe('2026-11-04');
  });

  it('files an overnight trade under the day it opened, as GET /trades and the day statistics do', () => {
    const overnight = { ...t('1', '2026-11-05T01:00:00', 1), entryDate: '2026-11-04T22:00:00' };
    expect(tradeDayKey(overnight)).toBe('2026-11-04');
    const days = buildMonth([overnight], nov, accounts).weeks.flatMap((w) => w.days);
    expect(days.find((d) => d.trades.length)?.key).toBe('2026-11-04');
  });

  it('a date-only open date is its own day', () => {
    expect(tradeDayKey({ ...t('1', '2026-11-05T01:00:00', 1), entryDate: '2026-11-04' })).toBe('2026-11-04');
  });

  describe('with a saved time zone (the zone /stats buckets by)', () => {
    afterEach(() => {
      localStorage.clear();
      resetUiStateCache();
    });

    it('a trade opened at 2026-11-03T20:30Z is on the 3rd in New York and the 4th in Kolkata', () => {
      const trade = t('1', '2026-11-03T20:30:00.000Z', 1);
      patchUiState({ timeZone: 'America/New_York' });
      expect(tradeDayKey(trade)).toBe('2026-11-03');
      patchUiState({ timeZone: 'Asia/Kolkata' });
      expect(tradeDayKey(trade)).toBe('2026-11-04');
    });

    it('the month grid puts the trade in the cell of the saved zone', () => {
      const trade = t('1', '2026-11-03T20:30:00.000Z', 5);
      const cellOf = (zone: string) => {
        patchUiState({ timeZone: zone });
        return buildMonth([trade], new Date(2026, 10, 1), accounts).weeks.flatMap((w) => w.days).find((d) => d.trades.length)?.key;
      };
      expect(cellOf('America/New_York')).toBe('2026-11-03');
      expect(cellOf('Asia/Kolkata')).toBe('2026-11-04');
    });
  });
});

describe('month helpers', () => {
  it('parses and formats the month parameter', () => {
    expect(monthKey(new Date(2026, 10, 15))).toBe('2026-11');
    expect(parseMonth('2026-02').getMonth()).toBe(1);
    expect(parseMonth('garbage', new Date(2026, 5, 9)).getMonth()).toBe(5);
    expect(parseMonth('2026-13', new Date(2026, 5, 9)).getMonth()).toBe(5);
  });

  it('tints in three steps relative to the biggest day', () => {
    expect(tintStep(0, 100)).toBe(0);
    expect(tintStep(10, 100)).toBe(1);
    expect(tintStep(-50, 100)).toBe(2);
    expect(tintStep(100, 100)).toBe(3);
  });
});

describe('calendar metrics', () => {
  const nov = new Date(2026, 10, 1);
  const withRules = (id: string, exit: string, pnl: number, over: Partial<Trade> = {}): Trade =>
    ({ ...t(id, exit, pnl), entryPrice: 100, exitPrice: pnl > 0 ? 102 : 99, stopLoss: 99, direction: 'LONG', ...over }) as Trade;
  const dayOf = (m: ReturnType<typeof buildMonth>, key: string) => m.weeks.flatMap((w) => w.days).find((d) => d.key === key)!;

  it('counts trades that carry a broken rule and sums R over trades with a stop', () => {
    const m = buildMonth(
      [withRules('1', '2026-11-04T10:00:00', 100, { brokenRuleIds: ['r1'] }), withRules('2', '2026-11-04T12:00:00', -40, { stopLoss: 0 })],
      nov,
      accounts,
    );
    const day = dayOf(m, '2026-11-04');
    expect(day.ruleBreaks).toBe(1);
    expect(day.sumR).toBe(2);
    expect(m.tradeCount).toBe(2);
  });

  it('has no R for a day without any stop loss', () => {
    const m = buildMonth([withRules('1', '2026-11-04T10:00:00', 100, { stopLoss: 0 })], nov, accounts);
    expect(dayOf(m, '2026-11-04').sumR).toBeNull();
    expect(dayMetric(dayOf(m, '2026-11-04'), 'r')).toBeNull();
  });

  it('reads each metric of a day and leaves a mixed-currency day without a money figure', () => {
    const m = buildMonth([t('1', '2026-11-04T10:00:00', 100), t('2', '2026-11-04T12:00:00', -40), t('3', '2026-11-04T13:00:00', 5000, 'inr')], nov, accounts);
    const d = dayOf(m, '2026-11-04');
    expect(dayMetric(d, 'pnl')).toBeNull();
    expect(dayMetric(d, 'trades')).toBe(3);
    expect(dayMetric(d, 'win')).toBe(66.7);
  });

  it('defaults to R in a scope that mixes currencies', () => {
    expect(defaultMetric(true)).toBe('r');
    expect(defaultMetric(false)).toBe('pnl');
    expect(parseMetric('win', true)).toBe('win');
    expect(parseMetric('bogus', true)).toBe('r');
    expect(parseMetric(null, false)).toBe('pnl');
  });

  it('tints results by sign, counts in one hue and win rate around 50', () => {
    expect(metricTint(50, 'pnl', 100)).toEqual({ tone: 'profit', step: 2 });
    expect(metricTint(-100, 'pnl', 100)).toEqual({ tone: 'loss', step: 3 });
    expect(metricTint(null, 'pnl', 100)).toEqual({ tone: 'neutral', step: 0 });
    expect(metricTint(4, 'trades', 4)).toEqual({ tone: 'neutral', step: 3 });
    expect(metricTint(80, 'win', 0)).toEqual({ tone: 'profit', step: 2 });
    expect(metricTint(10, 'win', 0)).toEqual({ tone: 'loss', step: 3 });
    expect(metricTint(50, 'win', 0)).toEqual({ tone: 'neutral', step: 0 });
  });

  it('scales the tint to the largest day of the month only', () => {
    const m = buildMonth([t('1', '2026-11-04T10:00:00', 100), t('2', '2026-11-05T10:00:00', -250), t('3', '2026-10-30T10:00:00', 9999)], nov, accounts);
    expect(metricScale(m, 'pnl')).toBe(250);
  });

  it('numbers weeks the ISO way', () => {
    expect(isoWeek(new Date(2026, 10, 2))).toBe(45);
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
    expect(isoWeek(new Date(2024, 11, 30))).toBe(1);
  });
});

describe('summarizeDays', () => {
  const nov = new Date(2026, 10, 1);
  it('summarises any set of days, so a week gets its own figures', () => {
    const m = buildMonth([t('1', '2026-11-02T10:00:00', -48), t('2', '2026-11-04T10:00:00', 64), t('3', '2026-11-12T10:00:00', 5)], nov, accounts);
    const week = m.weeks.find((w) => w.days.some((d) => d.key === '2026-11-02'))!;
    const s = summarizeDays(week.days);
    expect(s).toMatchObject({ tradingDays: 2, greenDays: 1, redDays: 1, tradeCount: 2, mixed: false });
    expect(s.byCurrency).toEqual([{ currency: 'USD', net: 16 }]);
    expect(s.best?.key).toBe('2026-11-04');
    expect(m.tradingDays).toBe(3);
  });
  it('counts the trading days that have no R', () => {
    const m = buildMonth([{ ...t('1', '2026-11-02T10:00:00', 5), stopLoss: 0 } as Trade], nov, accounts);
    expect(m.withoutR).toBe(1);
  });
});
