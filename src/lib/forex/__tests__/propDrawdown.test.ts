import { describe, expect, it } from 'vitest';
import { drawdownRoom, lotsWithinRoom, type DrawdownInput, type DrawdownResult } from '../propDrawdown';

const base: DrawdownInput = {
  initial: 100000,
  dayStart: 102000,
  current: 99500,
  peak: 103000,
  dailyPct: 5,
  dailyBasis: 'initial',
  maxPct: 10,
  maxType: 'static',
  lockAtInitial: false,
  targetPct: 10,
};

const ok = (i: Partial<DrawdownInput>) => {
  const r = drawdownRoom({ ...base, ...i });
  if (r.status !== 'ok') throw new Error(r.error);
  return r as DrawdownResult;
};

describe('prop-firm drawdown room', () => {
  it('static limits: 5% daily of the initial balance binds before the 10% overall limit', () => {
    const r = ok({});
    expect(r.dailyLimit).toBe(5000);
    expect(r.dailyFloor).toBe(97000);
    expect(r.maxFloor).toBe(90000);
    expect(r.binding).toBe('daily');
    expect(r.room).toBe(2500);
    expect(r.usedDailyPct).toBeCloseTo(50, 9);
    expect(r.breached).toBe(false);
    expect(r.target).toBeCloseTo(110000, 9);
    expect(r.toTarget).toBeCloseTo(10500, 9);
  });

  it('a daily limit measured from the day-start balance', () => {
    const r = ok({ dailyBasis: 'dayStart' });
    expect(r.dailyLimit).toBe(5100);
    expect(r.dailyFloor).toBe(96900);
    expect(r.room).toBe(2600);
  });

  it('trailing overall limit follows the peak, and can stop at the starting balance', () => {
    const trailing = ok({ initial: 50000, dayStart: 52500, current: 52000, peak: 53000, dailyPct: 4, maxPct: 5, maxType: 'trailing' });
    expect(trailing.maxLoss).toBe(2500);
    expect(trailing.maxFloor).toBe(50500);
    expect(trailing.dailyFloor).toBe(50500);
    const locked = ok({ initial: 50000, dayStart: 52500, current: 52000, peak: 53000, dailyPct: 4, maxPct: 5, maxType: 'trailing', lockAtInitial: true });
    expect(locked.maxFloor).toBe(50000);
    // Below the lock point the floor still trails.
    expect(ok({ initial: 50000, peak: 51000, maxPct: 5, maxType: 'trailing', lockAtInitial: true }).maxFloor).toBe(48500);
  });

  it('the overall limit binds when the account is already down', () => {
    const r = ok({ dayStart: 92000, current: 91000 });
    expect(r.dailyFloor).toBe(87000);
    expect(r.binding).toBe('max');
    expect(r.room).toBe(1000);
  });

  it('reports a breach and a negative room', () => {
    const r = ok({ current: 96500 });
    expect(r.breached).toBe(true);
    expect(r.room).toBe(-500);
  });

  it('a peak below the initial balance counts as the initial balance', () => {
    expect(ok({ maxType: 'trailing', peak: 0 }).maxFloor).toBe(90000);
  });

  it('rejects impossible inputs', () => {
    expect(drawdownRoom({ ...base, initial: 0 })).toEqual({ status: 'error', error: 'initial' });
    expect(drawdownRoom({ ...base, dailyPct: 0 })).toEqual({ status: 'error', error: 'daily-range' });
    expect(drawdownRoom({ ...base, maxPct: 100 })).toEqual({ status: 'error', error: 'max-range' });
    expect(drawdownRoom({ ...base, current: Number.NaN })).toEqual({ status: 'error', error: 'balances' });
    expect(drawdownRoom({ ...base, targetPct: -1 })).toEqual({ status: 'error', error: 'target-range' });
  });
});

describe('lots within the room', () => {
  it('rounds down to 0.01 lot: $2,500 room, 25-pip stop at $10 a pip per lot = 10.00 lots', () => {
    expect(lotsWithinRoom(2500, 25, 10)).toBe(10);
    expect(lotsWithinRoom(1000, 30, 10)).toBe(3.33);
    expect(lotsWithinRoom(-5, 30, 10)).toBe(0);
    expect(lotsWithinRoom(100, 0, 10)).toBe(0);
  });
});
