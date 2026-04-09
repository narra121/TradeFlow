import { describe, it, expect } from 'vitest';
import {
  calculateGoalProgressForAccount,
  calculateBrokenRulesCounts,
  getCurrentPeriodRange,
  hasCurrentPeriodData,
} from '../goalCalculations';
import type { Trade } from '@/types/trade';

// ---------------------------------------------------------------------------
// Helpers
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
    entryDate: 'entryDate' in overrides ? overrides.entryDate : '2025-03-10T10:00:00Z',
    exitDate: 'exitDate' in overrides ? overrides.exitDate : '2025-03-10T12:00:00Z',
    outcome: 'outcome' in overrides ? overrides.outcome : 'TP',
    pnl: 'pnl' in overrides ? overrides.pnl : 100,
    riskRewardRatio: 'riskRewardRatio' in overrides ? overrides.riskRewardRatio : 2,
    accountId: 'accountId' in overrides ? overrides.accountId : 'acct-1',
    ...('strategy' in overrides ? { strategy: overrides.strategy } : {}),
    ...('session' in overrides ? { session: overrides.session } : {}),
    ...('brokenRuleIds' in overrides ? { brokenRuleIds: overrides.brokenRuleIds } : {}),
  } as Trade;
}

// Fixed date range for deterministic tests (March 10-16, 2025 — a full week Mon-Sun)
const FIXED_RANGE = {
  start: new Date('2025-03-10T00:00:00'),
  end: new Date('2025-03-16T23:59:59'),
};

const DEFAULT_TARGETS = {
  profit: 1000,
  winRate: 60,
  maxDrawdown: 10,
  maxTrades: 20,
};

// ---------------------------------------------------------------------------
// calculateGoalProgressForAccount
// ---------------------------------------------------------------------------

