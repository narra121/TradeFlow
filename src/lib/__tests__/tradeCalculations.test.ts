import { describe, it, expect } from 'vitest';
import {
  getEligibleTrades,
  calculateTradeStats,
  calculateSymbolDistribution,
  calculateStrategyDistribution,
  calculateHourlyStats,
  calculateDailyWinRate,
  calculateTradeDurations,
  groupDurationsByRange,
  calculateCumulativePnL,
  calculateOutcomeDistribution,
  calculateSessionDistribution,
  formatDuration,
  formatCurrency,
  formatPercentage,
} from '../tradeCalculations';
import type { Trade } from '@/types/trade';

// ---------------------------------------------------------------------------
// Helpers to build Trade fixtures
// ---------------------------------------------------------------------------

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'id' in overrides ? overrides.id : 'trade-1',
    symbol: 'symbol' in overrides ? overrides.symbol : 'EURUSD',
    direction: 'direction' in overrides ? overrides.direction : 'LONG',
    entryPrice: 'entryPrice' in overrides ? overrides.entryPrice : 1.1,
    exitPrice: 'exitPrice' in overrides ? overrides.exitPrice : 1.12,
    stopLoss: 'stopLoss' in overrides ? overrides.stopLoss : 1.08,
    takeProfit: 'takeProfit' in overrides ? overrides.takeProfit : 1.14,
    size: 'size' in overrides ? overrides.size : 1,
    entryDate: 'entryDate' in overrides ? overrides.entryDate : '2025-01-06T10:00:00Z',
    exitDate: 'exitDate' in overrides ? overrides.exitDate : '2025-01-06T12:00:00Z',
    outcome: 'outcome' in overrides ? overrides.outcome : 'TP',
    pnl: 'pnl' in overrides ? overrides.pnl : 100,
    riskRewardRatio: 'riskRewardRatio' in overrides ? overrides.riskRewardRatio : 2,
    accountId: 'accountId' in overrides ? overrides.accountId : 'acct-1',
    ...('strategy' in overrides ? { strategy: overrides.strategy } : {}),
    ...('session' in overrides ? { session: overrides.session } : {}),
    ...('brokenRuleIds' in overrides ? { brokenRuleIds: overrides.brokenRuleIds } : {}),
  } as Trade;
}

// ---------------------------------------------------------------------------
// getEligibleTrades
// ---------------------------------------------------------------------------

