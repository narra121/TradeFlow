import { afterEach, describe, expect, it } from 'vitest';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import {
  formatCompactMoney,
  formatCount,
  formatTime,
  formatDateShort,
  formatDateTime,
  formatDurationMinutes,
  formatMoney,
  formatPercent,
  formatProfitFactor,
  formatR,
  parseLocalDate,
} from '../format';

describe('formatMoney', () => {
  it.each([
    [-1203.1, 'USD', true, '−$1,203.10'],
    [5.8, 'USD', true, '+$5.80'],
    [5.8, 'USD', false, '$5.80'],
    [-0, 'USD', true, '$0.00'],
    [-0.004, 'USD', true, '$0.00'],
    [1499, 'INR', true, '+₹1,499.00'],
    [-55679.06, 'INR', false, '−₹55,679.06'],
    [10, undefined, true, '+10.00'],
  ])('%s %s sign=%s -> %s', (v, c, s, out) => expect(formatMoney(v, c, { sign: s })).toBe(out));

  it('renders missing values as a dash', () => {
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(NaN)).toBe('—');
    expect(formatMoney(null)).toBe('—');
  });
});

describe('formatCompactMoney', () => {
  it('compacts', () => {
    expect(formatCompactMoney(-1400, { sign: true })).toBe('−1.4k');
    expect(formatCompactMoney(12000, { sign: true })).toBe('+12k');
    expect(formatCompactMoney(340)).toBe('340');
    expect(formatCompactMoney(0, { sign: true })).toBe('0');
    expect(formatCompactMoney(5.8, { sign: true })).toBe('+5.8');
  });
});

describe('ratios', () => {
  it('formats percent and R', () => {
    expect(formatPercent(44.117)).toBe('44.1%');
    expect(formatPercent(-3.2, 1, { sign: true })).toBe('−3.2%');
    expect(formatR(2)).toBe('+2.00R');
    expect(formatR(-0.5)).toBe('−0.50R');
    expect(formatR(0)).toBe('0.00R');
    expect(formatR(-0.001)).toBe('0.00R');
    expect(formatR(null)).toBe('—');
    expect(formatR(Number.NaN)).toBe('—');
    expect(formatR(undefined)).toBe('—');
  });

  it('renders the profit-factor sentinel as infinity', () => {
    expect(formatProfitFactor(999.99, 4, 10)).toBe('∞');
    expect(formatProfitFactor(999.99, 0, 0)).toBe('—');
    expect(formatProfitFactor(1.456, 4, 10)).toBe('1.46');
    expect(formatProfitFactor(undefined, 4, 10)).toBe('—');
  });

  it('shows infinity for a null profit factor (profits and no losses), and a dash only when there were no wins or no trades', () => {
    expect(formatProfitFactor(null, 5, 5)).toBe('∞');
    expect(formatProfitFactor(null, 0, 5)).toBe('—');
    expect(formatProfitFactor(null, 0, 0)).toBe('—');
  });
});

describe('duration and dates', () => {
  it('formats durations', () => {
    expect(formatDurationMinutes(0.2)).toBe('<1m');
    expect(formatDurationMinutes(45)).toBe('45m');
    expect(formatDurationMinutes(135)).toBe('2h 15m');
    expect(formatDurationMinutes(1500)).toBe('1d 1h');
  });

  it('parses date-only strings as local dates', () => {
    const d = parseLocalDate('2026-11-04');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 4]);
    expect(formatDateShort('2026-11-04')).toBe('04 Nov');
    expect(formatDateShort('2026-11-04', true)).toBe('04 Nov 2026');
  });
});

describe('formatDateTime', () => {
  it('prints day, short month and time', () => {
    expect(formatDateTime('2026-10-23T17:06:00')).toBe('23 Oct 17:06');
    expect(formatDateTime('2026-11-04T09:05:00')).toBe('04 Nov 09:05'); // the day is padded like formatDateShort
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('dates follow the saved time zone', () => {
  afterEach(() => {
    localStorage.clear();
    resetUiStateCache();
  });
  // 2026-11-03 20:30 UTC: 15:30 on the 3rd in New York, 02:00 on the 4th in Kolkata.
  const at = '2026-11-03T20:30:00.000Z';

  it('shows an instant on the clock of the saved zone', () => {
    patchUiState({ timeZone: 'America/New_York' });
    expect([formatTime(at), formatDateTime(at), formatDateShort(at)]).toEqual(['15:30', '03 Nov 15:30', '03 Nov']);
    patchUiState({ timeZone: 'Asia/Kolkata' });
    expect([formatTime(at), formatDateTime(at), formatDateShort(at)]).toEqual(['02:00', '04 Nov 02:00', '04 Nov']);
  });

  it('leaves a date-only string and a Date as the calendar value they are', () => {
    patchUiState({ timeZone: 'Pacific/Kiritimati' });
    expect(formatDateShort('2026-11-04')).toBe('04 Nov');
    expect(formatDateShort(new Date(2026, 10, 4))).toBe('04 Nov');
  });
});

describe('formatCount', () => {
  it('groups the US way whatever the locale', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(12)).toBe('12');
  });
});

describe('Indian grouping', () => {
  it('groups INR in lakhs and crores and other currencies in thousands', () => {
    expect(formatMoney(443212, 'INR')).toBe('₹4,43,212.00');
    expect(formatMoney(12345678.5, 'INR')).toBe('₹1,23,45,678.50');
    expect(formatMoney(-1476.84, 'INR')).toBe('−₹1,476.84');
    expect(formatMoney(482300, 'USD')).toBe('$482,300.00');
  });

  it('shortens INR in L and Cr', () => {
    expect(formatCompactMoney(230000, { currency: 'INR' })).toBe('₹2.3L');
    expect(formatCompactMoney(25000000, { currency: 'INR' })).toBe('₹2.5Cr');
    expect(formatCompactMoney(1500000, { currency: 'USD' })).toBe('$1.5M');
  });

  it('keeps the unit but drops the symbol for axis ticks and heat cells, so an INR scope reads 12L, not 1.2M', () => {
    expect(formatCompactMoney(1200000, { currency: 'INR', symbol: false })).toBe('12L');
    expect(formatCompactMoney(-250000, { currency: 'INR', symbol: false })).toBe('−2.5L');
    expect(formatCompactMoney(1200000, { currency: 'USD', symbol: false })).toBe('1.2M');
    expect(formatCompactMoney(1200000)).toBe('1.2M');
  });
});
