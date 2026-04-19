import { describe, it, expect } from 'vitest';
import { trimTrades } from '../trades';
import type { Trade } from '@/types/trade';

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-1',
  symbol: 'AAPL',
  direction: 'LONG',
  entryPrice: 150,
  exitPrice: 155,
  stopLoss: 148,
  takeProfit: 160,
  size: 100,
  entryDate: '2026-04-10T09:30:00Z',
  exitDate: '2026-04-10T15:00:00Z',
  outcome: 'TP',
  pnl: 500,
  riskRewardRatio: 2.5,
  ...overrides,
});

describe('trimTrades', () => {
  it('maps Trade fields to TrimmedTrade fields correctly', () => {
    const trade = makeTrade({
      id: 'trade-42',
      symbol: 'EURUSD',
      direction: 'SHORT',
      entryDate: '2026-04-01T10:00:00Z',
      exitDate: '2026-04-01T14:00:00Z',
      pnl: -200,
      size: 50,
      accountId: 'acc-1',
      tags: ['scalp', 'news'],
      brokenRuleIds: ['rule-1'],
      mistakes: ['Over-leveraged'],
      keyLesson: 'Wait for confirmation',
    });

    const result = trimTrades([trade]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      tradeId: 'trade-42',
      symbol: 'EURUSD',
      side: 'SHORT',
      openDate: '2026-04-01T10:00:00Z',
      closeDate: '2026-04-01T14:00:00Z',
      pnl: -200,
      volume: 50,
      accountId: 'acc-1',
      tags: ['scalp', 'news'],
      brokenRules: ['rule-1'],
      mistakes: ['Over-leveraged'],
      lessons: ['Wait for confirmation'],
    });
  });

  it('limits output to MAX_TRADES (2000)', () => {
    const trades = Array.from({ length: 2500 }, (_, i) =>
      makeTrade({ id: `trade-${i}` }),
    );

    const result = trimTrades(trades);

    expect(result).toHaveLength(2000);
    expect(result[0].tradeId).toBe('trade-0');
    expect(result[1999].tradeId).toBe('trade-1999');
  });

  it('handles empty array', () => {
    const result = trimTrades([]);
    expect(result).toEqual([]);
  });

  it('handles undefined optional fields', () => {
    const trade = makeTrade({
      tags: undefined,
      brokenRuleIds: undefined,
      mistakes: undefined,
      keyLesson: undefined,
      accountId: undefined,
    });

    const result = trimTrades([trade]);

    expect(result[0].tags).toBeUndefined();
    expect(result[0].brokenRules).toBeUndefined();
    expect(result[0].mistakes).toBeUndefined();
    expect(result[0].lessons).toBeUndefined();
    expect(result[0].accountId).toBeUndefined();
  });

  it('wraps keyLesson in array for lessons field', () => {
    const trade = makeTrade({ keyLesson: 'Always use stop loss' });
    const result = trimTrades([trade]);
    expect(result[0].lessons).toEqual(['Always use stop loss']);
  });

  it('produces undefined lessons when keyLesson is undefined', () => {
    const trade = makeTrade({ keyLesson: undefined });
    const result = trimTrades([trade]);
    expect(result[0].lessons).toBeUndefined();
  });
});
