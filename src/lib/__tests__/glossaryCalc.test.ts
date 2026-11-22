import { describe, expect, it } from 'vitest';
import { computeExpectancy } from '@/lib/expectancy';
import { maxDrawdown, parseSeries, profitFactor, rMultiple, termExpectancy, winRate } from '@/lib/glossaryCalc';

describe('profitFactor', () => {
  it('divides gross profit by gross loss: the eight-trade example is 465 ÷ 255 = 1.82', () => {
    const r = profitFactor(465, 255);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.profitFactor).toBeCloseTo(1.8235, 4);
    expect(r.net).toBe(210);
  });

  it('ignores the sign of the gross loss', () => {
    expect(profitFactor(465, -255)).toEqual(profitFactor(465, 255));
  });

  it('is undefined, not infinite, when nothing lost', () => {
    expect(profitFactor(500, 0)).toEqual({ status: 'undefined', reason: 'no-losses', net: 500 });
    expect(profitFactor(0, 0)).toEqual({ status: 'undefined', reason: 'no-trades', net: 0 });
  });

  it('is 0 when nothing won and rejects a negative gross profit or a non-number', () => {
    expect(profitFactor(0, 100)).toEqual({ status: 'ok', profitFactor: 0, net: -100 });
    expect(profitFactor(-1, 100)).toEqual({ status: 'error', error: 'negative-profit' });
    expect(profitFactor(Number.NaN, 100)).toEqual({ status: 'error', error: 'not-a-number' });
  });

  it('shows why monthly profit factors must not be averaged: 300/100 and 100/400 give 0.80 together', () => {
    const together = profitFactor(300 + 100, 100 + 400);
    expect(together.status === 'ok' && together.profitFactor).toBeCloseTo(0.8, 10);
  });
});

describe('termExpectancy', () => {
  const example = { winRatePct: 40, lossRatePct: 50, avgWin: 1925, avgLoss: 900, riskPerTrade: 1000 };

  it('the ten-trade example: 0.4 × 1,925 − 0.5 × 900 = +320 a trade, +0.32R', () => {
    const r = termExpectancy(example);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.winPart).toBeCloseTo(770, 9);
    expect(r.lossPart).toBeCloseTo(-450, 9);
    expect(r.expectancy).toBeCloseTo(320, 9);
    expect(r.expectancyR).toBeCloseTo(0.32, 9);
    expect(r.rUnit).toBe('risk');
    expect(r.zeroPct).toBeCloseTo(10, 9);
  });

  it('equals net profit ÷ trades for the same ten trades', () => {
    const results = [2000, -1000, -1000, 1500, -1000, 0, 3000, -1000, -500, 1200];
    const net = results.reduce((a, b) => a + b, 0);
    const r = termExpectancy(example);
    expect(r.status === 'ok' && r.expectancy).toBeCloseTo(net / results.length, 9);
  });

  it('using 100 − win rate as the loss rate counts the zero trade as a loss: +230 instead of +320', () => {
    const r = termExpectancy({ ...example, lossRatePct: undefined });
    expect(r.status === 'ok' && r.expectancy).toBeCloseTo(230, 9);
  });

  it('uses the average loss as 1R when no risk is given: +0.36R overstates the +0.32R measured on the risk', () => {
    const r = termExpectancy({ ...example, riskPerTrade: undefined });
    expect(r.status === 'ok' && r.rUnit).toBe('avg-loss');
    expect(r.status === 'ok' && r.expectancyR).toBeCloseTo(320 / 900, 9);
  });

  it('matches the expectancy calculator before charges when no trade closed at zero', () => {
    const term = termExpectancy({ winRatePct: 45, avgWin: 150, avgLoss: 100 });
    const calc = computeExpectancy({ winRatePct: 45, avgWin: 150, avgLoss: 100 });
    expect(term.status === 'ok' && calc.status === 'ok' && term.expectancy - calc.grossExpectancy).toBeCloseTo(0, 9);
  });

  it('has no R when there is no risk unit, and rejects impossible rates', () => {
    const noUnit = termExpectancy({ winRatePct: 100, avgWin: 50, avgLoss: 0 });
    expect(noUnit.status === 'ok' && noUnit.expectancyR).toBeNull();
    expect(termExpectancy({ ...example, winRatePct: 101 })).toEqual({ status: 'error', error: 'win-rate-range' });
    expect(termExpectancy({ ...example, lossRatePct: -1 })).toEqual({ status: 'error', error: 'loss-rate-range' });
    expect(termExpectancy({ ...example, winRatePct: 60, lossRatePct: 50 })).toEqual({ status: 'error', error: 'rates-over-100' });
    expect(termExpectancy({ ...example, avgWin: -5 })).toEqual({ status: 'error', error: 'negative-win' });
    expect(termExpectancy({ ...example, riskPerTrade: -5 })).toEqual({ status: 'error', error: 'negative-risk' });
  });

  it('the FAQ case: 30% winners at 2.5R against 1R losers is +0.05R', () => {
    const r = termExpectancy({ winRatePct: 30, avgWin: 2.5, avgLoss: 1 });
    expect(r.status === 'ok' && r.expectancy).toBeCloseTo(0.05, 9);
  });
});

