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
