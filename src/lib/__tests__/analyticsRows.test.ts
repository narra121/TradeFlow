import { describe, expect, it } from 'vitest';
import { availableDimensions, DIMENSIONS, distributionRows, evidenceFindings, explorerRows, explorerTotals, rBuckets, realisedRStat, rNoteLine, segmentRows, timingGrid } from '../analyticsRows';
import type { Segment } from '@/types/analysis';

describe('distributionRows', () => {
  it('computes win rate, drops empty names and sorts by trade count', () => {
    const rows = distributionRows({ Breakout: { count: 4, wins: 3, pnl: 120 }, Reversal: { count: 10, wins: 2, pnl: -50 }, Unused: { count: 0, wins: 0, pnl: 0 } });
    expect(rows.map((r) => r.name)).toEqual(['Reversal', 'Breakout']);
    expect(rows[1]).toMatchObject({ trades: 4, winRate: 75, net: 120 });
  });

  it('reads totalPnl for mistake distributions and resolves names', () => {
    const rows = distributionRows({ r1: { count: 2, totalPnl: -30 } }, { resolveName: (k) => (k === 'r1' ? 'No revenge trades' : k) });
    expect(rows).toEqual([{ key: 'r1', name: 'No revenge trades', trades: 2, wins: 0, winRate: 0, net: -30 }]);
  });

  it('handles a missing record', () => {
    expect(distributionRows(undefined)).toEqual([]);
  });

  it('carries the average R of a tag and the trades behind it; a null average stays absent', () => {
    const rows = distributionRows({ FOMO: { count: 5, totalPnl: -420, rCount: 4, avgR: -1.18 }, Late: { count: 2, totalPnl: -30, rCount: 0, avgR: null } });
    expect(rows[0]).toMatchObject({ key: 'FOMO', avgR: -1.18, rCount: 4 });
    expect(rows[1]).not.toHaveProperty('avgR');
    expect(rows[1].rCount).toBe(0);
  });
});

describe('realisedRStat', () => {
  it('reads the server average R with its sample and keeps the plan beside it', () => {
    const r = realisedRStat({ avgR: 0.22, sdR: 1.5, rCount: 45, avgRiskReward: 2, totalTrades: 68 });
    expect(r).toMatchObject({ avgR: 0.22, sdR: 1.5, rCount: 45, planned: 2, note: '45 trades with a stop', plan: 'planned R:R 2.00' });
    expect(r.sample).toBe('45 of 68 trades have a stop and an exit price; spread (standard deviation) 1.50R. Before fees.');
    expect(rNoteLine(r)).toBe('45 trades with a stop · planned R:R 2.00');
    expect(rNoteLine(realisedRStat({ avgR: 1, sdR: null, rCount: 1 }))).toBe('1 trade with a stop');
  });

  it('tells "no trade with a stop" (null) apart from a server without realised R (absent)', () => {
    expect(rNoteLine(realisedRStat({ avgR: null, rCount: 0, avgRiskReward: 2 }))).toBe('No trade with a stop · planned, not realised');
    expect(rNoteLine(realisedRStat({ avgR: null, rCount: 0 }))).toBe('No trade with a stop');
    expect(rNoteLine(realisedRStat({ avgRiskReward: 2 }))).toBe('Planned, not realised');
    expect(realisedRStat(undefined)).toMatchObject({ avgR: null, rCount: 0, planned: null, note: '', plan: '', sample: '' });
  });
});

describe('explorer (server segments)', () => {
  const stats = {
    segments: {
      symbol: { EURUSD: { trades: 6, wins: 4, net: 300, avgR: 0.5 }, XAUUSD: { trades: 2, wins: 0, net: -90, avgR: null } },
      strategy: { Reversal: { trades: 9, wins: 2, net: -860, avgR: -0.7 }, Unknown: { trades: 7, wins: 3, net: 40, avgR: null } },
      session: { Unknown: { trades: 3, wins: 1, net: 5, avgR: null } },
      weekday: { '2': { trades: 3, wins: 1, net: -10, avgR: null }, '0': { trades: 1, wins: 1, net: 5, avgR: null }, '1': { trades: 4, wins: 2, net: 9, avgR: null } },
      hour: { '14': { trades: 10, wins: 5, net: 40, avgR: null }, '09': { trades: 2, wins: 1, net: 3, avgR: null } },
      direction: { BUY: { trades: 8, wins: 5, net: 100, avgR: null }, SELL: { trades: 2, wins: 0, net: -30, avgR: null } },
    },
  };

  it('carries avgR only when the server sends a number', () => {
    expect(explorerRows(stats, 'symbol')[0].avgR).toBe(0.5);
    expect(explorerRows(stats, 'symbol')[1]).not.toHaveProperty('avgR');
  });

  it('shows a large R as the server computed it (R comes from prices, so there is no cap)', () => {
    expect(explorerRows({ segments: { symbol: { NIFTY: { trades: 3, wins: 3, net: 10, avgR: 120 } } } }, 'symbol')[0].avgR).toBe(120);
  });

  it('names weekdays, hours and directions and keeps the Trades filter value apart from the label', () => {
    expect(explorerRows(stats, 'weekday').map((r) => [r.name, r.drill])).toEqual([['Monday', 'Monday'], ['Tuesday', 'Tuesday'], ['Sunday', 'Sunday']]);
    expect(explorerRows(stats, 'hour').map((r) => [r.name, r.drill])).toEqual([['09:00', '9'], ['14:00', '14']]);
    expect(explorerRows(stats, 'direction').map((r) => [r.name, r.drill])).toEqual([['Long', 'LONG'], ['Short', 'SHORT']]);
  });

  it('shows values the server stores as Unknown as "No strategy" (filterable) and "No session" (not filterable)', () => {
    expect(explorerRows(stats, 'strategy').find((r) => r.key === 'Unknown')).toMatchObject({ name: 'No strategy', drill: '' });
    expect(explorerRows(stats, 'session')[0]).toMatchObject({ name: 'No session', drill: null });
  });

  it('offers a dimension only when the server sent segments for it (Symbol is always there)', () => {
    expect(availableDimensions(stats).map((d) => d.id)).toEqual(['symbol', 'strategy', 'session', 'weekday', 'hour', 'direction']);
    expect(availableDimensions(undefined).map((d) => d.id)).toEqual(['symbol']);
    expect(DIMENSIONS.filter((d) => d.free).map((d) => d.id)).toEqual(['symbol']);
  });

  it('totals the rows', () => {
    expect(explorerTotals(explorerRows(stats, 'symbol'))).toEqual({ trades: 8, wins: 4, winRate: 50, net: 210, expectancy: 26.25 });
  });

});

