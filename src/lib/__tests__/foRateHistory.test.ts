import { describe, it, expect } from 'vitest';
import {
  EXCHANGE_ROWS,
  GST_ROWS,
  RATES_CHECKED_ON,
  SEBI_ROWS,
  STAMP_ROWS,
  STT_ROWS,
  calculateCharges,
  formatPct,
  isIsoDate,
  rateChangesSince,
  rowOn,
  type Leg,
  type RateSource,
} from '../charges/foRateHistory';

const SERIES: [string, readonly RateSource[]][] = [
  ['STT', STT_ROWS],
  ['exchange', EXCHANGE_ROWS],
  ['SEBI fee', SEBI_ROWS],
  ['stamp duty', STAMP_ROWS],
  ['GST', GST_ROWS],
];

const dayBefore = (iso: string): string => new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

const calc = (date: string, leg: Leg, value: number, brokerage = 0) => calculateCharges({ date, leg, value, brokerage });

describe('rate tables', () => {
  it.each(SERIES)('%s rows are sorted by effective date and each has a circular, its date and a source URL', (_name, rows) => {
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row, i) => {
      expect(isIsoDate(row.effectiveFrom), row.circular).toBe(true);
      expect(isIsoDate(row.circularDate), row.circular).toBe(true);
      expect(row.circularDate <= RATES_CHECKED_ON, row.circular).toBe(true);
      expect(row.circular.trim(), row.effectiveFrom).not.toBe('');
      expect(row.source, row.circular).toMatch(/^https:\/\//);
      if (i > 0) expect(row.effectiveFrom > rows[i - 1].effectiveFrom, `${row.circular} follows ${rows[i - 1].circular}`).toBe(true);
    });
  });

  it.each(SERIES)('%s lookup: the day before a row is the previous row, the effective date is the row, a date before the first has none', (_name, rows) => {
    expect(rowOn(rows, dayBefore(rows[0].effectiveFrom))).toBeUndefined();
    rows.forEach((row, i) => {
      expect(rowOn(rows, row.effectiveFrom)).toBe(row);
      if (i > 0) expect(rowOn(rows, dayBefore(row.effectiveFrom))).toBe(rows[i - 1]);
    });
    expect(rowOn(rows, '2099-01-01')).toBe(rows[rows.length - 1]);
  });

  it('STT rates at the circular boundaries', () => {
    const at = (d: string) => rowOn(STT_ROWS, d)!;
    expect([at('2023-03-31').futuresSell, at('2023-03-31').optionsSell]).toEqual([0.01, 0.05]);
    expect([at('2023-04-01').futuresSell, at('2023-04-01').optionsSell]).toEqual([0.0125, 0.0625]);
    expect([at('2024-09-30').futuresSell, at('2024-09-30').optionsSell]).toEqual([0.0125, 0.0625]);
    expect([at('2024-10-01').futuresSell, at('2024-10-01').optionsSell]).toEqual([0.02, 0.1]);
    expect([at('2026-03-31').futuresSell, at('2026-03-31').optionsSell, at('2026-03-31').optionsExercised]).toEqual([0.02, 0.1, 0.125]);
    expect([at('2026-04-01').futuresSell, at('2026-04-01').optionsSell, at('2026-04-01').optionsExercised]).toEqual([0.05, 0.15, 0.15]);
  });

  it('exchange charge: volume slabs until 30 Sep 2024, flat from 1 Oct 2024, the March 2026 split keeps the total', () => {
    expect(rowOn(EXCHANGE_ROWS, '2022-12-31')).toBeUndefined();
    expect(rowOn(EXCHANGE_ROWS, '2024-09-30')!.rates).toBeNull();
    expect(rowOn(EXCHANGE_ROWS, '2024-10-01')!.rates!.options.charge).toBe(0.03503);
    expect(rowOn(EXCHANGE_ROWS, '2026-02-28')!.rates!.options.charge).toBe(0.03503);
    expect(rowOn(EXCHANGE_ROWS, '2026-03-01')!.rates!.options.charge).toBe(0.0355299);

    const before = rowOn(EXCHANGE_ROWS, '2026-02-28')!.rates!;
    const after = rowOn(EXCHANGE_ROWS, '2026-03-01')!.rates!;
    for (const side of ['futures', 'options'] as const) {
      expect(+(before[side].charge + before[side].ipft).toFixed(7)).toBe(+(after[side].charge + after[side].ipft).toFixed(7));
    }
    expect(+(after.options.charge + after.options.ipft).toFixed(7)).toBe(0.03553);
  });

  it('SEBI fee is halved from 1 Jun 2020 to 31 Mar 2021, GST applies to it from 18 Jul 2022', () => {
    expect(rowOn(SEBI_ROWS, '2019-03-31')).toBeUndefined();
    expect(rowOn(SEBI_ROWS, '2019-04-01')!.pct).toBe(0.0001);
    expect(rowOn(SEBI_ROWS, '2020-06-01')!.pct).toBe(0.00005);
    expect(rowOn(SEBI_ROWS, '2021-03-31')!.pct).toBe(0.00005);
    expect(rowOn(SEBI_ROWS, '2021-04-01')!.pct).toBe(0.0001);
    expect(rowOn(SEBI_ROWS, '2026-01-07')!.circular).toContain('Regulations, 2026');
    expect(rowOn(GST_ROWS, '2022-07-17')!.sebiFee).toBe(0);
    expect(rowOn(GST_ROWS, '2022-07-18')!.sebiFee).toBe(18);
    expect(rowOn(GST_ROWS, '2017-06-30')).toBeUndefined();
    expect(rowOn(STAMP_ROWS, '2020-06-30')).toBeUndefined();
  });
});

