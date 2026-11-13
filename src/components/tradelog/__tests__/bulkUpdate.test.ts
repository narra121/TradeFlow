import { describe, expect, it } from 'vitest';
import { bulkUpdateBody, cachePatch } from '../bulkUpdate';

describe('bulkUpdateBody (X-013)', () => {
  it('maps single values to `set` with the API field names', () => {
    expect(bulkUpdateBody({ kind: 'strategy', value: 'Breakout' })).toEqual({ set: { setupType: 'Breakout' } });
    expect(bulkUpdateBody({ kind: 'session', value: 'London' })).toEqual({ set: { tradingSession: 'London' } });
    expect(bulkUpdateBody({ kind: 'market', value: 'Trend' })).toEqual({ set: { marketCondition: 'Trend' } });
  });

  it('maps list toggles to `add` / `remove` and leaves out the empty side', () => {
    expect(bulkUpdateBody({ kind: 'tags', add: ['A'], remove: [] })).toEqual({ add: { tags: ['A'] } });
    expect(bulkUpdateBody({ kind: 'mistakes', add: [], remove: ['FOMO'] })).toEqual({ remove: { mistakes: ['FOMO'] } });
    expect(bulkUpdateBody({ kind: 'brokenRules', add: ['r1'], remove: [] })).toEqual({ add: { brokenRuleIds: ['r1'] } });
  });

  it('leaves an account move to the per-trade update', () => {
    expect(bulkUpdateBody({ kind: 'account', accountId: 'a1' })).toBeNull();
  });

  it('a strategy change also updates the cached `setup`', () => {
    expect(cachePatch({ strategy: 'Breakout' })).toEqual({ strategy: 'Breakout', setup: 'Breakout' });
    expect(cachePatch({ tags: ['A'] })).toEqual({ tags: ['A'] });
  });
});
