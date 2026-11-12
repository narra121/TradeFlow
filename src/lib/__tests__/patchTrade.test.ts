import { describe, expect, it } from 'vitest';
import { patchTradePayload } from '../patchTrade';
import type { Trade } from '@/types/trade';

const trade = { id: 't1', accountId: 'acc-1', pnl: 12.5, symbol: 'EURUSD' } as Trade;

describe('patchTradePayload', () => {
  it('adds the current account and P&L to a notes-only change', () => {
    expect(patchTradePayload(trade, { notes: 'hello' })).toEqual({ notes: 'hello', accountIds: ['acc-1'], pnl: 12.5 });
  });

  it('leaves the account out for a trade that has none', () => {
    const p = patchTradePayload({ ...trade, accountId: undefined } as Trade, { mistakes: ['FOMO'] });
    expect(p).toEqual({ mistakes: ['FOMO'], pnl: 12.5 });
    expect('accountIds' in p).toBe(false);
  });

  it('keeps an explicit account or P&L change', () => {
    expect(patchTradePayload(trade, { accountIds: ['acc-2'], pnl: 3 })).toEqual({ accountIds: ['acc-2'], pnl: 3 });
  });
});
