import { describe, expect, it } from 'vitest';
import { formatPercent, formatR } from '@/lib/format';
import { sampleLabel as appSampleLabel, MIN_RANGE_TRADES as APP_MIN_RANGE, MIN_VERDICT_TRADES as APP_MIN_VERDICT } from '@/lib/evidence';
import { money, sampleStats } from '../sampleJournal';
import {
  MIN_RANGE_TRADES,
  MIN_VERDICT_TRADES,
  SAMPLE_FACTS,
  SAMPLE_FOCUS_TEXT,
  bootstrapMean,
  sampleBehaviours,
  sampleBeyondStop,
  sampleEdge,
  sampleLabel,
  sampleReplay,
  sampleReview,
  sampleSequence,
  wilson,
} from '../sampleAnalysis';

const pct = (fraction: number) => formatPercent(fraction * 100);

describe('sample facts', () => {
  it('orders each day in time with no overlap, and signs R like the result', () => {
    SAMPLE_FACTS.forEach((f, i) => {
      expect(f.close).toBeGreaterThan(f.open);
      expect(Math.sign(f.r)).toBe(Math.sign(f.pnl));
      const before = SAMPLE_FACTS[i - 1];
      if (before && before.day === f.day) expect(f.open).toBeGreaterThanOrEqual(before.close);
    });
  });

  it('knows the latest same-day result at each open', () => {
    const first = SAMPLE_FACTS.filter((f, i) => SAMPLE_FACTS[i - 1]?.day !== f.day);
    expect(first.every((f) => f.prev === null)).toBe(true);
    // 10 Nov: a loss, a trade 8 minutes later, another 11 minutes after that loss, then one hours after a win.
    expect(SAMPLE_FACTS.filter((f) => f.day === 10).map((f) => f.prev && [f.prev.pnl, f.prev.minutesSinceClose])).toEqual([null, [-41, 8], [-33.75, 11], [18, 170]]);
  });
});

describe('evidence rules match the app', () => {
  it('uses the app thresholds and sample bands', () => {
    expect([MIN_RANGE_TRADES, MIN_VERDICT_TRADES]).toEqual([APP_MIN_RANGE, APP_MIN_VERDICT]);
    for (const n of [1, 19, 20, 29, 30, 99, 100, 500]) expect(sampleLabel(n)).toBe(appSampleLabel(n));
  });

  it('computes the Wilson range the research report quotes: 24 of 45 is 39.1–67.1%', () => {
    const r = wilson(24, 45);
    expect([pct(r.lo), pct(r.hi)]).toEqual(['39.1%', '67.1%']);
  });

  it('resamples deterministically and brackets the mean', () => {
    const xs = SAMPLE_FACTS.map((f) => f.r);
    expect(bootstrapMean(xs)).toEqual(bootstrapMean(xs));
    const r = bootstrapMean(xs);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(r.lo).toBeLessThan(mean);
    expect(r.hi).toBeGreaterThan(mean);
  });
});

describe('the sample month in Analytics', () => {
  it('has an edge that is not proven yet', () => {
    const e = sampleEdge();
    const s = sampleStats();
    expect(e.trades).toBe(s.trades);
    expect(e.label).toBe('early');
    expect(pct(e.winRate)).toBe(formatPercent(s.winRate));
    expect([pct(e.winRateRange.lo), pct(e.winRateRange.hi)]).toEqual(['40.7%', '74.5%']);
    expect(e.payoff.toFixed(2)).toBe('1.65');
    expect(pct(e.breakEvenWinRate)).toBe('37.7%');
    expect(formatR(e.expectancyR)).toBe('+0.26R');
    expect([formatR(e.expectancyRRange.lo), formatR(e.expectancyRRange.hi)]).toEqual(['−0.07R', '+0.61R']);
    expect(e.expectancyRRange.lo).toBeLessThan(0);
    expect(e.tradesNeeded).toBe(48);
    expect(e.tradesNeeded!).toBeGreaterThan(e.trades);
  });

  it('prices the behaviours, costliest first, and none has the 30 trades a verdict needs', () => {
    const rows = sampleBehaviours();
    expect(rows.map((b) => [b.id, b.trades, money(b.net)])).toEqual([
      ['brokenRule', 6, '−$118.25'],
      ['beyondStop', 3, '−$104.75'],
      ['reentryAfterLoss', 4, '−$64.25'],
      ['afterLoss', 8, '+$50.25'],
    ]);
    expect(rows.find((b) => b.id === 'brokenRule')!.net).toBe(sampleStats().brokenRules);
    expect(rows.map((b) => [formatR(b.avgR), formatR(b.normalAvgR)])).toEqual([
      ['−0.63R', '+0.50R'],
      ['−1.25R', '+0.44R'],
      ['−0.53R', '+0.39R'],
      ['+0.08R', '+0.10R'],
    ]);
    for (const b of rows) expect(b.trades).toBeLessThan(MIN_VERDICT_TRADES);
  });

  it('counts the losses that ran past the stop and only the part beyond it', () => {
    const b = sampleBeyondStop();
    expect([b.trades, b.losingTrades, b.amount]).toEqual([3, sampleStats().losses, 21.21]);
  });

  it('replays "stop for the day after n losing trades" over trades that happened', () => {
    const one = sampleReplay(1);
    expect([money(one.actualNet), money(one.replayNet), one.removed, one.trades]).toEqual(['+$370.50', '+$339.75', 9, 29]);
    const two = sampleReplay(2);
    expect([money(two.replayNet), two.removed]).toEqual(['+$372.00', 2]);
    expect(sampleReplay(99).removed).toBe(0);
  });
});

describe('the sample month in Insights', () => {
  it('answers the after-a-loss question with two groups that add up to the month', () => {
    const { rows, label } = sampleSequence();
    const s = sampleStats();
    expect(rows.map((r) => [r.group, r.trades, r.wins, money(r.net), formatR(r.avgR)])).toEqual([
      ['After a loss the same day', 8, 4, '+$50.25', '+0.08R'],
      ['All other trades', 21, 13, '+$320.25', '+0.33R'],
    ]);
    expect(rows[0].trades + rows[1].trades).toBe(s.trades);
    expect(Math.round((rows[0].net + rows[1].net) * 100) / 100).toBe(s.net);
    expect(label).toBe('too-few');
  });

  it('reviews two weeks: the first names its costliest behaviour, the second counts the focus rule', () => {
    const { first, second, focus } = sampleReview();
    expect([first.trades, money(first.net), first.headline]).toEqual([14, '+$196.25', 'A winning week, with process breaks.']);
    expect(first.theOne).toEqual({ title: 'Re-entry after a loss', trades: 2, cost: 48.5, ownRule: false });
    expect([second.trades, money(second.net), second.headline]).toEqual([12, '+$113.05', 'A winning week, with process breaks.']);
    expect(second.theOne).toEqual({ title: 'Broke "Trade with the 1-hour trend"', trades: 4, cost: 76.25, ownRule: true });
    expect(focus).toEqual({ text: SAMPLE_FOCUS_TEXT, checked: 12, kept: 10, broken: 2, cost: 15.75 });
    expect(focus.kept + focus.broken).toBe(second.trades);
  });
});
