import { describe, expect, it } from 'vitest';
import { KEYMAP, KEY_SCOPES, keyEntry } from '../keymap';

describe('keymap', () => {
  it('has unique ids and every entry in a known scope with at least one key', () => {
    expect(new Set(KEYMAP.map((k) => k.id)).size).toBe(KEYMAP.length);
    for (const k of KEYMAP) {
      expect(KEY_SCOPES).toContain(k.scope);
      expect(k.keys.length).toBeGreaterThan(0);
      expect(k.label).not.toBe('');
    }
  });

  it('carries the keys the Trades table and the shell handle', () => {
    for (const id of ['palette', 'new-trade', 'search', 'shortcuts', 'collapse-sidebar', 'period-prev', 'period-next', 'refresh', 'region', 'pick-strategy', 'pick-mistakes', 'pick-tags', 'row-select-space', 'group-collapse', 'group-expand']) {
      expect(keyEntry(id), id).toBeDefined();
    }
  });
});
