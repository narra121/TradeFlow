import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { historyGlyph, isCurrentPeriod, isPastPeriod, periodLabel, periodOf, previousPeriods, shiftPeriod, streakOf, streakText, trackStatus, tradingDays, validateTarget, type PeriodRef } from '../goalMath';

describe('goal periods', () => {
  it('derives the backend key and range from one date', () => {
    const w = periodOf('weekly', new Date(2026, 10, 11));
    expect(w.key).toBe('week#2026-11-09');
    expect([w.startDate, w.endDate]).toEqual(['2026-11-09', '2026-11-15']);
    const m = periodOf('monthly', new Date(2026, 10, 11));
    expect(m.key).toBe('month#2026-11');
    expect([m.startDate, m.endDate]).toEqual(['2026-11-01', '2026-11-30']);
  });

  it('steps by whole periods and lists the eight before, oldest first', () => {
    const w = periodOf('weekly', new Date(2026, 10, 11));
    expect(shiftPeriod(w, -1).key).toBe('week#2026-11-02');
    const prev = previousPeriods(w);
    expect(prev).toHaveLength(8);
    expect(prev[0].key).toBe('week#2026-09-14');
    expect(prev[7].key).toBe('week#2026-11-02');
    expect(previousPeriods(periodOf('monthly', new Date(2026, 0, 5)))[0].key).toBe('month#2025-05');
  });

  it('knows the current and past period', () => {
    const now = new Date(2026, 10, 11);
    expect(isCurrentPeriod(periodOf('weekly', new Date(2026, 10, 9)), now)).toBe(true);
    expect(isCurrentPeriod(periodOf('weekly', new Date(2026, 10, 2)), now)).toBe(false);
    expect(isPastPeriod(periodOf('weekly', new Date(2026, 10, 2)), now)).toBe(true);
    expect(isPastPeriod(periodOf('monthly', now), now)).toBe(false);
  });

  it('labels a week across months and a month', () => {
    expect(periodLabel(periodOf('weekly', new Date(2026, 10, 11)))).toBe('9 – 15 Nov 2026');
    expect(periodLabel(periodOf('weekly', new Date(2026, 9, 28)))).toBe('26 Oct – 1 Nov 2026');
    expect(periodLabel(periodOf('monthly', new Date(2026, 10, 11)))).toBe('November 2026');
  });
});

describe('trading days', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('counts Monday to Friday, today included in what has elapsed', () => {
    expect(tradingDays(periodOf('weekly', new Date()))).toEqual({ total: 5, elapsed: 3, left: 2 });
    expect(tradingDays(periodOf('monthly', new Date()))).toEqual({ total: 21, elapsed: 8, left: 13 });
  });
});

