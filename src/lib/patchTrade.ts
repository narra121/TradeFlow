import type { CreateTradePayload } from '@/lib/api';
import type { Trade } from '@/types/trade';

/**
 * Builds the body for a partial trade update. Until the backend keeps unsent fields (BE-R10), a PUT without
 * `accountIds` moves the trade to "no account" and one without `pnl` recomputes P&L, so both are always sent.
 */
export function patchTradePayload(trade: Trade, changes: Partial<CreateTradePayload>): Partial<CreateTradePayload> {
  const payload: Partial<CreateTradePayload> = { ...changes };
  if (payload.accountIds === undefined && payload.accountId === undefined && trade.accountId) {
    payload.accountIds = [trade.accountId];
  }
  if (payload.pnl === undefined) payload.pnl = trade.pnl;
  return payload;
}
