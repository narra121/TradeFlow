import { describe, it, expect } from 'vitest';
import type { AggregatedStats } from '../stats';

// ---------------------------------------------------------------------------
// Type conformance tests for AggregatedStats
// ---------------------------------------------------------------------------
// Since this is a TypeScript interface, these tests verify that objects
// conforming to the type compile correctly and hold expected values at
// runtime. If someone removes a required field, these tests will fail at
// compile time (and the assertions catch runtime shape issues).
// ---------------------------------------------------------------------------

function makeStats(overrides: Partial<AggregatedStats> = {}): AggregatedStats {
  return {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    grossProfit: 0,
    grossLoss: 0,
    totalPnl: 0,
    totalVolume: 0,
    winRate: 0,
    profitFactor: 0,
    avgWin: 0,
    avgLoss: 0,
    expectancy: 0,
    avgRiskReward: 0,
    bestTrade: 0,
    worstTrade: 0,
    avgHoldingTime: 0,
    minDuration: 0,
    maxDuration: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    durationBuckets: [],
    symbolDistribution: {},
    strategyDistribution: {},
    sessionDistribution: {},
    outcomeDistribution: {},
    hourlyStats: [],
    dailyWinRate: [],
    dailyPnl: [],
    ...overrides,
  };
}

describe('AggregatedStats type', () => {
  it('allows creating a valid stats object with all required fields', () => {
    const stats: AggregatedStats = makeStats();

    expect(stats.totalTrades).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.breakeven).toBe(0);
    expect(stats.grossProfit).toBe(0);
    expect(stats.grossLoss).toBe(0);
    expect(stats.totalPnl).toBe(0);
    expect(stats.totalVolume).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.profitFactor).toBe(0);
    expect(stats.avgWin).toBe(0);
    expect(stats.avgLoss).toBe(0);
    expect(stats.expectancy).toBe(0);
    expect(stats.avgRiskReward).toBe(0);
    expect(stats.bestTrade).toBe(0);
    expect(stats.worstTrade).toBe(0);
    expect(stats.avgHoldingTime).toBe(0);
    expect(stats.minDuration).toBe(0);
    expect(stats.maxDuration).toBe(0);
    expect(stats.consecutiveWins).toBe(0);
    expect(stats.consecutiveLosses).toBe(0);
    expect(stats.maxDrawdown).toBe(0);
    expect(stats.sharpeRatio).toBe(0);
    expect(stats.durationBuckets).toEqual([]);
    expect(stats.symbolDistribution).toEqual({});
    expect(stats.strategyDistribution).toEqual({});
    expect(stats.sessionDistribution).toEqual({});
    expect(stats.outcomeDistribution).toEqual({});
    expect(stats.hourlyStats).toEqual([]);
    expect(stats.dailyWinRate).toEqual([]);
    expect(stats.dailyPnl).toEqual([]);
  });

  it('allows populated distribution fields', () => {
    const stats: AggregatedStats = makeStats({
      totalTrades: 10,
      wins: 6,
      losses: 3,
      breakeven: 1,
      symbolDistribution: {
        EURUSD: { count: 5, wins: 3, pnl: 500 },
        GBPUSD: { count: 5, wins: 3, pnl: 200 },
      },
      strategyDistribution: {
        Breakout: { count: 4, wins: 2, pnl: 300 },
      },
      sessionDistribution: {
        London: { count: 6, wins: 4, pnl: 400 },
      },
      outcomeDistribution: { TP: 6, SL: 3, BREAKEVEN: 1 },
    });

    expect(stats.totalTrades).toBe(10);
    expect(stats.symbolDistribution.EURUSD.count).toBe(5);
    expect(stats.strategyDistribution.Breakout.pnl).toBe(300);
    expect(stats.sessionDistribution.London.wins).toBe(4);
    expect(stats.outcomeDistribution.TP).toBe(6);
  });

  it('allows populated array fields', () => {
    const stats: AggregatedStats = makeStats({
      durationBuckets: [{ range: '< 1h', wins: 3, losses: 1, total: 4 }],
      hourlyStats: [{ hour: '10', trades: 5, wins: 3, pnl: 200, winRate: 60 }],
      dailyWinRate: [{ day: 'Mon', trades: 3, wins: 2, pnl: 100, winRate: 66.7 }],
      dailyPnl: [{ date: '2025-01-06', pnl: 100, cumulativePnl: 100 }],
    });

    expect(stats.durationBuckets).toHaveLength(1);
    expect(stats.durationBuckets[0].range).toBe('< 1h');
    expect(stats.hourlyStats[0].hour).toBe('10');
    expect(stats.dailyWinRate[0].day).toBe('Mon');
    expect(stats.dailyPnl[0].cumulativePnl).toBe(100);
  });

  it('allows optional equityCurve field', () => {
    const stats: AggregatedStats = makeStats({
      equityCurve: [
        { date: '2025-01-06', pnl: 100, cumulativePnl: 100, symbol: 'EURUSD' },
        { date: '2025-01-07', pnl: 50, cumulativePnl: 150, symbol: 'GBPUSD' },
      ],
    });

    expect(stats.equityCurve).toBeDefined();
    expect(stats.equityCurve).toHaveLength(2);
    expect(stats.equityCurve![0].symbol).toBe('EURUSD');
  });

  it('allows equityCurve to be undefined', () => {
    const stats: AggregatedStats = makeStats();
    expect(stats.equityCurve).toBeUndefined();
  });

  it('allows extra fields via index signature', () => {
    const stats: AggregatedStats = makeStats({
      marketConditionDistribution: { trending: 5, ranging: 3 },
      customMetric: 42,
    });

    expect(stats.marketConditionDistribution).toBeDefined();
    expect(stats.marketConditionDistribution).toEqual({ trending: 5, ranging: 3 });
    expect(stats.customMetric).toBe(42);
  });

  it('holds realistic stat values', () => {
    const stats: AggregatedStats = makeStats({
      totalTrades: 150,
      wins: 90,
      losses: 50,
      breakeven: 10,
      grossProfit: 25000,
      grossLoss: 12000,
      totalPnl: 13000,
      totalVolume: 300,
      winRate: 60,
      profitFactor: 2.08,
      avgWin: 277.78,
      avgLoss: 240,
      expectancy: 86.67,
      avgRiskReward: 1.5,
      bestTrade: 1200,
      worstTrade: -800,
      avgHoldingTime: 3.5,
      minDuration: 0.25,
      maxDuration: 48,
      consecutiveWins: 8,
      consecutiveLosses: 4,
      maxDrawdown: 12.5,
      sharpeRatio: 1.8,
    });

    expect(stats.winRate).toBe(60);
    expect(stats.profitFactor).toBeCloseTo(2.08, 2);
    expect(stats.sharpeRatio).toBe(1.8);
    expect(stats.maxDrawdown).toBe(12.5);
  });
});