describe('getEligibleTrades', () => {
  it('returns empty array for empty input', () => {
    expect(getEligibleTrades([])).toEqual([]);
  });

  it('keeps trades with valid accountId', () => {
    const trades = [makeTrade({ accountId: 'acct-1' })];
    expect(getEligibleTrades(trades)).toHaveLength(1);
  });

  it('filters out trades with accountId "-1"', () => {
    const trades = [
      makeTrade({ id: '1', accountId: 'acct-1' }),
      makeTrade({ id: '2', accountId: '-1' }),
    ];
    const result = getEligibleTrades(trades);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters out trades with accountId " -1 " (whitespace)', () => {
    const trades = [makeTrade({ accountId: ' -1 ' })];
    expect(getEligibleTrades(trades)).toHaveLength(0);
  });

  it('filters out trades with no accountId (undefined)', () => {
    const trades = [makeTrade({ accountId: undefined })];
    expect(getEligibleTrades(trades)).toHaveLength(0);
  });

  it('filters out trades with empty string accountId', () => {
    const trades = [makeTrade({ accountId: '' })];
    expect(getEligibleTrades(trades)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// calculateTradeStats
// ---------------------------------------------------------------------------

describe('calculateTradeStats', () => {
  it('returns all zeros for empty array', () => {
    const stats = calculateTradeStats([]);
    expect(stats.totalPnl).toBe(0);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.breakeven).toBe(0);
    expect(stats.profitFactor).toBe(0);
    expect(stats.maxDrawdown).toBe(0);
    expect(stats.expectancy).toBe(0);
    expect(stats.sharpeRatio).toBe(0);
    expect(stats.avgHoldingTime).toBe(0);
    expect(stats.totalVolume).toBe(0);
  });

  it('returns zeros when all trades are ineligible', () => {
    const trades = [makeTrade({ accountId: '-1', pnl: 500 })];
    const stats = calculateTradeStats(trades);
    expect(stats.totalTrades).toBe(0);
    expect(stats.totalPnl).toBe(0);
  });

  it('calculates stats for a single winning trade', () => {
    const trades = [makeTrade({ pnl: 200, size: 2 })];
    const stats = calculateTradeStats(trades);
    expect(stats.totalTrades).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.totalPnl).toBe(200);
    expect(stats.winRate).toBe(100);
    expect(stats.avgWin).toBe(200);
    expect(stats.avgLoss).toBe(0);
    expect(stats.grossProfit).toBe(200);
    expect(stats.grossLoss).toBe(0);
    expect(stats.bestTrade).toBe(200);
    expect(stats.worstTrade).toBe(200);
    expect(stats.expectancy).toBe(200);
    expect(stats.totalVolume).toBe(2);
  });

  it('calculates stats for a single losing trade', () => {
    const trades = [makeTrade({ pnl: -150, outcome: 'SL' })];
    const stats = calculateTradeStats(trades);
    expect(stats.totalTrades).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(1);
    expect(stats.totalPnl).toBe(-150);
    expect(stats.winRate).toBe(0);
    expect(stats.avgLoss).toBe(150); // absolute value
    expect(stats.grossLoss).toBe(150);
  });

  it('calculates stats for mixed wins, losses, breakeven', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 300, exitDate: '2025-01-06T12:00:00Z' }),
      makeTrade({ id: '2', pnl: -100, exitDate: '2025-01-06T13:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '3', pnl: 0, exitDate: '2025-01-06T14:00:00Z', outcome: 'BREAKEVEN' }),
      makeTrade({ id: '4', pnl: 200, exitDate: '2025-01-06T15:00:00Z' }),
      makeTrade({ id: '5', pnl: -50, exitDate: '2025-01-06T16:00:00Z', outcome: 'SL' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.totalTrades).toBe(5);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(2);
    expect(stats.breakeven).toBe(1);
    expect(stats.totalPnl).toBe(350);
    expect(stats.winRate).toBe(40); // 2/5
    expect(stats.avgWin).toBe(250); // (300+200)/2
    expect(stats.avgLoss).toBe(75); // (100+50)/2
    expect(stats.grossProfit).toBe(500);
    expect(stats.grossLoss).toBe(150);
    expect(stats.bestTrade).toBe(300);
    expect(stats.worstTrade).toBe(-100);
  });

  it('returns Infinity profitFactor when zero losses', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100 }),
      makeTrade({ id: '2', pnl: 200 }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.profitFactor).toBe(Infinity);
  });

  it('returns 0 profitFactor when zero wins and zero losses (all breakeven)', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 0, outcome: 'BREAKEVEN' }),
      makeTrade({ id: '2', pnl: 0, outcome: 'BREAKEVEN' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.profitFactor).toBe(0);
  });

  it('calculates profitFactor correctly with wins and losses', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 400 }),
      makeTrade({ id: '2', pnl: -200, outcome: 'SL' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.profitFactor).toBe(2); // 400 / 200
  });

  it('calculates consecutive wins correctly', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-01-06T10:00:00Z' }),
      makeTrade({ id: '2', pnl: 200, exitDate: '2025-01-06T11:00:00Z' }),
      makeTrade({ id: '3', pnl: 50, exitDate: '2025-01-06T12:00:00Z' }),
      makeTrade({ id: '4', pnl: -30, exitDate: '2025-01-06T13:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '5', pnl: 80, exitDate: '2025-01-06T14:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.consecutiveWins).toBe(3);
    expect(stats.consecutiveLosses).toBe(1);
  });

  it('calculates consecutive losses correctly', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-01-06T10:00:00Z' }),
      makeTrade({ id: '2', pnl: -50, exitDate: '2025-01-06T11:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '3', pnl: -75, exitDate: '2025-01-06T12:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '4', pnl: -20, exitDate: '2025-01-06T13:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '5', pnl: -10, exitDate: '2025-01-06T14:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '6', pnl: 200, exitDate: '2025-01-06T15:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.consecutiveLosses).toBe(4);
    expect(stats.consecutiveWins).toBe(1);
  });

  it('calculates maxDrawdown without totalCapital', () => {
    // Sequence: +100, -200, +50
    // Running PnL: 100, -100, -50
    // minRunningPnl = -100, startingEquity = 101
    // equity: 201, 1, 51
    // peak:   201, 201, 201
    // drawdown at trade 2: (201-1)/201 * 100 ~= 99.5%
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-01-06T10:00:00Z' }),
      makeTrade({ id: '2', pnl: -200, exitDate: '2025-01-06T11:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '3', pnl: 50, exitDate: '2025-01-06T12:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.maxDrawdown).toBeGreaterThan(0);
    // peak equity = 201, lowest = 1, drawdown = (201-1)/201*100 ≈ 99.5%
    expect(stats.maxDrawdown).toBeCloseTo(99.5, 0);
  });

  it('calculates maxDrawdown with totalCapital', () => {
    // totalCapital = 10000
    // Sequence: +500, -1500, +300
    // equity: 10500, 9000, 9300
    // peak:   10500, 10500, 10500
    // drawdown at trade 2: (10500-9000)/10000 * 100 = 15%
    const trades = [
      makeTrade({ id: '1', pnl: 500, exitDate: '2025-01-06T10:00:00Z' }),
      makeTrade({ id: '2', pnl: -1500, exitDate: '2025-01-06T11:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '3', pnl: 300, exitDate: '2025-01-06T12:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades, 10000);
    expect(stats.maxDrawdown).toBeCloseTo(15, 1);
  });

  it('calculates maxDrawdown = 0 for all-winning trades', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-01-06T10:00:00Z' }),
      makeTrade({ id: '2', pnl: 200, exitDate: '2025-01-06T11:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.maxDrawdown).toBe(0);
  });

  it('calculates sharpeRatio = 0 when all pnl are equal', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-01-06T10:00:00Z' }),
      makeTrade({ id: '2', pnl: 100, exitDate: '2025-01-06T11:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades);
    // stdDev = 0, sharpe = 0
    expect(stats.sharpeRatio).toBe(0);
  });

  it('calculates sharpeRatio > 0 for positive expectancy with variance', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 300, exitDate: '2025-01-06T10:00:00Z' }),
      makeTrade({ id: '2', pnl: -100, exitDate: '2025-01-06T11:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '3', pnl: 200, exitDate: '2025-01-06T12:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.sharpeRatio).toBeGreaterThan(0);
  });

  it('calculates avgHoldingTime in hours', () => {
    // 2 hours each
    const trades = [
      makeTrade({
        id: '1',
        entryDate: '2025-01-06T10:00:00Z',
        exitDate: '2025-01-06T12:00:00Z',
      }),
      makeTrade({
        id: '2',
        entryDate: '2025-01-06T14:00:00Z',
        exitDate: '2025-01-06T18:00:00Z',
      }),
    ];
    const stats = calculateTradeStats(trades);
    // (2+4)/2 = 3 hours
    expect(stats.avgHoldingTime).toBe(3);
  });

  it('calculates avgRiskReward from provided riskRewardRatio values', () => {
    const trades = [
      makeTrade({ id: '1', riskRewardRatio: 2 }),
      makeTrade({ id: '2', riskRewardRatio: 4 }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.avgRiskReward).toBe(3); // (2+4)/2
  });

  it('falls back to avgWin/avgLoss for avgRiskReward when no riskRewardRatio', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 200, riskRewardRatio: 0 }),
      makeTrade({ id: '2', pnl: -100, riskRewardRatio: 0, outcome: 'SL' }),
    ];
    const stats = calculateTradeStats(trades);
    // avgWin = 200, avgLoss = 100, ratio = 2
    expect(stats.avgRiskReward).toBe(2);
  });

  it('handles all-loss scenario', () => {
    const trades = [
      makeTrade({ id: '1', pnl: -100, exitDate: '2025-01-06T10:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '2', pnl: -200, exitDate: '2025-01-06T11:00:00Z', outcome: 'SL' }),
    ];
    const stats = calculateTradeStats(trades);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(2);
    expect(stats.winRate).toBe(0);
    expect(stats.profitFactor).toBe(0);
    expect(stats.totalPnl).toBe(-300);
    expect(stats.consecutiveWins).toBe(0);
    expect(stats.consecutiveLosses).toBe(2);
  });

  it('sorts trades chronologically by exitDate for streak calculation', () => {
    // Out of order - should be reordered by exitDate
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-01-06T15:00:00Z' }),
      makeTrade({ id: '2', pnl: -50, exitDate: '2025-01-06T10:00:00Z', outcome: 'SL' }),
      makeTrade({ id: '3', pnl: 200, exitDate: '2025-01-06T12:00:00Z' }),
      makeTrade({ id: '4', pnl: 150, exitDate: '2025-01-06T14:00:00Z' }),
    ];
    const stats = calculateTradeStats(trades);
    // Sorted order: trade2(-50), trade3(+200), trade4(+150), trade1(+100)
    // Streaks: L, W, W, W -> consecutiveWins = 3
    expect(stats.consecutiveWins).toBe(3);
    expect(stats.consecutiveLosses).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// calculateSymbolDistribution
// ---------------------------------------------------------------------------

describe('calculateSymbolDistribution', () => {
  it('returns empty object for empty array', () => {
    expect(calculateSymbolDistribution([])).toEqual({});
  });

  it('counts trades per symbol', () => {
    const trades = [
      makeTrade({ id: '1', symbol: 'EURUSD' }),
      makeTrade({ id: '2', symbol: 'GBPUSD' }),
      makeTrade({ id: '3', symbol: 'EURUSD' }),
    ];
    const dist = calculateSymbolDistribution(trades);
    expect(dist).toEqual({ EURUSD: 2, GBPUSD: 1 });
  });

  it('excludes ineligible trades', () => {
    const trades = [
      makeTrade({ id: '1', symbol: 'EURUSD', accountId: '-1' }),
      makeTrade({ id: '2', symbol: 'GBPUSD', accountId: 'acct-1' }),
    ];
    const dist = calculateSymbolDistribution(trades);
    expect(dist).toEqual({ GBPUSD: 1 });
  });
});

// ---------------------------------------------------------------------------
// calculateStrategyDistribution
// ---------------------------------------------------------------------------

describe('calculateStrategyDistribution', () => {
  it('returns empty object for empty array', () => {
    expect(calculateStrategyDistribution([])).toEqual({});
  });

  it('counts trades per strategy', () => {
    const trades = [
      makeTrade({ id: '1', strategy: 'Breakout' }),
      makeTrade({ id: '2', strategy: 'Scalp' }),
      makeTrade({ id: '3', strategy: 'Breakout' }),
    ];
    const dist = calculateStrategyDistribution(trades);
    expect(dist).toEqual({ Breakout: 2, Scalp: 1 });
  });

  it('uses "Unknown" when strategy is missing', () => {
    const trades = [makeTrade({ id: '1' })]; // no strategy set
    const dist = calculateStrategyDistribution(trades);
    expect(dist).toEqual({ Unknown: 1 });
  });
});

// ---------------------------------------------------------------------------
// calculateHourlyStats
// ---------------------------------------------------------------------------

describe('calculateHourlyStats', () => {
  it('returns 24 entries for empty array', () => {
    const result = calculateHourlyStats([]);
    expect(result).toHaveLength(24);
    result.forEach((entry) => {
      expect(entry.trades).toBe(0);
      expect(entry.winRate).toBe(0);
      expect(entry.pnl).toBe(0);
    });
  });

  it('counts trade in correct hour bucket', () => {
    // 10:00 UTC -> hour 10 (getHours uses local time, but for UTC strings this is UTC)
    // Use a fixed local-parseable date
    const trades = [
      makeTrade({ id: '1', entryDate: '2025-01-06T10:00:00', pnl: 100 }),
    ];
    const result = calculateHourlyStats(trades);
    const hour10 = result.find((e) => e.hour === '10');
    expect(hour10?.trades).toBe(1);
    expect(hour10?.winRate).toBe(100);
    expect(hour10?.pnl).toBe(100);
  });

  it('calculates winRate per hour correctly', () => {
    const trades = [
      makeTrade({ id: '1', entryDate: '2025-01-06T10:00:00', pnl: 100 }),
      makeTrade({ id: '2', entryDate: '2025-01-06T10:30:00', pnl: -50, outcome: 'SL' }),
    ];
    const result = calculateHourlyStats(trades);
    const hour10 = result.find((e) => e.hour === '10');
    expect(hour10?.trades).toBe(2);
    expect(hour10?.winRate).toBe(50);
    expect(hour10?.pnl).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// calculateDailyWinRate
// ---------------------------------------------------------------------------

describe('calculateDailyWinRate', () => {
  it('returns 7 entries for empty array', () => {
    const result = calculateDailyWinRate([]);
    expect(result).toHaveLength(7);
    expect(result[0].day).toBe('Sun');
    expect(result[6].day).toBe('Sat');
  });

  it('assigns trades to the correct day of week', () => {
    // 2025-01-06 is a Monday
    const trades = [
      makeTrade({ id: '1', entryDate: '2025-01-06T10:00:00', pnl: 100 }),
    ];
    const result = calculateDailyWinRate(trades);
    const monday = result.find((e) => e.day === 'Mon');
    expect(monday?.trades).toBe(1);
    expect(monday?.winRate).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calculateTradeDurations
// ---------------------------------------------------------------------------

describe('calculateTradeDurations', () => {
  it('returns zeros for empty array', () => {
    const result = calculateTradeDurations([]);
    expect(result.durations).toEqual([]);
    expect(result.maxDuration).toBe(0);
    expect(result.minDuration).toBe(0);
    expect(result.avgDuration).toBe(0);
    expect(result.medianDuration).toBe(0);
  });

  it('calculates duration in hours', () => {
    const trades = [
      makeTrade({
        id: '1',
        entryDate: '2025-01-06T10:00:00Z',
        exitDate: '2025-01-06T13:00:00Z',
        pnl: 100,
      }),
    ];
    const result = calculateTradeDurations(trades);
    expect(result.durations).toHaveLength(1);
    expect(result.durations[0].duration).toBe(3);
    expect(result.maxDuration).toBe(3);
    expect(result.minDuration).toBe(3);
    expect(result.avgDuration).toBe(3);
    expect(result.medianDuration).toBe(3);
  });

  it('calculates max, min, avg, median for multiple trades', () => {
    const trades = [
      makeTrade({ id: '1', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T11:00:00Z', pnl: 100 }), // 1h
      makeTrade({ id: '2', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T14:00:00Z', pnl: -50, outcome: 'SL' }), // 4h
      makeTrade({ id: '3', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T12:00:00Z', pnl: 200 }), // 2h
    ];
    const result = calculateTradeDurations(trades);
    expect(result.maxDuration).toBe(4);
    expect(result.minDuration).toBe(1);
    expect(result.avgDuration).toBeCloseTo(7 / 3, 5);
    // sorted: [1, 2, 4], median = index 1 = 2
    expect(result.medianDuration).toBe(2);
  });

  it('skips trades without exitDate', () => {
    const trades = [
      makeTrade({ id: '1', exitDate: undefined, pnl: 100 }),
    ];
    const result = calculateTradeDurations(trades);
    expect(result.durations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// groupDurationsByRange
// ---------------------------------------------------------------------------

describe('groupDurationsByRange', () => {
  it('returns empty array for empty trades', () => {
    const result = groupDurationsByRange([]);
    expect(result).toEqual([]);
  });

  it('groups trades into correct duration ranges', () => {
    const trades = [
      makeTrade({ id: '1', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T10:30:00Z', pnl: 100 }), // 0.5h -> <1h
      makeTrade({ id: '2', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T12:00:00Z', pnl: -50, outcome: 'SL' }), // 2h -> 1-4h
      makeTrade({ id: '3', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T16:00:00Z', pnl: 200 }), // 6h -> 4-8h
      makeTrade({ id: '4', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T22:00:00Z', pnl: 150 }), // 12h -> 8-24h
      makeTrade({ id: '5', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-08T10:00:00Z', pnl: -100, outcome: 'SL' }), // 48h -> >24h
    ];
    const result = groupDurationsByRange(trades);
    expect(result).toHaveLength(5);

    const lessThan1h = result.find((r) => r.range === '< 1h');
    expect(lessThan1h?.total).toBe(1);
    expect(lessThan1h?.wins).toBe(1);
    expect(lessThan1h?.losses).toBe(0);

    const range1to4 = result.find((r) => r.range === '1-4h');
    expect(range1to4?.total).toBe(1);
    expect(range1to4?.wins).toBe(0);
    expect(range1to4?.losses).toBe(1);

    const over24h = result.find((r) => r.range === '> 24h');
    expect(over24h?.total).toBe(1);
  });

  it('omits ranges with zero trades', () => {
    const trades = [
      makeTrade({ id: '1', entryDate: '2025-01-06T10:00:00Z', exitDate: '2025-01-06T10:30:00Z', pnl: 100 }), // <1h only
    ];
    const result = groupDurationsByRange(trades);
    expect(result).toHaveLength(1);
    expect(result[0].range).toBe('< 1h');
  });
});

// ---------------------------------------------------------------------------
// calculateCumulativePnL
// ---------------------------------------------------------------------------

describe('calculateCumulativePnL', () => {
  it('returns empty array for empty input', () => {
    expect(calculateCumulativePnL([])).toEqual([]);
  });

  it('calculates running PnL', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-01-06T10:00:00Z', symbol: 'EURUSD' }),
      makeTrade({ id: '2', pnl: -50, exitDate: '2025-01-06T11:00:00Z', symbol: 'GBPUSD', outcome: 'SL' }),
      makeTrade({ id: '3', pnl: 200, exitDate: '2025-01-06T12:00:00Z', symbol: 'EURUSD' }),
    ];
    const result = calculateCumulativePnL(trades);
    expect(result).toHaveLength(3);
    expect(result[0].cumulativePnl).toBe(100);
    expect(result[1].cumulativePnl).toBe(50);
    expect(result[2].cumulativePnl).toBe(250);
  });

  it('sorts by exitDate', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 200, exitDate: '2025-01-06T15:00:00Z', symbol: 'A' }),
      makeTrade({ id: '2', pnl: 100, exitDate: '2025-01-06T10:00:00Z', symbol: 'B' }),
    ];
    const result = calculateCumulativePnL(trades);
    expect(result[0].symbol).toBe('B');
    expect(result[0].cumulativePnl).toBe(100);
    expect(result[1].symbol).toBe('A');
    expect(result[1].cumulativePnl).toBe(300);
  });

  it('excludes ineligible trades', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, accountId: '-1' }),
      makeTrade({ id: '2', pnl: 200, accountId: 'acct-1', exitDate: '2025-01-06T10:00:00Z' }),
    ];
    const result = calculateCumulativePnL(trades);
    expect(result).toHaveLength(1);
    expect(result[0].cumulativePnl).toBe(200);
  });

  it('uses entryDate when exitDate is missing', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, entryDate: '2025-01-06T10:00:00Z', exitDate: undefined }),
    ];
    const result = calculateCumulativePnL(trades);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2025-01-06T10:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// calculateOutcomeDistribution
// ---------------------------------------------------------------------------

describe('calculateOutcomeDistribution', () => {
  it('returns empty array for empty input', () => {
    expect(calculateOutcomeDistribution([])).toEqual([]);
  });

  it('counts outcomes with percentages', () => {
    const trades = [
      makeTrade({ id: '1', outcome: 'TP' }),
      makeTrade({ id: '2', outcome: 'SL' }),
      makeTrade({ id: '3', outcome: 'TP' }),
      makeTrade({ id: '4', outcome: 'BREAKEVEN' }),
    ];
    const result = calculateOutcomeDistribution(trades);
    const tp = result.find((r) => r.outcome === 'TP');
    expect(tp?.count).toBe(2);
    expect(tp?.percentage).toBe(50);

    const sl = result.find((r) => r.outcome === 'SL');
    expect(sl?.count).toBe(1);
    expect(sl?.percentage).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// calculateSessionDistribution
// ---------------------------------------------------------------------------

describe('calculateSessionDistribution', () => {
  it('returns empty array for empty input', () => {
    expect(calculateSessionDistribution([])).toEqual([]);
  });

  it('counts sessions with percentages', () => {
    const trades = [
      makeTrade({ id: '1', session: 'London' }),
      makeTrade({ id: '2', session: 'New York' }),
      makeTrade({ id: '3', session: 'London' }),
    ];
    const result = calculateSessionDistribution(trades);
    const london = result.find((r) => r.session === 'London');
    expect(london?.count).toBe(2);
    expect(london?.percentage).toBeCloseTo(66.67, 0);

    const ny = result.find((r) => r.session === 'New York');
    expect(ny?.count).toBe(1);
  });

  it('uses "Unknown" for trades without session', () => {
    const trades = [makeTrade({ id: '1' })]; // no session set
    const result = calculateSessionDistribution(trades);
    expect(result).toHaveLength(1);
    expect(result[0].session).toBe('Unknown');
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  it('formats sub-hour as minutes', () => {
    expect(formatDuration(0.5)).toBe('30m');
  });

  it('formats 0 hours as 0m', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats exactly 1 hour', () => {
    expect(formatDuration(1)).toBe('1.0h');
  });

  it('formats hours < 24', () => {
    expect(formatDuration(5.5)).toBe('5.5h');
  });

  it('formats 24+ hours as days', () => {
    expect(formatDuration(24)).toBe('1.0d');
  });

  it('formats 48 hours as 2.0d', () => {
    expect(formatDuration(48)).toBe('2.0d');
  });

  it('formats 36 hours as 1.5d', () => {
    expect(formatDuration(36)).toBe('1.5d');
  });

  it('formats fractional minutes (0.25h = 15m)', () => {
    expect(formatDuration(0.25)).toBe('15m');
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats with default 2 decimals', () => {
    expect(formatCurrency(123.456)).toBe('123.46');
  });

  it('formats with 0 decimals', () => {
    expect(formatCurrency(123.456, 0)).toBe('123');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-99.9, 1)).toBe('-99.9');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('formats large numbers', () => {
    expect(formatCurrency(1234567.89)).toBe('1234567.89');
  });
});

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------

describe('formatPercentage', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercentage(75.456)).toBe('75.5%');
  });

  it('formats with 0 decimals', () => {
    expect(formatPercentage(75.456, 0)).toBe('75%');
  });

  it('formats 100%', () => {
    expect(formatPercentage(100)).toBe('100.0%');
  });

  it('formats 0%', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('formats negative percentage', () => {
    expect(formatPercentage(-5.5)).toBe('-5.5%');
  });

  it('formats with 3 decimals', () => {
    expect(formatPercentage(33.3333, 3)).toBe('33.333%');
  });
});