describe('formatPct', () => {
  it('prints a rate without exponent notation or trailing zeros', () => {
    expect(formatPct(0.0000001)).toBe('0.0000001%');
    expect(formatPct(0.0125)).toBe('0.0125%');
    expect(formatPct(0.15)).toBe('0.15%');
    expect(formatPct(0.0001)).toBe('0.0001%');
    expect(formatPct(18)).toBe('18%');
  });
});

describe('calculateCharges', () => {
  it('futures sold on 15 Nov 2026: each component of ₹10,00,000 with ₹20 brokerage', () => {
    const c = calc('2026-11-15', 'futures-sell', 1_000_000, 20);
    expect(c.parts.stt.amount).toBe(500);
    expect(c.parts.exchange.amount).toBe(18.3);
    expect(c.parts.ipft.amount).toBe(0);
    expect(c.parts.sebi.amount).toBe(1);
    expect(c.parts.stamp.amount).toBe(0);
    expect(c.parts.gst.amount).toBe(7.07);
    expect(c.brokerage).toBe(20);
    expect(c.total).toBe(546.37);
    expect(c.complete).toBe(true);
    expect(c.pctOfValue).toBeCloseTo(0.054637, 6);
    expect(c.parts.stt.row?.circular).toBe('NSE/FATAX/73524');
  });

  it('futures bought: stamp duty on the buyer, no STT', () => {
    const c = calc('2026-11-15', 'futures-buy', 1_000_000);
    expect(c.parts.stt.amount).toBe(0);
    expect(c.parts.stamp.amount).toBe(20);
    expect(c.parts.gst.amount).toBe(3.47);
    expect(c.total).toBe(42.77);
  });

  it('options sold on 15 Nov 2026: STT 0.15% of the premium, no stamp duty', () => {
    const c = calc('2026-11-15', 'options-sell', 200_000);
    expect(c.parts.stt.amount).toBe(300);
    expect(c.parts.exchange.amount).toBe(71.06);
    expect(c.parts.ipft.amount).toBe(0);
    expect(c.parts.sebi.amount).toBe(0.2);
    expect(c.parts.stamp.amount).toBe(0);
    expect(c.parts.gst.amount).toBe(12.83);
    expect(c.total).toBe(384.09);
  });

  it('options bought on 1 Dec 2024: 0.003% stamp duty, no STT, the IPFT contribution of 0.0005%', () => {
    const c = calc('2024-12-01', 'options-buy', 200_000, 20);
    expect(c.parts.stt.amount).toBe(0);
    expect(c.parts.exchange.amount).toBe(70.06);
    expect(c.parts.ipft.amount).toBe(1);
    expect(c.parts.sebi.amount).toBe(0.2);
    expect(c.parts.stamp.amount).toBe(6);
    expect(c.parts.gst.amount).toBe(16.25);
    expect(c.total).toBe(113.51);
  });

  it('uses the STT in force on the trade date, including the rates before 1 Apr 2023', () => {
    expect(calc('2022-12-01', 'futures-sell', 1_000_000).parts.stt.amount).toBe(100);
    expect(calc('2022-12-01', 'options-sell', 100_000).parts.stt.amount).toBe(50);
    expect(calc('2023-04-01', 'options-sell', 100_000).parts.stt.amount).toBe(62.5);
    expect(calc('2026-03-31', 'options-sell', 100_000).parts.stt.amount).toBe(100);
    expect(calc('2026-04-01', 'options-sell', 100_000).parts.stt.amount).toBe(150);
  });

  it('during the volume-slab period the exchange charge and GST are not shown, the flat IPFT is, and the total is partial', () => {
    const c = calc('2024-06-10', 'options-sell', 100_000);
    expect(c.parts.stt.amount).toBe(62.5);
    expect(c.parts.exchange.amount).toBeNull();
    expect(c.parts.exchange.note).toContain('NSE/FA/61137');
    expect(c.parts.ipft.amount).toBe(0.5); // Rs 50 per crore of premium (NSE/FA/56129)
    expect(c.parts.gst.amount).toBeNull();
    expect(c.complete).toBe(false);
    expect(c.total).toBe(63.1);
  });

  it('before the first source-verified date a component says its source is not verified', () => {
    const c = calc('2020-06-30', 'futures-buy', 100_000);
    expect(c.parts.stamp.amount).toBeNull();
    expect(c.parts.stamp.note).toBe('not shown: source not verified for this date');
    expect(c.parts.exchange.amount).toBeNull();
    expect(c.parts.sebi.amount).toBe(0.05);
    expect(c.complete).toBe(false);
  });

  it('GST is taken on brokerage, the exchange charge and the SEBI fee, not on the IPFT contribution', () => {
    const c = calc('2024-12-01', 'options-sell', 10_000_000, 100);
    expect(c.parts.ipft.amount).toBe(50);
    expect(c.parts.gst.amount).toBe(r2(((100 + 3503) * 18) / 100 + 10 * 0.18));
    expect(c.parts.gst.note).toContain('SEBI fee');
  });

  it('an exercised option shows STT only, on the typed intrinsic value, and ignores brokerage', () => {
    const c = calc('2026-04-01', 'options-exercised', 50_000, 500);
    expect(c.parts.stt.amount).toBe(75);
    expect(c.parts.stt.note).toContain('purchaser');
    for (const key of ['exchange', 'ipft', 'sebi', 'stamp', 'gst'] as const) expect(c.parts[key].amount, key).toBeNull();
    expect(c.brokerage).toBe(0);
    expect(c.total).toBe(75);
    expect(c.complete).toBe(false);
    expect(calc('2026-03-31', 'options-exercised', 50_000).parts.stt.amount).toBe(62.5);
  });

  it.each([0, Number.NaN, -500, Number.POSITIVE_INFINITY])('a value of %s gives no charges and no percentage', (value) => {
    for (const leg of ['futures-buy', 'futures-sell', 'options-buy', 'options-sell', 'options-exercised'] as const) {
      const c = calc('2026-11-15', leg, value);
      expect(c.total, leg).toBe(0);
      expect(c.pctOfValue, leg).toBeNull();
      for (const p of Object.values(c.parts)) expect(p.amount === null || p.amount === 0, `${leg}: ${p.amount}`).toBe(true);
    }
  });

  it('empty brokerage counts as zero, typed brokerage is in the total with its GST', () => {
    expect(calc('2026-11-15', 'futures-buy', 0, Number.NaN).total).toBe(0);
    expect(calc('2026-11-15', 'futures-buy', 0, 20).total).toBe(23.6);
    expect(calc('2026-11-15', 'futures-buy', 0, 20).brokerage).toBe(20);
  });

  it('an empty or invalid date shows no amounts and does not throw', () => {
    for (const date of ['', '15-11-2026', 'x']) {
      const c = calc(date, 'futures-sell', 100_000);
      expect(c.parts.stt.amount, date).toBeNull();
      expect(c.parts.exchange.amount, date).toBeNull();
      expect(c.complete, date).toBe(false);
      expect(c.total, date).toBe(0);
    }
  });
});

