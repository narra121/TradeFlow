import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import vectorsRaw from '../vectors.json?raw';
import { computePnl, outcomeFromPnl, pipSize, pipValue, rMultiple, round2, type PnlInput } from '../index';

// Must equal the hash pinned in JournalAWSSetup src/features/pnl/__tests__/pnl.test.ts (same vectors file).
const VECTORS_SHA256 = '83a091169fefcbd552737322cbff48cffd2a4832b9ed69bc0f78df0d261f08e2';

const raw = vectorsRaw.replace(/\r\n/g, '\n');
const vectors = JSON.parse(raw) as { cases: { name: string; input: PnlInput; expected: ReturnType<typeof computePnl> }[] };

describe('pnl vectors (shared with the backend)', () => {
  it('vectors file is the pinned version', () => {
    expect(createHash('sha256').update(raw).digest('hex')).toBe(VECTORS_SHA256);
  });

  it('covers forex lots, futures multipliers, options, fees and partial rounding', () => {
    expect(vectors.cases.length).toBeGreaterThanOrEqual(25);
    const names = vectors.cases.map((c) => c.name).join(' | ').toLowerCase();
    for (const k of ['jpy', 'multiplier', 'fee', 'stop zero', 'rounding']) expect(names).toContain(k);
  });

  it.each(vectors.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(computePnl(c.input)).toEqual(c.expected);
  });
});

describe('helpers', () => {
  it('round2 never returns negative zero and rounds half away from zero', () => {
    expect(Object.is(round2(-0.001), 0)).toBe(true);
    expect(round2(Number.NaN)).toBe(0);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(-1.005)).toBe(-1.01);
  });

  it('pip size and value (per-pair, not a fixed $10)', () => {
    expect(pipSize('EURUSD')).toBe(0.0001);
    expect(pipSize('usdjpy.m')).toBe(0.01);
    expect(pipSize('XAUUSDm')).toBe(0.1);
    expect(pipSize('NIFTY24DEC24000CE')).toBeNull();
    expect(pipValue('EURUSD', 1)).toBe(10);
    expect(pipValue('GBPJPY', 0.5)).toBe(500);
    expect(pipValue('NIFTY', 1)).toBeNull();
  });

  it('rMultiple needs a usable stop', () => {
    expect(rMultiple({ entryPrice: 100, stopLoss: 95, quantity: 10 }, 100)).toBe(2);
    expect(rMultiple({ entryPrice: 100, stopLoss: null, quantity: 10 }, 100)).toBeNull();
    expect(rMultiple({ entryPrice: 100, stopLoss: 100, quantity: 10 }, 100)).toBeNull();
    expect(rMultiple({ entryPrice: 1.1, stopLoss: 1.09, quantity: 1, multiplier: 100000 }, 500)).toBe(0.5);
  });

  it('outcome by sign', () => {
    expect(outcomeFromPnl(1)).toBe('TP');
    expect(outcomeFromPnl(-0.01)).toBe('SL');
    expect(outcomeFromPnl(0)).toBe('BREAKEVEN');
  });
});
