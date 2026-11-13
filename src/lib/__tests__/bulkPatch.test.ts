import { describe, expect, it } from 'vitest';
import { fanOut, inverseOf, patchFor, triState } from '../bulkPatch';
import type { Trade } from '@/types/trade';

const t = (over: Partial<Trade> = {}): Trade => ({ id: 't', symbol: 'X', mistakes: ['FOMO'], strategy: 'A', accountId: 'a1', pnl: 1, ...over }) as Trade;

describe('patchFor', () => {
  it('skips trades that already match', () => {
    expect(patchFor(t(), { kind: 'strategy', value: 'A' })).toBeNull();
    expect(patchFor(t(), { kind: 'mistakes', add: ['FOMO'], remove: [] })).toBeNull();
    expect(patchFor(t(), { kind: 'account', accountId: 'a1' })).toBeNull();
  });

  it('adds and removes list values without duplicating', () => {
    expect(patchFor(t(), { kind: 'mistakes', add: ['Late entry', 'FOMO'], remove: [] })).toEqual({ mistakes: ['FOMO', 'Late entry'] });
    expect(patchFor(t(), { kind: 'mistakes', add: [], remove: ['FOMO'] })).toEqual({ mistakes: [] });
    expect(patchFor(t({ tags: undefined }), { kind: 'tags', add: ['breakout'], remove: [] })).toEqual({ tags: ['breakout'] });
  });

  it('sets single values and the account', () => {
    expect(patchFor(t(), { kind: 'session', value: 'London' })).toEqual({ session: 'London' });
    expect(patchFor(t(), { kind: 'account', accountId: 'a2' })).toEqual({ accountIds: ['a2'] });
  });
});

describe('inverseOf', () => {
  it('restores the previous values for Undo', () => {
    const trade = t({ strategy: 'A', session: undefined });
    expect(inverseOf(trade, { strategy: 'B', session: 'London' })).toEqual({ strategy: 'A', session: '' });
    expect(inverseOf(trade, { mistakes: [] })).toEqual({ mistakes: ['FOMO'] });
    expect(inverseOf(trade, { accountIds: ['a2'] })).toEqual({ accountIds: ['a1'] });
  });
});

describe('fanOut', () => {
  it('limits concurrency, reports progress and keeps going after a failure', async () => {
    let running = 0;
    let peak = 0;
    const progress: number[] = [];
    const res = await fanOut(
      Array.from({ length: 12 }, (_, i) => i),
      async (i) => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 2));
        running -= 1;
        if (i === 3) throw { status: 400, data: { message: 'A trade can have at most 6 images' } };
      },
      { concurrency: 5, onProgress: (d) => progress.push(d) },
    );
    expect(peak).toBeLessThanOrEqual(5);
    expect(res.failed).toEqual([3]);
    expect(res.reason).toBe('A trade can have at most 6 images');
    expect(res.done).toHaveLength(11);
    expect(progress[progress.length - 1]).toBe(12);
  });
});

describe('triState', () => {
  it('is all, some or none across the selection', () => {
    expect(triState([['a'], ['a', 'b']], 'a')).toBe('all');
    expect(triState([['a'], ['b']], 'a')).toBe('some');
    expect(triState([['b'], undefined], 'a')).toBe('none');
    expect(triState([], 'a')).toBe('none');
  });
});