describe('track status', () => {
  const week: PeriodRef = periodOf('weekly', new Date(2026, 10, 11));
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 12));
  });
  afterEach(() => vi.useRealTimers());
  const base = { currency: 'USD', tradeCount: 4, period: week, live: true };

  it('profit: on pace, behind, met, missed', () => {
    expect(trackStatus({ ...base, type: 'profit', current: 380, target: 500 })).toMatchObject({ text: 'On pace · $120.00 to go', tone: 'good', pace: 0.6, met: false });
    expect(trackStatus({ ...base, type: 'profit', current: 100, target: 500 })).toMatchObject({ text: 'Behind by $200.00', tone: 'warn' });
    expect(trackStatus({ ...base, type: 'profit', current: 500, target: 500 })).toMatchObject({ text: 'Target met', met: true, fill: 1 });
    expect(trackStatus({ ...base, type: 'profit', current: -20, target: 500, live: false })).toMatchObject({ text: 'Missed by $520.00', tone: 'bad', fill: 0 });
  });

  it('profit: no pace verdict before the first trade of the period', () => {
    expect(trackStatus({ ...base, type: 'profit', current: 0, target: 500, tradeCount: 0 })).toMatchObject({ text: 'No trades yet', tone: 'neutral', fill: 0 });
  });

  it('win rate: below target in points, met, and no trades', () => {
    expect(trackStatus({ ...base, type: 'winRate', current: 58.3, target: 65 })).toMatchObject({ text: 'Below target by 6.7 pts' });
    expect(trackStatus({ ...base, type: 'winRate', current: 70, target: 65 })).toMatchObject({ text: 'Target met' });
    expect(trackStatus({ ...base, type: 'winRate', current: 0, target: 65, tradeCount: 0 })).toMatchObject({ text: 'No trades yet', tone: 'neutral' });
  });

  it('limits: within, near at 80 %, exceeded', () => {
    expect(trackStatus({ ...base, type: 'maxTrades', current: 5, target: 8 })).toMatchObject({ text: 'Within limit · 3 left', tick: 0.8 });
    expect(trackStatus({ ...base, type: 'maxTrades', current: 7, target: 8 })).toMatchObject({ text: 'Near the limit · 1 left', tone: 'warn' });
    expect(trackStatus({ ...base, type: 'maxTrades', current: 10, target: 8 })).toMatchObject({ text: 'Limit exceeded by 2', tone: 'bad' });
    expect(trackStatus({ ...base, type: 'maxDrawdown', current: 1.2, target: 3 })).toMatchObject({ text: 'Within limit' });
    expect(trackStatus({ ...base, type: 'maxDrawdown', current: 3.5, target: 3 })).toMatchObject({ text: 'Limit exceeded by 0.5 pts' });
  });
});

describe('history', () => {
  it('judges only periods with trades and a goal of the user’s own', () => {
    expect(historyGlyph('profit', { current: 600, target: 500, tradeCount: 3 })).toBe('met');
    expect(historyGlyph('profit', { current: 100, target: 500, tradeCount: 3 })).toBe('missed');
    expect(historyGlyph('profit', { current: 600, target: 0, tradeCount: 3 })).toBe('none');
    expect(historyGlyph('winRate', { current: 0, target: 65, tradeCount: 0 })).toBe('none');
    expect(historyGlyph('maxDrawdown', { current: 2, target: 3, tradeCount: 3 })).toBe('met');
    expect(historyGlyph('maxTrades', { current: 9, target: 8, tradeCount: 9 })).toBe('missed');
    expect(historyGlyph('profit', null)).toBe('none');
  });

  it('measures the streak at the end of the strip', () => {
    expect(streakOf(['missed', 'met', 'met', 'none', 'met'])).toEqual({ kind: 'met', length: 1 });
    expect(streakOf(['missed', 'met', 'met', 'met'])).toEqual({ kind: 'met', length: 3 });
    expect(streakOf(['met', 'missed', 'none'])).toEqual({ kind: 'missed', length: 1 });
    expect(streakOf(['none', 'none'])).toBeNull();
    expect(streakText('profit', 'weekly', { kind: 'met', length: 3 })).toBe('Met 3 weeks in a row');
    expect(streakText('maxDrawdown', 'monthly', { kind: 'met', length: 2 })).toBe('Within the limit 2 months in a row');
    expect(streakText('profit', 'weekly', { kind: 'met', length: 1 })).toBe('');
  });
});

describe('target validation', () => {
  it('accepts a number and says what is wrong otherwise', () => {
    expect(validateTarget('profit', '1,500.50')).toEqual({ value: 1500.5 });
    expect(validateTarget('profit', '')).toEqual({ error: 'Enter a number.' });
    expect(validateTarget('profit', 'abc')).toEqual({ error: 'Enter a number.' });
    expect(validateTarget('profit', '0')).toEqual({ error: 'Enter a number greater than 0.' });
    expect(validateTarget('winRate', '120')).toEqual({ error: 'Enter a percentage between 0 and 100.' });
    expect(validateTarget('maxTrades', '2.5')).toEqual({ error: 'Enter a whole number of trades.' });
    expect(validateTarget('maxTrades', '8')).toEqual({ value: 8 });
  });
});
