import { beforeEach, describe, expect, it } from 'vitest';
import { SCOPE_KEY, TRADELOG_KEY, clearPersistedViewState, clearTradeDrafts, hasTradeDrafts, loadScope, resolveRange, saveScope } from '../scope';

describe('Last N days (FE-023)', () => {
  const now = new Date(2026, 10, 12, 15, 0, 0);
  it('covers N days with both ends included: Last 7 days on 12 Nov starts on 6 Nov', () => {
    expect(resolveRange(7, undefined, undefined, now)).toEqual({ startDate: '2026-11-06', endDate: '2026-11-12' });
    expect(resolveRange(30, undefined, undefined, now)).toEqual({ startDate: '2026-10-14', endDate: '2026-11-12' });
    expect(resolveRange(365, undefined, undefined, now)).toEqual({ startDate: '2025-11-13', endDate: '2026-11-12' });
  });
});

describe('scope persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('round-trips the scope', () => {
    saveScope({ accountId: 'a1', datePreset: 'custom', customFrom: '2026-10-01', customTo: '2026-10-31' });
    expect(loadScope()).toEqual({ accountId: 'a1', datePreset: 'custom', customFrom: '2026-10-01', customTo: '2026-10-31' });
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem(SCOPE_KEY, '{nope');
    expect(loadScope()).toBeNull();
  });

  it('clears scope and trade list state on logout', () => {
    saveScope({ accountId: null, datePreset: 'all' });
    sessionStorage.setItem(TRADELOG_KEY, '{}');
    clearPersistedViewState();
    expect(localStorage.getItem(SCOPE_KEY)).toBeNull();
    expect(sessionStorage.getItem(TRADELOG_KEY)).toBeNull();
  });
});

describe('trade drafts', () => {
  beforeEach(() => sessionStorage.clear());

  it('sees a draft of a new or an existing trade and removes only tq.draft keys on log out', () => {
    expect(hasTradeDrafts()).toBe(false);
    sessionStorage.setItem('tq.draft.new', '{}');
    sessionStorage.setItem('tq.draft.t1', '{}');
    sessionStorage.setItem(TRADELOG_KEY, '{}');
    expect(hasTradeDrafts()).toBe(true);
    clearTradeDrafts();
    expect(hasTradeDrafts()).toBe(false);
    expect(sessionStorage.getItem(TRADELOG_KEY)).toBe('{}');
  });

  it('a session that ended keeps the drafts', () => {
    sessionStorage.setItem('tq.draft.new', '{}');
    clearPersistedViewState();
    expect(hasTradeDrafts()).toBe(true);
  });
});

describe('resolveRange', () => {
  const now = new Date(2026, 10, 11);

  it('recomputes the end date from the clock', () => {
    expect(resolveRange(30, undefined, undefined, now)).toEqual({ startDate: '2026-10-13', endDate: '2026-11-11' });
    expect(resolveRange(30, undefined, undefined, new Date(2026, 10, 12)).endDate).toBe('2026-11-12');
  });

  it('keeps a custom range and falls back to all time when it is incomplete', () => {
    expect(resolveRange('custom', '2026-10-01', '2026-10-31', now)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(resolveRange('custom', undefined, undefined, now).startDate).toBe('2000-01-01');
  });
});