describe('calculateGoalProgressForAccount', () => {
  it('returns zero progress for empty trades', () => {
    const result = calculateGoalProgressForAccount(
      [],
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(0);
    expect(result.profit.progress).toBe(0);
    expect(result.profit.achieved).toBe(false);
    expect(result.winRate.current).toBe(0);
    expect(result.tradeCount.current).toBe(0);
  });

  it('returns zero progress for undefined trades', () => {
    const result = calculateGoalProgressForAccount(
      undefined,
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(0);
    expect(result.tradeCount.current).toBe(0);
  });

  it('calculates profit goal progress', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 500, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', pnl: 300, exitDate: '2025-03-13T10:00:00' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(800);
    expect(result.profit.progress).toBe(80); // 800/1000 * 100
    expect(result.profit.achieved).toBe(false);
  });

  it('caps progress at 100 and marks as achieved', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 600, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', pnl: 500, exitDate: '2025-03-13T10:00:00' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(1100);
    expect(result.profit.progress).toBe(100); // capped
    expect(result.profit.achieved).toBe(true);
  });

  it('calculates win rate goal progress', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', pnl: 200, exitDate: '2025-03-13T10:00:00' }),
      makeTrade({ id: '3', pnl: -50, exitDate: '2025-03-14T10:00:00', outcome: 'SL' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      { ...DEFAULT_TARGETS, winRate: 60 },
      FIXED_RANGE,
    );
    // winRate = 2/3 * 100 = 66.67%
    expect(result.winRate.current).toBeCloseTo(66.67, 0);
    expect(result.winRate.achieved).toBe(true);
  });

  it('handles drawdown inverse goal (lower is better)', () => {
    // Trades: +200, -500 => peak = 200, drawdown = (200-(-300)) but actually:
    // running: 200, -300 => peak = 200, drawdown at t2 = (200-(-300))/200*100 = 250%
    // But target is 10%, so achieved = false (250 > 10)
    const trades = [
      makeTrade({ id: '1', pnl: 200, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', pnl: -500, exitDate: '2025-03-13T10:00:00', outcome: 'SL' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.maxDrawdown.achieved).toBe(false);
    expect(result.maxDrawdown.current).toBeGreaterThan(10);
  });

  it('marks drawdown as achieved when under target', () => {
    // All winning trades -> drawdown = 0
    const trades = [
      makeTrade({ id: '1', pnl: 100, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', pnl: 200, exitDate: '2025-03-13T10:00:00' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.maxDrawdown.current).toBe(0);
    expect(result.maxDrawdown.achieved).toBe(true);
  });

  it('handles trade count limit (inverse goal)', () => {
    const trades = Array.from({ length: 15 }, (_, i) =>
      makeTrade({ id: `t-${i}`, pnl: 50, exitDate: '2025-03-12T10:00:00' }),
    );
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      { ...DEFAULT_TARGETS, maxTrades: 20 },
      FIXED_RANGE,
    );
    expect(result.tradeCount.current).toBe(15);
    expect(result.tradeCount.progress).toBe(75); // 15/20 * 100
    expect(result.tradeCount.achieved).toBe(true); // 15 <= 20
  });

  it('marks trade count as not achieved when over limit', () => {
    const trades = Array.from({ length: 25 }, (_, i) =>
      makeTrade({ id: `t-${i}`, pnl: 50, exitDate: '2025-03-12T10:00:00' }),
    );
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      { ...DEFAULT_TARGETS, maxTrades: 20 },
      FIXED_RANGE,
    );
    expect(result.tradeCount.current).toBe(25);
    expect(result.tradeCount.progress).toBe(100); // capped at 100
    expect(result.tradeCount.achieved).toBe(false); // 25 > 20
  });

  it('filters by specific accountId', () => {
    const trades = [
      makeTrade({ id: '1', accountId: 'acct-1', pnl: 500, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', accountId: 'acct-2', pnl: 300, exitDate: '2025-03-13T10:00:00' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(500); // only acct-1
    expect(result.tradeCount.current).toBe(1);
  });

  it('includes all eligible trades when accountId is "ALL"', () => {
    const trades = [
      makeTrade({ id: '1', accountId: 'acct-1', pnl: 500, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', accountId: 'acct-2', pnl: 300, exitDate: '2025-03-13T10:00:00' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'ALL',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(800);
    expect(result.tradeCount.current).toBe(2);
  });

  it('excludes trades with accountId "-1"', () => {
    const trades = [
      makeTrade({ id: '1', accountId: '-1', pnl: 500, exitDate: '2025-03-12T10:00:00' }),
      makeTrade({ id: '2', accountId: 'acct-1', pnl: 200, exitDate: '2025-03-13T10:00:00' }),
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'ALL',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(200);
    expect(result.tradeCount.current).toBe(1);
  });

  it('excludes trades outside the date range', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 500, exitDate: '2025-03-12T10:00:00' }), // inside
      makeTrade({ id: '2', pnl: 300, exitDate: '2025-03-20T10:00:00' }), // outside
      makeTrade({ id: '3', pnl: 100, exitDate: '2025-03-09T10:00:00' }), // before
    ];
    const result = calculateGoalProgressForAccount(
      trades,
      'acct-1',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.profit.current).toBe(500);
    expect(result.tradeCount.current).toBe(1);
  });

  it('returns correct accountId in result', () => {
    const result = calculateGoalProgressForAccount(
      [],
      'my-account',
      'weekly',
      DEFAULT_TARGETS,
      FIXED_RANGE,
    );
    expect(result.accountId).toBe('my-account');
  });
});

// ---------------------------------------------------------------------------
// calculateBrokenRulesCounts
// ---------------------------------------------------------------------------

describe('calculateBrokenRulesCounts', () => {
  it('returns empty object for empty trades', () => {
    const result = calculateBrokenRulesCounts([], 'weekly', FIXED_RANGE);
    expect(result).toEqual({});
  });

  it('returns empty object for undefined trades', () => {
    const result = calculateBrokenRulesCounts(undefined, 'weekly', FIXED_RANGE);
    expect(result).toEqual({});
  });

  it('counts broken rules within date range', () => {
    const trades = [
      makeTrade({
        id: '1',
        entryDate: '2025-03-12T10:00:00',
        brokenRuleIds: ['rule-1', 'rule-2'],
      }),
      makeTrade({
        id: '2',
        entryDate: '2025-03-13T10:00:00',
        brokenRuleIds: ['rule-1', 'rule-3'],
      }),
    ];
    const result = calculateBrokenRulesCounts(trades, 'weekly', FIXED_RANGE);
    expect(result['rule-1']).toBe(2);
    expect(result['rule-2']).toBe(1);
    expect(result['rule-3']).toBe(1);
  });

  it('excludes trades outside date range', () => {
    const trades = [
      makeTrade({
        id: '1',
        entryDate: '2025-03-12T10:00:00',
        brokenRuleIds: ['rule-1'],
      }),
      makeTrade({
        id: '2',
        entryDate: '2025-03-25T10:00:00', // outside
        brokenRuleIds: ['rule-2'],
      }),
    ];
    const result = calculateBrokenRulesCounts(trades, 'weekly', FIXED_RANGE);
    expect(result['rule-1']).toBe(1);
    expect(result['rule-2']).toBeUndefined();
  });

  it('excludes ineligible trades (no accountId)', () => {
    const trades = [
      makeTrade({
        id: '1',
        accountId: '-1',
        entryDate: '2025-03-12T10:00:00',
        brokenRuleIds: ['rule-1'],
      }),
    ];
    const result = calculateBrokenRulesCounts(trades, 'weekly', FIXED_RANGE);
    expect(result).toEqual({});
  });

  it('handles trades with no brokenRuleIds', () => {
    const trades = [
      makeTrade({ id: '1', entryDate: '2025-03-12T10:00:00' }),
    ];
    const result = calculateBrokenRulesCounts(trades, 'weekly', FIXED_RANGE);
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getCurrentPeriodRange
// ---------------------------------------------------------------------------

describe('getCurrentPeriodRange', () => {
  it('returns start and end for weekly', () => {
    const range = getCurrentPeriodRange('weekly');
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
  });

  it('returns start and end for monthly', () => {
    const range = getCurrentPeriodRange('monthly');
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    // start should be 1st of month
    expect(range.start.getDate()).toBe(1);
  });

  it('weekly start is a Monday (weekStartsOn: 1)', () => {
    const range = getCurrentPeriodRange('weekly');
    expect(range.start.getDay()).toBe(1); // Monday
  });
});

// ---------------------------------------------------------------------------
// hasCurrentPeriodData
// ---------------------------------------------------------------------------

describe('hasCurrentPeriodData', () => {
  it('returns false for empty trades', () => {
    expect(hasCurrentPeriodData([], 'weekly')).toBe(false);
    expect(hasCurrentPeriodData([], 'monthly')).toBe(false);
  });

  it('returns true when a trade falls in the current week', () => {
    const now = new Date();
    const trades = [
      makeTrade({ id: '1', exitDate: now.toISOString() }),
    ];
    expect(hasCurrentPeriodData(trades, 'weekly')).toBe(true);
  });

  it('returns true when a trade falls in the current month', () => {
    const now = new Date();
    const trades = [
      makeTrade({ id: '1', exitDate: now.toISOString() }),
    ];
    expect(hasCurrentPeriodData(trades, 'monthly')).toBe(true);
  });

  it('returns false when trades are in a past period', () => {
    const trades = [
      makeTrade({ id: '1', exitDate: '2020-01-01T10:00:00Z' }),
    ];
    expect(hasCurrentPeriodData(trades, 'weekly')).toBe(false);
    expect(hasCurrentPeriodData(trades, 'monthly')).toBe(false);
  });

  it('uses entryDate when exitDate is missing', () => {
    const now = new Date();
    const trades = [
      makeTrade({ id: '1', entryDate: now.toISOString(), exitDate: undefined }),
    ];
    expect(hasCurrentPeriodData(trades, 'weekly')).toBe(true);
  });
});
