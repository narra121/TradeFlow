import { beforeEach, describe, expect, it } from 'vitest';
import { BUILT_IN_VIEWS, isModified, loadCustomViews, matchesSpecial, needsJournal, saveCustomViews, VIEWS_KEY, type TradeView } from '../savedViews';

const trade = { pnl: 10, strategy: 'S', notes: 'n', images: [{}] };

describe('saved views', () => {
  beforeEach(() => localStorage.clear());

  it('ships four built-in views', () => {
    expect(BUILT_IN_VIEWS.map((v) => v.name)).toEqual(['All', 'Winners', 'Losers', 'Needs journal']);
  });

  it('round-trips custom views and ignores corrupt storage', () => {
    const v: TradeView = { ...BUILT_IN_VIEWS[0], id: 'v-1', name: 'Breakouts', builtIn: false };
    saveCustomViews([v]);
    expect(loadCustomViews()).toEqual([v]);
    localStorage.setItem(VIEWS_KEY, '{nope');
    expect(loadCustomViews()).toEqual([]);
  });

  it('knows what needs journalling', () => {
    expect(needsJournal(trade)).toBe(false);
    expect(needsJournal({ ...trade, strategy: '' })).toBe(true);
    expect(needsJournal({ ...trade, notes: '', keyLesson: '' })).toBe(true);
    expect(needsJournal({ ...trade, images: [] })).toBe(true);
  });

  it('applies the special predicates', () => {
    expect(matchesSpecial('winners', { ...trade, pnl: -1 })).toBe(false);
    expect(matchesSpecial('losers', { ...trade, pnl: -1 })).toBe(true);
    expect(matchesSpecial(undefined, trade)).toBe(true);
  });

  it('detects a modified view', () => {
    const base = BUILT_IN_VIEWS[0];
    expect(isModified(base, base)).toBe(false);
    expect(isModified(base, { ...base, group: 'week' })).toBe(true);
    expect(isModified(base, { ...base, filters: { ...base.filters, q: 'eur' } })).toBe(true);
  });
});
