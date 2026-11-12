import { describe, expect, it } from 'vitest';
import { availableDimensions, DIMENSIONS, distributionRows, explorerRows, explorerTotals, rBuckets, timingGrid, whatIsWorking } from '../analyticsRows';

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

  it('what is working ignores segments under 5 trades and rows without a value', () => {
    const w = whatIsWorking([{ dim: DIMENSIONS[0], rows: explorerRows(stats, 'symbol') }, { dim: DIMENSIONS[1], rows: explorerRows(stats, 'strategy') }]);
    expect(w.working.map((s) => s.row.name)).toEqual(['EURUSD']);
    expect(w.notWorking.map((s) => s.row.name)).toEqual(['Reversal']);
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
