import { describe, it, expect } from 'vitest';
import { formatLocalDateOnly, formatLocalDateTime } from '../dateUtils';

describe('formatLocalDateOnly', () => {
  it('formats a standard date', () => {
    const date = new Date(2025, 0, 15); // Jan 15, 2025 local
    expect(formatLocalDateOnly(date)).toBe('2025-01-15');
  });

  it('pads single-digit month and day', () => {
    const date = new Date(2025, 2, 5); // March 5
    expect(formatLocalDateOnly(date)).toBe('2025-03-05');
  });

  it('handles end of month', () => {
    const date = new Date(2025, 0, 31); // Jan 31
    expect(formatLocalDateOnly(date)).toBe('2025-01-31');
  });

  it('handles December', () => {
    const date = new Date(2025, 11, 25); // Dec 25
    expect(formatLocalDateOnly(date)).toBe('2025-12-25');
  });

  it('handles midnight', () => {
    const date = new Date(2025, 5, 10, 0, 0, 0);
    expect(formatLocalDateOnly(date)).toBe('2025-06-10');
  });

  it('handles last moment of the day', () => {
    const date = new Date(2025, 5, 10, 23, 59, 59);
    expect(formatLocalDateOnly(date)).toBe('2025-06-10');
  });

  it('handles leap year Feb 29', () => {
    const date = new Date(2024, 1, 29); // Feb 29, 2024
    expect(formatLocalDateOnly(date)).toBe('2024-02-29');
  });

  it('handles non-leap year March 1', () => {
    const date = new Date(2025, 2, 1); // March 1
    expect(formatLocalDateOnly(date)).toBe('2025-03-01');
  });

  it('handles year 2000', () => {
    const date = new Date(2000, 0, 1);
    expect(formatLocalDateOnly(date)).toBe('2000-01-01');
  });
});

describe('formatLocalDateTime', () => {
  it('formats a standard date-time', () => {
    const date = new Date(2025, 0, 15, 14, 30, 45);
    expect(formatLocalDateTime(date)).toBe('2025-01-15T14:30:45');
  });

  it('pads single-digit values', () => {
    const date = new Date(2025, 2, 5, 3, 7, 9);
    expect(formatLocalDateTime(date)).toBe('2025-03-05T03:07:09');
  });

  it('handles midnight', () => {
    const date = new Date(2025, 5, 10, 0, 0, 0);
    expect(formatLocalDateTime(date)).toBe('2025-06-10T00:00:00');
  });

  it('handles 23:59:59', () => {
    const date = new Date(2025, 5, 10, 23, 59, 59);
    expect(formatLocalDateTime(date)).toBe('2025-06-10T23:59:59');
  });

  it('handles noon', () => {
    const date = new Date(2025, 0, 1, 12, 0, 0);
    expect(formatLocalDateTime(date)).toBe('2025-01-01T12:00:00');
  });

  it('handles leap year date-time', () => {
    const date = new Date(2024, 1, 29, 15, 45, 30);
    expect(formatLocalDateTime(date)).toBe('2024-02-29T15:45:30');
  });

  it('handles end of December', () => {
    const date = new Date(2025, 11, 31, 23, 59, 59);
    expect(formatLocalDateTime(date)).toBe('2025-12-31T23:59:59');
  });
});

describe('formatLocalDateOnly – extended', () => {
  it('handles epoch 0 (Jan 1, 1970 in local time)', () => {
    const date = new Date(0);
    // epoch 0 is midnight UTC; in local time the date components come from the local offset
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    expect(formatLocalDateOnly(date)).toBe(`${year}-${month}-${day}`);
  });

  it('handles a far future date', () => {
    const date = new Date(2099, 11, 31); // Dec 31, 2099
    expect(formatLocalDateOnly(date)).toBe('2099-12-31');
  });

  it('handles a date constructed from a date-only string', () => {
    // Date-only strings are parsed as UTC – formatLocalDateOnly uses local getters
    const date = new Date('2025-06-15');
    const expected = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(formatLocalDateOnly(date)).toBe(expected);
  });

  it('handles a date constructed from a datetime string', () => {
    const date = new Date('2025-06-15T18:30:00');
    expect(formatLocalDateOnly(date)).toBe(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    );
  });

  it('returns NaN-containing string for invalid date input', () => {
    const date = new Date('not-a-date');
    // Date methods return NaN for invalid dates
    const result = formatLocalDateOnly(date);
    expect(result).toContain('NaN');
  });
});

describe('formatLocalDateTime – extended', () => {
  it('handles epoch 0 in local time', () => {
    const date = new Date(0);
    const result = formatLocalDateTime(date);
    // Should contain a T separator and be well-formed
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it('returns NaN-containing string for invalid date input', () => {
    const date = new Date('not-a-date');
    const result = formatLocalDateTime(date);
    expect(result).toContain('NaN');
  });

  it('handles a far future date with time', () => {
    const date = new Date(2099, 5, 15, 8, 5, 3);
    expect(formatLocalDateTime(date)).toBe('2099-06-15T08:05:03');
  });
});
