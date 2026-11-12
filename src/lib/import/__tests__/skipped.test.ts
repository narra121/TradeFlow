import { describe, expect, it } from 'vitest';
import type { NormalizedTrade } from '@/types/import';
import { applyEdit, rowStatus, validateTrade } from '../rows';
import { base64ToText, findSkippedLines, recoverSkipped } from '../skipped';

const parsedTrade = (p: Partial<NormalizedTrade>): NormalizedTrade => ({
  symbol: 'EURUSD', side: 'BUY', quantity: 10000, entryPrice: 1.085, exitPrice: 1.0884, openDate: '2026-11-02T03:45:00.000Z', closeDate: '2026-11-02T06:10:00.000Z',
  outcome: 'TP', pnl: 30, stopLoss: null, takeProfit: null, tags: [], assetClass: 'stock', fees: 0, grossPnl: 30, externalId: 'generic_csv:1', importSource: 'generic_csv', ...p,
});

const HEADER = 'Symbol,Side,Quantity,Entry Price,Exit Price,Open Time,Close Time,Fees,Trade ID';
const csv = (...lines: string[]) => [HEADER, ...lines].join('\n');

describe('findSkippedLines', () => {
  const text = csv(
    'EURUSD,Buy,10000,1.0850,1.0884,2026-11-02 09:15,2026-11-02 11:40,3.5,T1',
    'RELIANCE,Buy,10,,2871.20,2026-11-03 10:05,2026-11-03 14:20,24.1,T2',
    'GBPUSD,Sell,5000,1.2650,1.2672,2026-11-04 14:30,2026-11-04 15:10,2.1,T3',
  );
  const parsed = [parsedTrade({ externalId: 'generic_csv:T1' }), parsedTrade({ symbol: 'GBPUSD', side: 'SELL', quantity: 5000, externalId: 'generic_csv:T3' })];

  it('finds the line the parser dropped, with the cells it could read and the reason', () => {
    const [line, ...rest] = findSkippedLines(text, parsed, 1);
    expect(rest).toHaveLength(0);
    expect(line.line).toBe(3);
    expect(line.raw).toContain('RELIANCE');
    expect(line.reason).toBe('Entry price is missing or not readable.');
    expect(line.trade).toMatchObject({ symbol: 'RELIANCE', side: 'BUY', quantity: 10, entryPrice: 0, exitPrice: 2871.2, fees: 24.1, externalId: 'generic_csv:T2' });
    expect(line.trade?.openDate).toBe('2026-11-03T04:35:00.000Z');
    expect(Number.isNaN(line.trade?.pnl)).toBe(true);
  });

  it('returns nothing when the rows cannot be matched one to one with the parse', () => {
    expect(findSkippedLines(text, parsed, 2)).toEqual([]);
    expect(findSkippedLines(text, parsed.slice(0, 1), 1)).toEqual([]);
    expect(findSkippedLines(text, parsed, 0)).toEqual([]);
    expect(findSkippedLines('a,b\n1,2', [], 1)).toEqual([]);
  });

  it('a line whose direction cannot be read is listed without a row to edit', () => {
    const t = csv('EURUSD,Buy,10000,1.0850,1.0884,2026-11-02 09:15,2026-11-02 11:40,3.5,T1', 'XAUUSD,??,1,2400,2390,2026-11-03 10:05,2026-11-03 14:20,0,T9');
    const [line] = findSkippedLines(t, [parsedTrade({})], 1);
    expect(line.trade).toBeNull();
    expect(line.reason).toBe('Side is missing or not readable.');
  });

  it('the recovered row needs a fix on exactly the missing cell; entering it computes the P&L and makes the row ready', () => {
    const res = { detectedSource: 'generic_csv' as const, trades: parsed, skipped: 1 };
    const { rows, unread } = recoverSkipped('f.csv', text, res, 2);
    expect(unread).toEqual([]);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.note).toBe('Line 3: the parser skipped this line. Entry price is missing or not readable.');
    expect(rowStatus(row)).toBe('fix');
    expect(Object.keys(validateTrade(row.trade)).sort()).toEqual(['entryPrice', 'pnl']);
    const fixed = applyEdit(row.trade, 'entryPrice', 2850.5);
    expect(fixed.pnl).toBeCloseTo((2871.2 - 2850.5) * 10 - 24.1, 2);
    expect(rowStatus({ ...row, trade: fixed })).toBe('ready');
  });

  it('only generic CSV text files are re-read', () => {
    const res = { detectedSource: 'zerodha' as const, trades: parsed, skipped: 1 };
    expect(recoverSkipped('f.csv', text, res, 0).rows).toEqual([]);
    expect(recoverSkipped('f.xlsx', text, { ...res, detectedSource: 'generic_csv' }, 0).rows).toEqual([]);
  });
});

describe('base64ToText', () => {
  it('decodes UTF-8', () => expect(base64ToText(btoa('a,b\n1,2'))).toBe('a,b\n1,2'));
});
