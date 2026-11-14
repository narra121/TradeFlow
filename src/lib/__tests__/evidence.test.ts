import { describe, expect, it } from 'vitest';
import { QA_INR, QA_USD } from '@/components/analysis/__tests__/qaFixtures';
import { evidenceOf, evidencePhrase, MIN_RANGE_TRADES, MIN_VERDICT_TRADES, rangeExcludesZero, rateRangeText, rRangeText, sampleLabel, SAMPLE_TEXT } from '../evidence';

// The fixtures are the server's own output (see qaFixtures.ts), so the mirror is checked against the backend.
const fixtures = { USD: QA_USD, INR: QA_INR };

describe('sampleLabel mirrors the backend (CONTRACT I3)', () => {
  it('uses the same bands as JournalAWSSetup evidence.test.ts', () => {
    expect([0, 19, 20, 29, 30, 99, 100, 5000].map(sampleLabel)).toEqual(['too-few', 'too-few', 'early', 'early', 'provisional', 'provisional', 'established', 'established']);
    expect(MIN_RANGE_TRADES).toBe(20);
    expect(MIN_VERDICT_TRADES).toBe(30);
  });

  it.each(Object.entries(fixtures))('gives the label the server gave every figure of the %s fixture', (_cur, a) => {
    expect(sampleLabel(a.tradeCount)).toBe(a.label);
    for (const segs of Object.values(a.segments)) for (const s of segs) expect(sampleLabel(s.trades)).toBe(s.label);
    for (const s of [...a.timing.byTradeNumber, ...a.timing.tradesPerDay]) expect(sampleLabel(s.trades)).toBe(s.label);
    for (const d of a.detectors) expect(sampleLabel(d.count)).toBe(d.label);
  });

  it.each(Object.entries(fixtures))('shows a range exactly where the server sends one (%s): from 20 trades', (_cur, a) => {
    for (const segs of Object.values(a.segments)) for (const s of segs) expect(s.winRateRange === null).toBe(s.trades < MIN_RANGE_TRADES);
  });

  it.each(Object.entries(fixtures))('never sees an edge or a leak under 30 trades (%s)', (_cur, a) => {
    const judged = [...Object.values(a.segments).flat(), ...a.timing.tradesPerDay].filter((s) => s.verdict !== 'watch');
    for (const s of judged) expect(s.trades).toBeGreaterThanOrEqual(MIN_VERDICT_TRADES);
    for (const d of a.detectors.filter((x) => x.verdict !== 'watch')) expect(d.count).toBeGreaterThanOrEqual(MIN_VERDICT_TRADES);
  });
});

describe('evidence wording (report §3.3, §4.1 rule 3)', () => {
  it('says edge or leak only for the server verdict, colour only then', () => {
    expect(evidenceOf('edge', 40)).toEqual({ text: 'Edge', detail: '40 trades', tone: 'edge' });
    expect(evidenceOf('leak', 31)).toEqual({ text: 'Leak', detail: '31 trades', tone: 'leak' });
  });

  it('says too early to tell under 30 trades, with how many more are needed', () => {
    expect(evidenceOf('watch', 8)).toEqual({ text: 'Too early to tell', detail: '8 trades; 22 more needed', tone: 'neutral' });
    expect(evidencePhrase('watch', 8)).toBe('too early to tell (8 trades)');
  });

  it('says pattern to watch (n trades) from 30 trades', () => {
    expect(evidenceOf('watch', 45)).toEqual({ text: 'Pattern to watch', detail: '45 trades', tone: 'neutral' });
    expect(evidencePhrase('watch', 45)).toBe('pattern to watch (45 trades)');
    expect(evidencePhrase('watch', 1)).toBe('too early to tell (1 trade)');
  });

  it('prints ranges with units', () => {
    expect(rateRangeText(fixtures.USD.edge.winRateRange)).toBe('39.1%–67.1%');
    expect(rRangeText(fixtures.USD.edge.expectancyRRange)).toBe('−0.23R to +0.67R');
    expect(rangeExcludesZero(fixtures.USD.edge.expectancyRRange)).toBe(false);
    expect(rangeExcludesZero(fixtures.INR.edge.expectancyRRange)).toBe(true);
    expect(rateRangeText(null)).toBe('');
    expect(SAMPLE_TEXT['too-few']).toBe('too few to tell');
  });
});
