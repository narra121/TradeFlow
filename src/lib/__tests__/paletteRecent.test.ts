import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_RECENT, pushRecent, readRecent, saveRecent } from '../paletteRecent';

describe('paletteRecent', () => {
  beforeEach(() => localStorage.clear());

  it('puts the newest first and drops duplicates', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('keeps at most five', () => {
    const five = ['1', '2', '3', '4', '5'];
    expect(pushRecent(five, '6')).toHaveLength(MAX_RECENT);
    expect(pushRecent(five, '6')[0]).toBe('6');
  });

  it('round-trips and ignores a corrupt value', () => {
    saveRecent(['go-trades']);
    expect(readRecent()).toEqual(['go-trades']);
    localStorage.setItem('tq.palette.recent', '{oops');
    expect(readRecent()).toEqual([]);
  });
});
