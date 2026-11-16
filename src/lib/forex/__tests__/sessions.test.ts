import { describe, expect, it } from 'vitest';
import {
  addDays,
  clockChanges,
  hhmm,
  instantAt,
  isMarketOpen,
  londonNewYorkByPeriod,
  sessionsNow,
  sessionsOnDay,
  weekdayOf,
} from '../sessions';

const utc = (s: string) => Date.parse(`${s}Z`);
const minutesUtc = (ms: number) => new Date(ms).getUTCHours() * 60 + new Date(ms).getUTCMinutes();

describe('calendar helpers', () => {
  it('adds days across month and year ends and names weekdays', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekdayOf('2026-11-15')).toBe(0);
    expect(weekdayOf('2026-11-20')).toBe(5);
  });

  it('reads a wall clock in a zone with daylight saving', () => {
    expect(instantAt('2026-07-15', 8 * 60, 'Europe/London')).toBe(utc('2026-07-15T07:00:00'));
    expect(instantAt('2026-01-14', 8 * 60, 'Europe/London')).toBe(utc('2026-01-14T08:00:00'));
    expect(instantAt('2026-07-15', 8 * 60, 'America/New_York')).toBe(utc('2026-07-15T12:00:00'));
    expect(instantAt('2026-01-14', 8 * 60, 'America/New_York')).toBe(utc('2026-01-14T13:00:00'));
  });
});

describe('weekly market', () => {
  it('opens Sunday 17:00 and closes Friday 17:00 New York time, in both seasons', () => {
    expect(isMarketOpen(utc('2026-11-15T21:59:00'))).toBe(false); // Sunday 16:59 EST
    expect(isMarketOpen(utc('2026-11-15T22:00:00'))).toBe(true); // Sunday 17:00 EST
    expect(isMarketOpen(utc('2026-11-20T21:59:00'))).toBe(true); // Friday 16:59 EST
    expect(isMarketOpen(utc('2026-11-20T22:00:00'))).toBe(false);
    expect(isMarketOpen(utc('2026-07-12T21:00:00'))).toBe(true); // Sunday 17:00 EDT
    expect(isMarketOpen(utc('2026-07-18T12:00:00'))).toBe(false); // Saturday
  });
});

describe('sessions in UTC', () => {
  const day = (d: string) => sessionsOnDay(d, 'UTC');
  const times = (d: string, id: string) =>
    day(d)
      .sessions.filter((s) => s.id === id)
      .map((s) => `${hhmm(minutesUtc(s.start))}-${hhmm(minutesUtc(s.end))}`);

  it('northern summer (Wednesday 15 July 2026): London 07-16, New York 12-21, overlap 12-16', () => {
    expect(times('2026-07-15', 'london')).toEqual(['07:00-16:00']);
    expect(times('2026-07-15', 'newYork')).toEqual(['12:00-21:00']);
    expect(times('2026-07-15', 'tokyo')).toEqual(['00:00-09:00']);
    // Sydney is on standard time (UTC+10): 21:00 to 06:00 UTC, split by the UTC day.
    expect(times('2026-07-15', 'sydney')).toEqual(['00:00-06:00', '21:00-00:00']);
    const ln = day('2026-07-15').overlaps.find((o) => o.a === 'london' && o.b === 'newYork')!;
    expect([minutesUtc(ln.start), minutesUtc(ln.end)]).toEqual([12 * 60, 16 * 60]);
  });

  it('northern winter (Wednesday 14 January 2026): London 08-17, New York 13-22, overlap 13-17', () => {
    expect(times('2026-01-14', 'london')).toEqual(['08:00-17:00']);
    expect(times('2026-01-14', 'newYork')).toEqual(['13:00-22:00']);
    // Sydney on daylight time (UTC+11): 20:00 to 05:00 UTC.
    expect(times('2026-01-14', 'sydney')).toEqual(['00:00-05:00', '20:00-00:00']);
    const ln = day('2026-01-14').overlaps.find((o) => o.a === 'london' && o.b === 'newYork')!;
    expect([minutesUtc(ln.start), minutesUtc(ln.end)]).toEqual([13 * 60, 17 * 60]);
  });

  it('the weeks the US has changed its clocks and the UK has not give a five-hour overlap', () => {
    // US daylight time began on 8 March 2026, the UK's on 29 March.
    const ln = day('2026-03-18').overlaps.find((o) => o.a === 'london' && o.b === 'newYork')!;
    expect([minutesUtc(ln.start), minutesUtc(ln.end)]).toEqual([12 * 60, 17 * 60]);
  });

  it('nothing trades on Saturday, and Monday Sydney waits for the Sunday open', () => {
    expect(day('2026-07-18').sessions).toEqual([]);
    // Sunday 11 Jan 2026: Sydney Monday 07:00 AEDT is 20:00 UTC, but the market opens at 22:00 UTC (17:00 EST).
    expect(times('2026-01-11', 'sydney')).toEqual(['22:00-00:00']);
  });
});

