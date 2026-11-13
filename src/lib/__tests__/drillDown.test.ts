import { describe, expect, it } from 'vitest';
import { drillLabel, drillMatch, parseDrillDown } from '../drillDown';
import type { Trade } from '@/types/trade';

const t = (over: Partial<Trade> = {}): Trade =>
  ({ id: 'a', symbol: 'EURUSD', pnl: 10, direction: 'LONG', accountId: 'acc', strategy: 'Breakout', session: 'London', assetClass: 'forex', entryDate: '2026-11-10T14:20:00Z', exitDate: '2026-11-10T15:00:00Z', ...over }) as Trade;

describe('parseDrillDown', () => {
  it('is null without a filter, even with src', () => {
    expect(parseDrillDown('')).toBeNull();
    expect(parseDrillDown('?src=analytics&trade=x')).toBeNull();
  });

  it('reads every parameter the dashboard and analytics link with', () => {
    const d = parseDrillDown('?src=analytics&strategy=Breakout&direction=short&weekday=Tuesday&hour=14&rule=r1&broken=r2,r3&on=2026-11-10&mistake=FOMO');
    expect(d).toMatchObject({ src: 'analytics', strategy: 'Breakout', direction: 'SHORT', weekday: 'Tuesday', hour: 14, on: '2026-11-10', mistake: 'FOMO', rules: ['r2', 'r3', 'r1'] });
  });

  it('ignores malformed values', () => {
    expect(parseDrillDown('?hour=25&weekday=Funday&on=yesterday&missing=else')).toBeNull();
  });
});

describe('drillMatch', () => {
  it('matches the UTC weekday and hour of the entry together', () => {
    const d = parseDrillDown('?weekday=Tuesday&hour=14');
    expect(drillMatch(t(), d!)).toBe(true);
    expect(drillMatch(t({ entryDate: '2026-11-10T15:20:00Z' }), d!)).toBe(false);
    expect(drillMatch(t({ entryDate: '2026-11-11T14:20:00Z' }), d!)).toBe(false);
  });

  it('applies the missing tallies', () => {
    expect(drillMatch(t({ accountId: undefined }), parseDrillDown('?missing=account')!)).toBe(true);
    expect(drillMatch(t(), parseDrillDown('?missing=account')!)).toBe(false);
    expect(drillMatch(t({ pnl: -5 }), parseDrillDown('?missing=lesson')!)).toBe(true);
    expect(drillMatch(t({ pnl: -5, keyLesson: 'x' }), parseDrillDown('?missing=lesson')!)).toBe(false);
  });

  it('matches a rule by any of its ids, and mistakes by name', () => {
    expect(drillMatch(t({ brokenRuleIds: ['r3'] }), parseDrillDown('?broken=r2,r3')!)).toBe(true);
    expect(drillMatch(t({ brokenRuleIds: [] }), parseDrillDown('?broken=r2,r3')!)).toBe(false);
    expect(drillMatch(t({ mistakes: ['FOMO'] }), parseDrillDown('?mistake=FOMO')!)).toBe(true);
  });

  it('requires every given filter', () => {
    const d = parseDrillDown('?symbol=EURUSD&direction=short')!;
    expect(drillMatch(t(), d)).toBe(false);
    expect(drillMatch(t({ direction: 'SHORT' }), d)).toBe(true);
  });
});

describe('drillLabel', () => {
  it('names the origin and the filter', () => {
    expect(drillLabel(parseDrillDown('?src=analytics&strategy=Breakout')!)).toBe('From Analytics: Strategy = Breakout');
    expect(drillLabel(parseDrillDown('?src=dashboard&missing=strategy')!)).toBe('From Dashboard: no strategy');
  });

  it('resolves rule ids to their text', () => {
    expect(drillLabel(parseDrillDown('?broken=r1,r2')!, () => 'No revenge trades')).toBe('Broken rule = No revenge trades');
  });
});

describe('weekday and hour follow the zone /stats used (X-004)', () => {
  // 14:20 UTC is 19:50 in Kolkata (UTC+5:30), and 20:00 UTC is already Wednesday 01:30 there.
  it("matches the entry in the link's zone, not in UTC", () => {
    const ist = parseDrillDown('?weekday=Tuesday&hour=19&zone=Asia%2FKolkata')!;
    expect(ist.zone).toBe('Asia/Kolkata');
    expect(drillMatch(t(), ist)).toBe(true);
    const utcHour = parseDrillDown('?weekday=Tuesday&hour=14&zone=Asia%2FKolkata')!;
    expect(drillMatch(t(), utcHour)).toBe(false);
  });

  it('moves a late-evening UTC entry to the next local weekday', () => {
    const d = parseDrillDown('?weekday=Wednesday&hour=1&zone=Asia%2FKolkata')!;
    expect(drillMatch(t({ entryDate: '2026-11-10T20:00:00Z' }), d)).toBe(true);
    expect(drillMatch(t({ entryDate: '2026-11-10T20:00:00Z' }), parseDrillDown('?weekday=Tuesday&hour=20')!)).toBe(true);
  });

  it('takes an explicit zone argument (the preference) when the link has none, and reads UTC otherwise', () => {
    const d = parseDrillDown('?hour=19')!;
    expect(drillMatch(t(), d)).toBe(false);
    expect(drillMatch(t(), d, 'Asia/Kolkata')).toBe(true);
  });

  it('follows daylight saving: the same UTC hour differs by season', () => {
    const summer = t({ entryDate: '2026-07-14T14:20:00Z' });
    expect(drillMatch(summer, parseDrillDown('?hour=10&zone=America%2FNew_York')!)).toBe(true);
    expect(drillMatch(t({ entryDate: '2026-12-15T14:20:00Z' }), parseDrillDown('?hour=9&zone=America%2FNew_York')!)).toBe(true);
  });

  it('ignores an unknown zone, is not a filter by itself, and labels the zone', () => {
    expect(parseDrillDown('?hour=5&zone=Not%2FAZone')!.zone).toBeUndefined();
    expect(parseDrillDown('?src=analytics&zone=Asia%2FKolkata')).toBeNull();
    expect(drillLabel(parseDrillDown('?hour=9&zone=Asia%2FKolkata')!)).toBe('Hour = 09:00 Asia/Kolkata');
    expect(drillLabel(parseDrillDown('?hour=9')!)).toBe('Hour = 09:00 UTC');
  });
});
