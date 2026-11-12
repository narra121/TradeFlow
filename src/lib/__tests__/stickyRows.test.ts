import { describe, expect, it } from 'vitest';
import { clearSticky, newStickyState, withStickyRows } from '../stickyRows';

const row = (id: string) => ({ id });
const byId = (rows: { id: string }[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));

describe('withStickyRows', () => {
  it('shows the fresh rows untouched on the first call', () => {
    const s = newStickyState();
    expect(withStickyRows([row('a'), row('b')], [row('a'), row('b'), row('c')], s, 'x', byId).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('keeps a row that stopped matching because of an edit, in its place', () => {
    const s = newStickyState();
    const all = [row('a'), row('b'), row('c')];
    withStickyRows([row('a'), row('b'), row('c')], all, s, 'needs-journal', byId);
    expect(withStickyRows([row('a'), row('c')], all, s, 'needs-journal', byId).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('lets the row go when the filters, sort or scope change', () => {
    const s = newStickyState();
    const all = [row('a'), row('b')];
    withStickyRows([row('a'), row('b')], all, s, 'v1', byId);
    withStickyRows([row('a')], all, s, 'v1', byId);
    expect(withStickyRows([row('a')], all, s, 'v2', byId).map((r) => r.id)).toEqual(['a']);
  });

  it('lets the row go on Shift+R', () => {
    const s = newStickyState();
    const all = [row('a'), row('b')];
    withStickyRows([row('a'), row('b')], all, s, 'v1', byId);
    withStickyRows([row('a')], all, s, 'v1', byId);
    clearSticky(s);
    expect(withStickyRows([row('a')], all, s, 'v1', byId).map((r) => r.id)).toEqual(['a']);
  });

  it('never keeps a trade that was deleted', () => {
    const s = newStickyState();
    withStickyRows([row('a'), row('b')], [row('a'), row('b')], s, 'v1', byId);
    expect(withStickyRows([row('a')], [row('a')], s, 'v1', byId).map((r) => r.id)).toEqual(['a']);
  });
});
