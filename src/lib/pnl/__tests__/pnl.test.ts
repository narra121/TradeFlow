import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import vectorsRaw from '../vectors.json?raw';
import { computePnl, outcomeFromPnl, pipSize, pipValue, rMultiple, round2, type PnlInput } from '../index';

// Must equal the hash pinned in JournalAWSSetup src/features/pnl/__tests__/pnl.test.ts (same vectors file).
const VECTORS_SHA256 = 'b712a25dab08805ca8dfa716e73d86f7eb15dcc51a768748abc09f74ec384352';

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

  it('rMultiple is from prices and needs a usable stop', () => {
    expect(rMultiple({ side: 'BUY', entryPrice: 100, exitPrice: 110, stopLoss: 95 })).toBe(2);
    expect(rMultiple({ side: 'SELL', entryPrice: 100, exitPrice: 110, stopLoss: 105 })).toBe(-2);
    expect(rMultiple({ side: 'BUY', entryPrice: 100, exitPrice: 110, stopLoss: null })).toBeNull();
    expect(rMultiple({ side: 'BUY', entryPrice: 100, exitPrice: 110, stopLoss: 100 })).toBeNull();
    expect(rMultiple({ side: 'BUY', entryPrice: 1.1, exitPrice: 1.105, stopLoss: 1.09 })).toBe(0.5);
  });

  it('outcome by sign', () => {
    expect(outcomeFromPnl(1)).toBe('TP');
    expect(outcomeFromPnl(-0.01)).toBe('SL');
    expect(outcomeFromPnl(0)).toBe('BREAKEVEN');
  });
});
