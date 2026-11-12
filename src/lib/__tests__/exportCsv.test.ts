import { describe, expect, it } from 'vitest';
import { EXPORT_COLUMNS, csvCell, exportFileName, tradeToRow, tradesToCsv } from '../exportCsv';
import type { Trade, TradingAccount } from '@/types/trade';

const accounts = new Map([['a', { id: 'a', name: 'FTMO "100K"', currency: 'USD' } as TradingAccount]]);
const trade = {
  id: 't1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.085, exitPrice: 1.0875, stopLoss: 1.084, takeProfit: 0, size: 0.5,
  entryDate: '2026-11-04T14:30:00.000Z', exitDate: '2026-11-04T16:15:00.000Z', outcome: 'TP', pnl: 125, riskRewardRatio: 0, accountId: 'a',
  mistakes: ['FOMO', 'Early exit'], notes: '=HYPERLINK("http://x")', keyLesson: 'line1\nline2',
} as Trade;

describe('csv export', () => {
  it('has the fixed 32 columns', () => {
    expect(EXPORT_COLUMNS).toHaveLength(32);
    expect(tradeToRow(trade, accounts)).toHaveLength(32);
  });

  it('escapes quotes, commas and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('x\ny')).toBe('"x\ny"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(NaN)).toBe('');
  });

  it('neutralises formula injection in text cells but not in numbers', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell(-5)).toBe('-5');
  });

  it('writes a BOM, a header and CRLF rows', () => {
    const csv = tradesToCsv([trade], accounts);
    expect(csv.startsWith('﻿trade_id,account,currency')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"FTMO ""100K"""');
    expect(lines[1]).toContain("'=HYPERLINK");
    expect(lines[1]).toContain('FOMO; Early exit');
  });

  it('names the file by scope and date', () => {
    expect(exportFileName('selection', new Date('2026-11-11T10:00:00Z'))).toBe('tradequt-trades-selection-2026-11-11.csv');
  });
});