describe('sessions in the viewer zone', () => {
  it('India: London-New York overlap 17:30-21:30 IST in July and 18:30-22:30 IST in January', () => {
    for (const [d, from, to] of [
      ['2026-07-15', '12:00', '16:00'],
      ['2026-01-14', '13:00', '17:00'],
    ] as const) {
      const ov = sessionsOnDay(d, 'Asia/Kolkata').overlaps.find((o) => o.a === 'london' && o.b === 'newYork')!;
      expect(ov.start).toBe(utc(`${d}T${from}:00`));
      expect(ov.end).toBe(utc(`${d}T${to}:00`));
    }
  });
});

describe('now', () => {
  it('says which sessions are open and when each changes', () => {
    const now = utc('2026-07-15T13:00:00');
    const status = Object.fromEntries(sessionsNow(now).map((s) => [s.id, s]));
    expect(status.london.open).toBe(true);
    expect(status.london.changeAt).toBe(utc('2026-07-15T16:00:00'));
    expect(status.newYork.open).toBe(true);
    expect(status.tokyo.open).toBe(false);
    expect(status.tokyo.changeAt).toBe(utc('2026-07-16T00:00:00'));
  });

  it('on Saturday every session next opens with the market', () => {
    const status = Object.fromEntries(sessionsNow(utc('2026-07-18T12:00:00')).map((s) => [s.id, s]));
    expect(Object.values(status).every((s) => !s.open)).toBe(true);
    expect(status.sydney.changeAt).toBe(utc('2026-07-19T21:00:00'));
    expect(status.london.changeAt).toBe(utc('2026-07-20T07:00:00'));
  });
});

describe('clock changes', () => {
  it('finds the 2026 daylight-saving dates from the time-zone database', () => {
    expect(clockChanges(2026, 'Europe/London').map((c) => c.day)).toEqual(['2026-03-29', '2026-10-25']);
    expect(clockChanges(2026, 'America/New_York').map((c) => c.day)).toEqual(['2026-03-08', '2026-11-01']);
    expect(clockChanges(2026, 'Australia/Sydney').map((c) => c.day)).toEqual(['2026-04-05', '2026-10-04']);
    expect(clockChanges(2026, 'Asia/Tokyo')).toEqual([]);
  });

  it('groups the London-New York overlap of 2026 into its four seasons', () => {
    const periods = londonNewYorkByPeriod(2026).map((p) => `${p.from}..${p.to} ${hhmm(p.startUtc!)}-${hhmm(p.endUtc!)}`);
    expect(periods).toEqual([
      '2026-01-01..2026-03-06 13:00-17:00',
      '2026-03-09..2026-03-27 12:00-17:00',
      '2026-03-30..2026-10-23 12:00-16:00',
      '2026-10-26..2026-10-30 12:00-17:00',
      '2026-11-02..2026-12-31 13:00-17:00',
    ]);
  });
});
