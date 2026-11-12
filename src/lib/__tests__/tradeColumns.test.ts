import { describe, expect, it } from 'vitest';
import { TRADE_COLUMNS, moveColumn, presetColumns, resolveColumns } from '../tradeColumns';

describe('trade columns', () => {
  it('has the 28 columns in four groups', () => {
    expect(TRADE_COLUMNS).toHaveLength(28);
    expect(new Set(TRADE_COLUMNS.map((c) => c.group))).toEqual(new Set(['Identity', 'Execution', 'Result', 'Journal']));
  });

  it('the Review preset is 11 columns that fit 1,040 px', () => {
    const ids = presetColumns('review');
    expect(ids).toHaveLength(11);
    const cols = resolveColumns({ preset: 'review', custom: [] }, { showAccount: false, compact: false });
    expect(cols.reduce((w, c) => w + c.width, 0)).toBeLessThanOrEqual(1040 + 100);
  });

  it('adds Account while the scope is All accounts and keeps pinned edges', () => {
    const cols = resolveColumns({ preset: 'review', custom: [] }, { showAccount: true, compact: false });
    expect(cols.map((c) => c.id)).toContain('account');
    expect(cols[0].id).toBe('date');
    expect(cols[cols.length - 1].id).toBe('pnl');
  });

  it('keeps only the compact set while the pane is docked', () => {
    expect(resolveColumns({ preset: 'review', custom: [] }, { showAccount: true, compact: true }).map((c) => c.id)).toEqual(['date', 'symbol', 'r', 'pnl']);
  });

  it('honours a custom order and reorders with the move buttons', () => {
    const cols = resolveColumns({ preset: 'custom', custom: ['symbol', 'date', 'pnl'] }, { showAccount: false, compact: false });
    expect(cols.map((c) => c.id)).toEqual(['date', 'symbol', 'pnl']);
    expect(moveColumn(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(moveColumn(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
  });
});
