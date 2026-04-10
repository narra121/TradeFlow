import { describe, it, expect } from 'vitest';
import {
  getEligibleTrades,
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

  it('keeps multiple trades with different valid accountIds', () => {
    const trades = [
      makeTrade({ id: '1', accountId: 'acct-1' }),
      makeTrade({ id: '2', accountId: 'acct-2' }),
      makeTrade({ id: '3', accountId: 'acct-3' }),
    ];
    expect(getEligibleTrades(trades)).toHaveLength(3);
  });

  it('filters mixed eligible and ineligible trades', () => {
    const trades = [
      makeTrade({ id: '1', accountId: 'acct-1' }),
      makeTrade({ id: '2', accountId: '-1' }),
      makeTrade({ id: '3', accountId: undefined }),
      makeTrade({ id: '4', accountId: 'acct-2' }),
      makeTrade({ id: '5', accountId: '' }),
    ];
    const result = getEligibleTrades(trades);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '4']);
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
    expect(formatDuration(4.5)).toBe('4.5h');
  });

  it('formats hours between 1 and 24', () => {
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
    expect(formatCurrency(123.4, 0)).toBe('123');
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
    expect(formatPercentage(75.567)).toBe('75.6%');
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

// ---------------------------------------------------------------------------
// Extended: getEligibleTrades – additional scenarios
// ---------------------------------------------------------------------------

describe('getEligibleTrades – extended', () => {
  it('returns empty array for single ineligible trade', () => {
    const trades = [makeTrade({ accountId: '-1' })];
    expect(getEligibleTrades(trades)).toEqual([]);
  });

  it('preserves order of eligible trades', () => {
    const trades = [
      makeTrade({ id: 'a', accountId: 'acct-1' }),
      makeTrade({ id: 'b', accountId: 'acct-2' }),
      makeTrade({ id: 'c', accountId: 'acct-3' }),
    ];
    const result = getEligibleTrades(trades);
    expect(result.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps trade with whitespace-only accountId (truthy and not "-1")', () => {
    // '   ' is truthy; trim() yields '' which is !== '-1', so it passes the filter
    const trades = [makeTrade({ accountId: '   ' })];
    expect(getEligibleTrades(trades)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Extended: formatDuration – additional scenarios
// ---------------------------------------------------------------------------

describe('formatDuration – extended', () => {
  it('formats very small fraction (0.01h = ~1m)', () => {
    expect(formatDuration(0.01)).toBe('1m');
  });

  it('formats 0.99h as minutes', () => {
    // 0.99 < 1 so should use minutes path
    expect(formatDuration(0.99)).toBe('59m');
  });

  it('formats exactly 23.9 hours', () => {
    expect(formatDuration(23.9)).toBe('23.9h');
  });

  it('formats 72 hours as 3.0d', () => {
    expect(formatDuration(72)).toBe('3.0d');
  });
});

// ---------------------------------------------------------------------------
// Extended: formatCurrency – additional scenarios
// ---------------------------------------------------------------------------

describe('formatCurrency – extended', () => {
  it('formats with 4 decimals', () => {
    expect(formatCurrency(1.23456, 4)).toBe('1.2346');
  });

  it('formats very small positive number', () => {
    expect(formatCurrency(0.001)).toBe('0.00');
  });

  it('formats negative zero', () => {
    expect(formatCurrency(-0)).toBe('0.00');
  });
});

// ---------------------------------------------------------------------------
// Extended: formatPercentage – additional scenarios
// ---------------------------------------------------------------------------

describe('formatPercentage – extended', () => {
  it('formats very large percentage', () => {
    expect(formatPercentage(999.99)).toBe('1000.0%');
  });

  it('formats very small positive percentage', () => {
    expect(formatPercentage(0.04)).toBe('0.0%');
  });

  it('formats with 2 decimals', () => {
    // 50.555.toFixed(2) = '50.55' due to IEEE 754 floating-point representation
    expect(formatPercentage(50.555, 2)).toBe('50.55%');
  });
});

// ---------------------------------------------------------------------------
// Extended: trade edge cases (pnl, size, single trade, etc.)
// ---------------------------------------------------------------------------

describe('getEligibleTrades – pnl and size edge cases', () => {
  it('includes trade with undefined pnl (filtering is by accountId only)', () => {
    const trades = [makeTrade({ id: '1', accountId: 'acct-1', pnl: undefined })];
    const result = getEligibleTrades(trades);
    expect(result).toHaveLength(1);
    expect(result[0].pnl).toBeUndefined();
  });

  it('includes trade with zero size (filtering is by accountId only)', () => {
    const trades = [makeTrade({ id: '1', accountId: 'acct-1', size: 0 })];
    const result = getEligibleTrades(trades);
    expect(result).toHaveLength(1);
    expect(result[0].size).toBe(0);
  });

  it('handles single trade scenario', () => {
    const trades = [makeTrade({ id: 'only', accountId: 'acct-1', pnl: 42 })];
    const result = getEligibleTrades(trades);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('only');
  });

  it('handles all trades with the same accountId', () => {
    const trades = Array.from({ length: 5 }, (_, i) =>
      makeTrade({ id: `t-${i}`, accountId: 'same-acct' }),
    );
    const result = getEligibleTrades(trades);
    expect(result).toHaveLength(5);
  });

  it('handles large batch of trades', () => {
    const trades = Array.from({ length: 1000 }, (_, i) =>
      makeTrade({ id: `t-${i}`, accountId: i % 3 === 0 ? '-1' : `acct-${i}` }),
    );
    const result = getEligibleTrades(trades);
    // Every 3rd trade (i % 3 === 0) is ineligible: indices 0,3,6,...,999 => 334 ineligible
    expect(result).toHaveLength(1000 - 334);
  });
});