describe('rMultiple', () => {
  it('the short example: entry 1,450, stop 1,470, exit 1,412 is +1.9R', () => {
    expect(rMultiple('short', 1450, 1470, 1412)).toEqual({ status: 'ok', r: 1.9, riskPerUnit: 20, resultPerUnit: 38 });
  });

  it('a long stopped past its stop: GBP/USD 1.2700, stop 1.2675, filled 1.2668 is −1.28R', () => {
    const r = rMultiple('long', 1.27, 1.2675, 1.2668);
    expect(r.status === 'ok' && r.r).toBeCloseTo(-1.28, 9);
  });

  it('is exactly −1R at the stop and 0 at the entry', () => {
    expect(rMultiple('long', 100, 98, 98)).toMatchObject({ r: -1 });
    expect(rMultiple('short', 100, 102, 100)).toMatchObject({ r: 0 });
  });

  it('is undefined for a zero stop distance and rejects a stop on the wrong side', () => {
    expect(rMultiple('long', 100, 100, 104)).toEqual({ status: 'undefined', reason: 'zero-stop' });
    expect(rMultiple('long', 100, 101, 104)).toEqual({ status: 'error', error: 'stop-wrong-side' });
    expect(rMultiple('short', 100, 99, 96)).toEqual({ status: 'error', error: 'stop-wrong-side' });
    expect(rMultiple('long', Number.NaN, 99, 104)).toEqual({ status: 'error', error: 'not-a-number' });
  });
});

describe('winRate', () => {
  it('the twenty-trade example: 45.0% of all trades, 47.4% without the zero trade, break-even 38.5% at a payoff of 1.6', () => {
    const r = winRate({ wins: 9, losses: 10, zero: 1, payoff: 1.6 });
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.trades).toBe(20);
    expect(r.winRatePct).toBeCloseTo(45, 9);
    expect(r.decisiveWinRatePct).toBeCloseTo(47.368, 3);
    expect(r.breakEvenPct).toBeCloseTo(38.462, 3);
    expect(r.marginPts).toBeCloseTo(8.907, 3);
  });

  it('break-even rates the FAQ quotes: 1 → 50%, 2 → 33.3%, 3 → 25%, 0.5 → 66.7%, 1.3 → 43.5%', () => {
    const be = (payoff: number) => {
      const r = winRate({ wins: 1, losses: 1, payoff });
      return r.status === 'ok' ? r.breakEvenPct : NaN;
    };
    expect(be(1)).toBeCloseTo(50, 9);
    expect(be(2)).toBeCloseTo(33.333, 3);
    expect(be(3)).toBeCloseTo(25, 9);
    expect(be(0.5)).toBeCloseTo(66.667, 3);
    expect(be(1.3)).toBeCloseTo(43.478, 3);
  });

  it('has no break-even rate without a payoff and no decisive rate when every trade closed at zero', () => {
    const r = winRate({ wins: 0, losses: 0, zero: 3 });
    expect(r).toEqual({ status: 'ok', trades: 3, winRatePct: 0, decisiveWinRatePct: null, breakEvenPct: null, marginPts: null });
  });

  it('rejects no trades, fractions, negatives and a negative payoff', () => {
    expect(winRate({ wins: 0, losses: 0 })).toEqual({ status: 'error', error: 'no-trades' });
    expect(winRate({ wins: 2.5, losses: 1 })).toEqual({ status: 'error', error: 'not-whole' });
    expect(winRate({ wins: 3, losses: -1 })).toEqual({ status: 'error', error: 'not-whole' });
    expect(winRate({ wins: 3, losses: 1, payoff: -1 })).toEqual({ status: 'error', error: 'negative-payoff' });
  });
});

