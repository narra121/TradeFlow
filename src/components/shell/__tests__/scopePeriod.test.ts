import { describe, expect, it } from 'vitest';
import { shiftRange } from '../ScopePeriod';

describe('shiftRange', () => {
  it('moves a week by a week and a month by a month', () => {
    expect(shiftRange('thisWeek', '2026-11-09', '2026-11-11', -1)).toEqual({ startDate: '2026-11-02', endDate: '2026-11-04' });
    expect(shiftRange('thisMonth', '2026-11-01', '2026-11-11', -1)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(shiftRange('thisMonth', '2026-10-01', '2026-10-31', 1)).toEqual({ startDate: '2026-11-01', endDate: '2026-11-30' });
  });

  it('moves a custom or day-count range by its own length', () => {
    expect(shiftRange('custom', '2026-10-01', '2026-10-10', 1)).toEqual({ startDate: '2026-10-11', endDate: '2026-10-20' });
    expect(shiftRange(30, '2026-10-12', '2026-11-11', -1)).toEqual({ startDate: '2026-09-11', endDate: '2026-10-11' });
  });

  it('does not move All time', () => {
    expect(shiftRange('all', '2000-01-01', '2026-11-11', 1)).toBeNull();
  });
});
