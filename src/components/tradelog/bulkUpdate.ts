import type { BulkOp } from '@/lib/bulkPatch';
import type { CreateTradePayload } from '@/lib/api';
import type { Trade } from '@/types/trade';

/** The `set` / `add` / `remove` part of `POST /v1/trades/bulk-update` for an operation, or null when the endpoint cannot do it (moving trades to another account stays one PUT per trade). */
export function bulkUpdateBody(op: BulkOp): { set?: Record<string, string>; add?: Record<string, string[]>; remove?: Record<string, string[]> } | null {
  switch (op.kind) {
    case 'strategy':
      return { set: { setupType: op.value } };
    case 'session':
      return { set: { tradingSession: op.value } };
    case 'market':
      return { set: { marketCondition: op.value } };
    case 'mistakes':
    case 'tags':
    case 'brokenRules': {
      const field = op.kind === 'brokenRules' ? 'brokenRuleIds' : op.kind;
      return { ...(op.add.length ? { add: { [field]: op.add } } : {}), ...(op.remove.length ? { remove: { [field]: op.remove } } : {}) };
    }
    case 'account':
      return null;
  }
}

/** The fields of one trade a bulk edit changed, as the cached trade holds them. */
export function cachePatch(patch: Partial<CreateTradePayload>): Partial<Trade> {
  return { ...patch, ...(patch.strategy !== undefined ? { setup: patch.strategy } : {}) } as Partial<Trade>;
}
