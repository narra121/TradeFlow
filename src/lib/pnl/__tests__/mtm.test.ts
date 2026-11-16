import { describe, expect, it } from 'vitest';
import { computeMtm, MAX_SETTLEMENTS, type Direction, type MtmInput } from '../mtm';

const LONG: MtmInput = {
  direction: 'long',
  quantity: 100,
  entryPrice: 24150,
  settlements: [24185.5, 24120.25, 24060],
  exitPrice: 24095.5,
};

function ok(input: MtmInput) {
  const r = computeMtm(input);
  if (r.status === 'error') throw new Error(r.error);
  return r;
}

const paise = (x: number) => Math.round(x * 100);

describe('computeMtm worked example (long, 100 units)', () => {
  it('gives the daily MTM, the P&L from entry and the realised P&L', () => {
    const r = ok(LONG);
    expect(r.rows.map((x) => x.kind)).toEqual(['settlement', 'settlement', 'settlement', 'exit']);
    expect(r.rows.map((x) => x.fromEntry)).toEqual([3550, -2975, -9000, -5450]);
    expect(r.rows.map((x) => x.mtm)).toEqual([3550, -6525, -6025, 3550]);
    expect(r.rows.map((x) => x.ledgerTotal)).toEqual([3550, -2975, -9000, -5450]);
    expect(r.realised).toBe(-5450);
  });

  it('takes the first day against the entry price, later days against the previous settlement', () => {
    const [d1, d2] = ok(LONG).rows;
    expect(d1.mtm).toBeCloseTo((24185.5 - 24150) * LONG.quantity, 6);
    expect(d2.mtm).toBeCloseTo((24120.25 - 24185.5) * LONG.quantity, 6);
  });
});

describe('computeMtm reconciliation', () => {
  it('daily MTM entries add up to the realised P&L and to the P&L from entry on every row', () => {
    let seed = 12345;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const tick = () => (1000 + Math.floor(next() * 40000)) * 0.05;
    for (let n = 0; n < 300; n++) {
      const direction: Direction = next() < 0.5 ? 'long' : 'short';
      const settlements = Array.from({ length: Math.floor(next() * (MAX_SETTLEMENTS + 1)) }, tick);
      const r = ok({ direction, quantity: 1 + Math.floor(next() * 900), entryPrice: tick(), settlements, exitPrice: tick() });
      const sumPaise = r.rows.reduce((s, x) => s + paise(x.mtm), 0);
      expect(sumPaise).toBe(paise(r.realised));
      for (const row of r.rows) expect(row.ledgerTotal).toBe(row.fromEntry);
      expect(r.rows[r.rows.length - 1].ledgerTotal).toBe(r.realised);
    }
  });

  it('still adds up to the paisa when prices have three decimals, each row within one paisa of the exact figure', () => {
    const input: MtmInput = { direction: 'long', quantity: 75, entryPrice: 101.123, settlements: [101.456, 99.789, 100.001], exitPrice: 102.345 };
    const r = ok(input);
    expect(r.rows.reduce((s, x) => s + paise(x.mtm), 0)).toBe(paise(r.realised));
    expect(r.realised).toBe(Math.round((102.345 - 101.123) * 75 * 100) / 100);
    const refs = [input.entryPrice, ...input.settlements];
    r.rows.forEach((row, i) => expect(Math.abs(row.mtm - (row.price - refs[i]) * input.quantity)).toBeLessThanOrEqual(0.0100001));
  });
});

describe('computeMtm directions and shapes', () => {
  it('a short position mirrors the long one', () => {
    const long = ok(LONG);
    const short = ok({ ...LONG, direction: 'short' });
    expect(short.rows.map((x) => x.mtm)).toEqual(long.rows.map((x) => (x.mtm === 0 ? 0 : -x.mtm)));
    expect(short.realised).toBe(5450);
  });

  it('a single settlement gives a settlement row and an exit row', () => {
    const r = ok({ direction: 'long', quantity: 50, entryPrice: 200, settlements: [210], exitPrice: 205 });
    expect(r.rows).toEqual([
      { kind: 'settlement', day: 1, price: 210, fromEntry: 500, mtm: 500, ledgerTotal: 500 },
      { kind: 'exit', day: 2, price: 205, fromEntry: 250, mtm: -250, ledgerTotal: 250 },
    ]);
    expect(r.realised).toBe(250);
  });

  it('no settlements means a same-day square-off: one exit row whose MTM is the realised P&L', () => {
    const r = ok({ direction: 'long', quantity: 10, entryPrice: 100, settlements: [], exitPrice: 103 });
    expect(r.rows).toEqual([{ kind: 'exit', day: 1, price: 103, fromEntry: 30, mtm: 30, ledgerTotal: 30 }]);
    expect(r.realised).toBe(30);
  });

  it('a flat position realises zero and never returns -0', () => {
    const r = ok({ direction: 'short', quantity: 10, entryPrice: 100, settlements: [100], exitPrice: 100 });
    expect(r.realised).toBe(0);
    for (const row of r.rows) expect(Object.is(row.mtm, -0) || Object.is(row.fromEntry, -0)).toBe(false);
  });
});

describe('computeMtm invalid input', () => {
  const bad = (patch: Partial<MtmInput>) => computeMtm({ ...LONG, ...patch });

  it.each([
    ['zero quantity', { quantity: 0 }],
    ['negative quantity', { quantity: -5 }],
    ['NaN quantity', { quantity: Number.NaN }],
    ['Infinity quantity', { quantity: Number.POSITIVE_INFINITY }],
  ])('rejects %s', (_n, patch) => {
    expect(bad(patch)).toEqual({ status: 'error', error: 'Quantity must be above zero.' });
  });

  it.each([
    ['zero entry', { entryPrice: 0 }],
    ['negative exit', { exitPrice: -1 }],
    ['NaN settlement', { settlements: [24100, Number.NaN] }],
    ['zero settlement', { settlements: [0] }],
  ])('rejects %s', (_n, patch) => {
    expect(bad(patch)).toEqual({ status: 'error', error: 'Every price must be a number above zero.' });
  });

  it('rejects more than five settlements', () => {
    const r = bad({ settlements: [1, 2, 3, 4, 5, 6] });
    expect(r).toEqual({ status: 'error', error: 'Use at most 5 settlement prices.' });
    expect(ok({ ...LONG, settlements: [1, 2, 3, 4, 5].map((x) => x + 24100) }).rows).toHaveLength(6);
  });
});
