import type { CreateTradePayload } from '@/lib/api';
import type { Trade } from '@/types/trade';

export const BULK_EDIT_CAP = 200;
export const FAN_OUT_CONCURRENCY = 5;

export type BulkOp =
  | { kind: 'strategy'; value: string }
  | { kind: 'session'; value: string }
  | { kind: 'market'; value: string }
  | { kind: 'mistakes'; add: string[]; remove: string[] }
  | { kind: 'tags'; add: string[]; remove: string[] }
  | { kind: 'brokenRules'; add: string[]; remove: string[] }
  | { kind: 'account'; accountId: string };

function mergeList(current: string[] | undefined, add: string[], remove: string[]): string[] {
  const out = (current ?? []).filter((v) => !remove.includes(v));
  for (const v of add) if (!out.includes(v)) out.push(v);
  return out;
}

/** The changed fields of one trade for an operation, or null when nothing would change (so it is skipped). */
export function patchFor(t: Trade, op: BulkOp): Partial<CreateTradePayload> | null {
  switch (op.kind) {
    case 'strategy':
      return (t.strategy ?? t.setup ?? '') === op.value ? null : { strategy: op.value };
    case 'session':
      return (t.session ?? '') === op.value ? null : { session: op.value };
    case 'market':
      return (t.marketCondition ?? '') === op.value ? null : { marketCondition: op.value };
    case 'mistakes': {
      const next = mergeList(t.mistakes, op.add, op.remove);
      return JSON.stringify(next) === JSON.stringify(t.mistakes ?? []) ? null : { mistakes: next };
    }
    case 'tags': {
      const next = mergeList(t.tags, op.add, op.remove);
      return JSON.stringify(next) === JSON.stringify(t.tags ?? []) ? null : { tags: next };
    }
    case 'brokenRules': {
      const next = mergeList(t.brokenRuleIds, op.add, op.remove);
      return JSON.stringify(next) === JSON.stringify(t.brokenRuleIds ?? []) ? null : { brokenRuleIds: next };
    }
    case 'account':
      return t.accountId === op.accountId ? null : { accountIds: [op.accountId] };
  }
}

/** The values the same fields had before, for Undo. */
export function inverseOf(t: Trade, patch: Partial<CreateTradePayload>): Partial<CreateTradePayload> {
  const back: Partial<CreateTradePayload> = {};
  if ('strategy' in patch) back.strategy = t.strategy ?? t.setup ?? '';
  if ('session' in patch) back.session = t.session ?? '';
  if ('marketCondition' in patch) back.marketCondition = t.marketCondition ?? '';
  if ('mistakes' in patch) back.mistakes = t.mistakes ?? [];
  if ('tags' in patch) back.tags = t.tags ?? [];
  if ('brokenRuleIds' in patch) back.brokenRuleIds = t.brokenRuleIds ?? [];
  if ('accountIds' in patch && t.accountId) back.accountIds = [t.accountId];
  return back;
}

export interface FanOutResult<T> {
  done: T[];
  failed: T[];
}

/** Runs `fn` over items `concurrency` at a time; a failure never stops the rest. */
export async function fanOut<T>(items: T[], fn: (item: T) => Promise<void>, opts: { concurrency?: number; onProgress?: (done: number, total: number) => void } = {}): Promise<FanOutResult<T>> {
  const concurrency = opts.concurrency ?? FAN_OUT_CONCURRENCY;
  const result: FanOutResult<T> = { done: [], failed: [] };
  let next = 0;
  let finished = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await fn(item);
        result.done.push(item);
      } catch {
        result.failed.push(item);
      }
      finished += 1;
      opts.onProgress?.(finished, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return result;
}

/** Tri-state of one value across the selection: all trades have it, some do, or none. */
export function triState(values: (string[] | undefined)[], value: string): 'all' | 'some' | 'none' {
  if (values.length === 0) return 'none';
  const n = values.filter((v) => (v ?? []).includes(value)).length;
  return n === 0 ? 'none' : n === values.length ? 'all' : 'some';
}
