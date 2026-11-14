import { afterEach, describe, expect, it } from 'vitest';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import { browserZone } from '@/components/settings/timeZones';
import { appToday, appTimeZone, appTodayKey, dayKeyIn, fromZonedInput, toZonedInput, wallClock, zoneOffsetMinutes } from '../appTimeZone';

// 2026-11-03 20:30 UTC: Tuesday 15:30 in New York (EST), already Wednesday 02:00 in Kolkata.
const AT = new Date('2026-11-03T20:30:00.000Z');

afterEach(() => {
  localStorage.clear();
  resetUiStateCache();
});

describe('appTimeZone', () => {
  it('is this browser\'s zone until a preference is saved, then the preference', () => {
    expect(appTimeZone()).toBe(browserZone());
    patchUiState({ timeZone: 'America/New_York' });
    expect(appTimeZone()).toBe('America/New_York');
  });

  it('ignores a saved name this browser does not know', () => {
    patchUiState({ timeZone: 'Mars/Olympus' });
    expect(appTimeZone()).toBe(browserZone());
    expect(() => dayKeyIn(AT)).not.toThrow();
  });
});

describe('day keys and clocks follow the saved zone', () => {
  it('puts one instant on different days for different zones, as /stats does for the saved zone', () => {
    patchUiState({ timeZone: 'America/New_York' });
    expect(dayKeyIn(AT)).toBe('2026-11-03');
    expect(wallClock(AT)).toEqual({ year: 2026, month: 11, day: 3, hour: 15, minute: 30 });
    patchUiState({ timeZone: 'Asia/Kolkata' });
    expect(dayKeyIn(AT)).toBe('2026-11-04');
    expect(wallClock(AT)).toEqual({ year: 2026, month: 11, day: 4, hour: 2, minute: 0 });
  });

  it('a zone given explicitly wins over the saved one', () => {
    patchUiState({ timeZone: 'Asia/Kolkata' });
    expect(dayKeyIn(AT, 'America/New_York')).toBe('2026-11-03');
  });

  it('midnight reads 00, not 24', () => {
    patchUiState({ timeZone: 'Europe/London' });
    expect(wallClock(new Date('2026-11-03T00:05:00.000Z'))).toMatchObject({ day: 3, hour: 0, minute: 5 });
  });

  it('appTodayKey and appToday name the calendar day of the zone, not the browser', () => {
    patchUiState({ timeZone: 'Pacific/Kiritimati' }); // UTC+14
    const now = new Date('2026-11-03T12:00:00.000Z');
    expect(appTodayKey(now)).toBe('2026-11-04');
    const d = appToday(now);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 11, 4, 0]);
  });
});

describe('offsets and datetime-local values', () => {
  it('reports the offset of a zone at an instant, with daylight saving', () => {
    expect(zoneOffsetMinutes(AT, 'Asia/Kolkata')).toBe(330);
    expect(zoneOffsetMinutes(AT, 'America/New_York')).toBe(-300);
    expect(zoneOffsetMinutes(new Date('2026-07-01T12:00:00Z'), 'America/New_York')).toBe(-240);
    expect(zoneOffsetMinutes(AT, 'UTC')).toBe(0);
  });

  it('round-trips an instant through the zone\'s datetime-local value', () => {
    for (const zone of ['America/New_York', 'Asia/Kolkata', 'Europe/London', 'UTC']) {
      patchUiState({ timeZone: zone });
      const value = toZonedInput(AT.toISOString());
      expect(fromZonedInput(value)?.toISOString()).toBe(AT.toISOString());
    }
  });

  it('reads a typed clock on the zone\'s clock', () => {
    patchUiState({ timeZone: 'America/New_York' });
    expect(toZonedInput(AT)).toBe('2026-11-03T15:30');
    expect(fromZonedInput('2026-11-03T15:30')?.toISOString()).toBe('2026-11-03T20:30:00.000Z');
  });

  it('keeps the seconds of an edited date when asked (import review), on every zone', () => {
    const at = new Date('2026-11-03T20:30:42.000Z');
    for (const zone of ['America/New_York', 'Asia/Kolkata', 'Asia/Kathmandu', 'UTC']) {
      patchUiState({ timeZone: zone });
      const value = toZonedInput(at, { seconds: true });
      expect(value).toMatch(/:42$/);
      expect(fromZonedInput(value)?.toISOString()).toBe(at.toISOString());
    }
    patchUiState({ timeZone: 'America/New_York' });
    expect(toZonedInput(at)).toBe('2026-11-03T15:30');
    expect(toZonedInput(AT, { seconds: true })).toBe('2026-11-03T15:30');
    expect(fromZonedInput('2026-11-03T16:05:42.5')?.toISOString()).toBe('2026-11-03T21:05:42.500Z');
  });

  it('is empty or null for anything that is not a date', () => {
    expect(toZonedInput('')).toBe('');
    expect(toZonedInput('nope')).toBe('');
    expect(fromZonedInput('')).toBeNull();
    expect(fromZonedInput('04/11/2026')).toBeNull();
  });
});