describe('evidenceFindings (what is working, by evidence)', () => {
  const seg = (key: string, trades: number, avgR: number | null, net: number, verdict: Segment['verdict'] = 'watch'): Segment => ({
    key, name: key.toUpperCase(), trades, wins: 0, winRate: 0, winRateRange: null, net, profitFactor: null, avgR, avgRRange: null, verdict, label: 'too-few', tradeIds: [],
  });

  it('names an edge or a leak only when the server judged it so, and never ranks by net P&L', () => {
    const f = evidenceFindings({ symbol: [seg('a', 40, 0.9, 10, 'edge'), seg('b', 40, -0.8, -5, 'leak'), seg('c', 8, -1.02, -9000)] }, ['symbol'], 0.1, 100);
    expect(f.edges.map((x) => x.seg.key)).toEqual(['a']);
    expect(f.leaks.map((x) => x.seg.key)).toEqual(['b']);
    expect(f.watch.map((x) => x.seg.key)).toEqual(['c']);
  });

  it('ranks patterns to watch by distance from the average R scaled by the sample, not by money', () => {
    const f = evidenceFindings({ setup: [seg('big-money', 6, 0.2, 5000), seg('far', 24, -0.9, -10), seg('tiny', 3, -5, -50)] }, ['setup'], 0.22, 45);
    expect(f.watch.map((x) => x.seg.key)).toEqual(['far', 'big-money']);
  });

  it('leaves out weekday and hour unless judged, segments holding every trade, and rows without R', () => {
    const f = evidenceFindings(
      { weekday: [seg('fri', 20, -2, -1)], hour: [seg('09', 30, -1, -1, 'leak')], direction: [seg('long', 45, 0.22, 10)], tag: [seg('x', 10, null, -1)] },
      ['weekday', 'hour', 'direction', 'tag'], 0.22, 45,
    );
    expect(f.watch).toEqual([]);
    expect(f.leaks.map((x) => x.seg.key)).toEqual(['09']);
  });
});

describe('segmentRows', () => {
  it('turns server segments into explorer rows: percent win rate, evidence, ids, days', () => {
    const rows = segmentRows([
      { key: 'nifty', name: 'NIFTY', trades: 8, wins: 2, winRate: 0.25, winRateRange: null, net: -120, profitFactor: 0.4, avgR: -1.02, avgRRange: null, verdict: 'watch', label: 'too-few', tradeIds: ['t1'], days: 3 },
      { key: 'empty', name: 'Empty', trades: 0, wins: 0, winRate: 0, winRateRange: null, net: 0, profitFactor: null, avgR: null, avgRRange: null, verdict: 'watch', label: 'too-few', tradeIds: [] },
    ]);
    expect(rows).toEqual([{ key: 'nifty', name: 'NIFTY', trades: 8, wins: 2, winRate: 25, net: -120, avgR: -1.02, profitFactor: 0.4, verdict: 'watch', tradeIds: ['t1'], days: 3 }]);
  });
});

describe('timingGrid', () => {
  it('is null while the server sends no matrix', () => {
    expect(timingGrid(undefined)).toBeNull();
    expect(timingGrid([])).toBeNull();
  });

  it('maps day numbers (0 = Sunday) to Monday-first rows', () => {
    const g = timingGrid([{ day: 1, hour: 9, trades: 4, wins: 3, net: 50 }, { day: 5, hour: 15, trades: 2, wins: 0, net: -20 }, { day: 0, hour: 9, trades: 1, wins: 1, net: 5 }]);
    expect(g?.hours).toEqual([9, 15]);
    expect(g?.rows.map((r) => r.day)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(g?.rows[0].cells[9]).toEqual({ trades: 4, net: 50, winRate: 75 });
    expect(g?.rows[4].cells[15]?.net).toBe(-20);
    expect(g?.rows[6].cells[9]?.net).toBe(5);
  });
});

describe('rBuckets', () => {
  it('labels the server histogram and counts the sample', () => {
    const d = rBuckets({ buckets: [{ label: '<=-2', count: 1 }, { label: '-2..-1', count: 2 }, { label: '>3', count: 3 }], noStop: 4 });
    expect(d.buckets.map((b) => b.label)).toEqual(['−2R or worse', '−2 to −1R', '3R or better']);
    expect(d.sample).toBe(6);
    expect(d.noStop).toBe(4);
  });

  it('is empty without data', () => {
    expect(rBuckets(undefined)).toEqual({ buckets: [], noStop: 0, sample: 0 });
  });
});
