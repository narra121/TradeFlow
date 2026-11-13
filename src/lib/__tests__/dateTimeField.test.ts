import { describe, expect, it } from 'vitest';
import { formatField, parseField, toLocalValue } from '../dateTimeField';

const now = new Date(2026, 10, 11, 9, 5);

describe('formatField', () => {
  it('prints day, short month, year and a 24-hour time', () => {
    expect(formatField('2026-11-04T14:30')).toBe('04 Nov 2026, 14:30');
    expect(formatField('2026-11-04T09:05')).toBe('04 Nov 2026, 09:05');
    expect(formatField('')).toBe('');
  });
});

describe('parseField', () => {
  it('reads what formatField prints, so a value survives a round trip', () => {
    expect(parseField('4 Nov 2026, 14:30', '', now)).toBe('2026-11-04T14:30');
    expect(parseField(formatField('2026-01-31T23:59'), '', now)).toBe('2026-01-31T23:59');
  });

  it('reads other common spellings, day first', () => {
    expect(parseField('04 november 2026 14:30', '', now)).toBe('2026-11-04T14:30');
    expect(parseField('2026-11-04 14:30', '', now)).toBe('2026-11-04T14:30');
    expect(parseField('04/11/2026 14:30', '', now)).toBe('2026-11-04T14:30');
  });

  it('keeps the time already in the field when only a date is typed, and the date when only a time is typed', () => {
    expect(parseField('5 Nov 2026', '2026-11-04T14:30', now)).toBe('2026-11-05T14:30');
    expect(parseField('16:45', '2026-11-04T14:30', now)).toBe('2026-11-04T16:45');
    expect(parseField('5 Nov 2026', '', now)).toBe('2026-11-05T00:00');
  });

  it('understands now and empty', () => {
    expect(parseField('now', '', now)).toBe(toLocalValue(now));
    expect(parseField('  ', '2026-11-04T14:30', now)).toBe('');
  });

  it('rejects what is not a real date instead of rolling it over', () => {
    expect(parseField('31 Feb 2026', '', now)).toBeNull();
    expect(parseField('4 Nov 2026, 25:00', '', now)).toBeNull();
    expect(parseField('next friday', '', now)).toBeNull();
  });
});