describe('rateChangesSince', () => {
  const changes = rateChangesSince('2023-01-01');

  it('lists every STT and NSE charge change from 2023 in date order with its circular', () => {
    expect(changes.map((c) => [c.effectiveFrom, c.circular])).toEqual([
      ['2023-04-01', 'NSE/FATAX/56235'],
      ['2023-04-01', 'NSE/FA/56129'],
      ['2024-04-01', 'NSE/FA/61137'],
      ['2024-10-01', 'NSE/FATAX/63809'],
      ['2024-10-01', 'NSE/FA/64232'],
      ['2026-03-01', 'NSE/FA/73061'],
      ['2026-04-01', 'NSE/FATAX/73524'],
    ]);
    for (const c of changes) expect(c.source).toMatch(/^https:\/\//);
  });

  it('shows what each STT row replaced, and nothing earlier than the first STT row', () => {
    const april2026 = changes.find((c) => c.circular === 'NSE/FATAX/73524')!;
    expect(april2026.before).toBe('futures sale 0.02%, options sale 0.1%, options exercised 0.125%');
    expect(april2026.now).toBe('futures sale 0.05%, options sale 0.15%, options exercised 0.15%');
    expect(rateChangesSince('2016-01-01')[0].before).toBeNull();
  });

  it('has no SEBI fee, stamp duty or GST change after 2022, and a row that restates the rate is not a change', () => {
    expect(changes.some((c) => /SEBI|Stamp|GST/.test(c.charge))).toBe(false);
    expect(rateChangesSince('2026-01-01').some((c) => c.charge === 'SEBI turnover fee')).toBe(false);
    expect(rateChangesSince('2022-01-01').filter((c) => c.charge === 'GST').map((c) => c.circular)).toEqual(['NSE/FATAX/52993']);
  });
});

function r2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}
