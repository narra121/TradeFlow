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