describe('parseSeries', () => {
  it('reads spaces, new lines and semicolons as separators and commas as thousands separators', () => {
    expect(parseSeries('10,000\n10,400; 10,100  1,10,000')).toEqual({ status: 'ok', values: [10000, 10400, 10100, 110000] });
    expect(parseSeries('10,000, 10,400,')).toEqual({ status: 'ok', values: [10000, 10400] });
  });

  it('accepts signs, the true minus, percent signs and currency symbols', () => {
    expect(parseSeries('+5% −3% -4 $100 ₹2,500 +₹10')).toEqual({ status: 'ok', values: [5, -3, -4, 100, 2500, 10] });
  });

  it('returns the first token it cannot read instead of turning it into 0', () => {
    expect(parseSeries('100 abc 90')).toEqual({ status: 'error', token: 'abc' });
    expect(parseSeries('100 % 90')).toEqual({ status: 'error', token: '%' });
    expect(parseSeries('')).toEqual({ status: 'ok', values: [] });
  });
});

describe('maxDrawdown', () => {
  const balances = [10000, 10400, 10100, 10900, 10250, 9800, 10300, 11200, 13000, 11800, 12600];

  it('the eleven-balance example: 10.09% from 10,900 to 9,800, recovered at the 8th value, 11.22% gain to recover', () => {
    const r = maxDrawdown(balances, 'balances');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.maxByPct).toMatchObject({ peakIndex: 3, troughIndex: 5, peak: 10900, trough: 9800, amount: 1100 });
    expect(r.maxByPct!.pct).toBeCloseTo(10.0917, 4);
    expect(r.recoveredAt).toBe(7);
    expect(r.recoveryGainPct).toBeCloseTo(11.2245, 4);
  });

  it('the largest fall in money is a different stretch: 1,200 from 13,000, only 9.23%', () => {
    const r = maxDrawdown(balances, 'balances');
    expect(r.status === 'ok' && r.maxByAmount).toMatchObject({ peakIndex: 8, troughIndex: 9, amount: 1200 });
    expect(r.status === 'ok' && r.maxByAmount!.pct).toBeCloseTo(9.2308, 4);
  });

  it('compounds returns from 100: +5, −3, −4 is a 6.88% drawdown, not 7%', () => {
    const r = maxDrawdown([5, -3, -4], 'returns');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.levels[3]).toBeCloseTo(97.776, 9);
    expect(r.maxByPct!.pct).toBeCloseTo(6.88, 9);
    expect(r.recoveredAt).toBeNull();
  });

  it('a series that never falls has no drawdown', () => {
    const r = maxDrawdown([100, 100, 120, 150], 'balances');
    expect(r).toMatchObject({ status: 'ok', maxByPct: null, maxByAmount: null, recoveredAt: null, recoveryGainPct: null });
  });

  it('an account that reaches 0 has a 100% drawdown and an infinite recovery gain', () => {
    const r = maxDrawdown([100, 50, 0], 'balances');
    expect(r.status === 'ok' && r.maxByPct!.pct).toBe(100);
    expect(r.status === 'ok' && r.recoveryGainPct).toBe(Infinity);
    expect(maxDrawdown([10, -100], 'returns')).toMatchObject({ status: 'ok', maxByPct: { pct: 100 } });
  });

  it('rejects an empty or one-value list, a start at or below 0, negative balances and returns below −100%', () => {
    expect(maxDrawdown([], 'balances')).toEqual({ status: 'error', error: 'too-few' });
    expect(maxDrawdown([100], 'balances')).toEqual({ status: 'error', error: 'too-few' });
    expect(maxDrawdown([], 'returns')).toEqual({ status: 'error', error: 'too-few' });
    expect(maxDrawdown([0, 100], 'balances')).toEqual({ status: 'error', error: 'non-positive-start' });
    expect(maxDrawdown([100, -5], 'balances')).toEqual({ status: 'error', error: 'negative-balance' });
    expect(maxDrawdown([5, -101], 'returns')).toEqual({ status: 'error', error: 'return-below-minus-100' });
  });
});
