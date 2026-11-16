import { describe, expect, it } from 'vitest';
import {
  FREEZE_LIMITS,
  INDEX_COLUMNS,
  INDEX_LOT_CIRCULARS,
  LOT_DATA_CHECKED,
  NSE_LOT_FILE_URL,
  STOCK_LOT_CIRCULARS,
  type IndexSymbol,
} from '../nse-lot-circulars';

const CIRCULAR_URL = /^https:\/\/nsearchives\.nseindia\.com\/content\/circulars\/FAOP(\d+)\.(pdf|zip)$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

describe('NSE lot circular data', () => {
  it('has rows, a check date and the NSE file as its source', () => {
    expect(INDEX_LOT_CIRCULARS.length).toBeGreaterThan(0);
    expect(STOCK_LOT_CIRCULARS.length).toBeGreaterThan(0);
    expect(LOT_DATA_CHECKED).toMatch(ISO_DAY);
    expect(NSE_LOT_FILE_URL).toBe('https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv');
  });

  it('has NIFTY and BANKNIFTY in the index columns and in the latest circular', () => {
    const symbols = INDEX_COLUMNS.map((c) => c.symbol);
    expect(symbols).toContain('NIFTY');
    expect(symbols).toContain('BANKNIFTY');
    expect(INDEX_LOT_CIRCULARS[0].lots.NIFTY).toEqual({ from: 75, to: 65 });
    expect(INDEX_LOT_CIRCULARS[0].lots.BANKNIFTY).toEqual({ from: 35, to: 30 });
  });

  it('gives every history row the URL of the circular it was read from, matching its reference number', () => {
    for (const c of [...INDEX_LOT_CIRCULARS, ...STOCK_LOT_CIRCULARS]) {
      const m = CIRCULAR_URL.exec(c.url);
      expect(m, c.ref).not.toBeNull();
      expect(c.ref).toBe(`NSE/FAOP/${m![1]}`);
      expect(c.date).toMatch(ISO_DAY);
      expect(c.effective).not.toBe('');
      expect(c.rule).not.toBe('');
    }
    const freeze = CIRCULAR_URL.exec(FREEZE_LIMITS.url);
    expect(freeze).not.toBeNull();
    expect(FREEZE_LIMITS.ref).toBe(`NSE/FAOP/${freeze![1]}`);
  });

  it('is newest first with no repeated circular', () => {
    for (const rows of [INDEX_LOT_CIRCULARS, STOCK_LOT_CIRCULARS]) {
      const dates = rows.map((r) => r.date);
      expect(dates).toEqual([...dates].sort().reverse());
      expect(new Set(rows.map((r) => r.ref)).size).toBe(rows.length);
    }
  });

  it('chains: for each index, a circular starts from the lot the previous one ended on', () => {
    for (const { symbol } of INDEX_COLUMNS) {
      const chronological = INDEX_LOT_CIRCULARS.filter((c) => c.lots[symbol as IndexSymbol]).reverse();
      for (let i = 1; i < chronological.length; i++) {
        expect(chronological[i].lots[symbol]!.from, `${symbol} in ${chronological[i].ref}`).toBe(chronological[i - 1].lots[symbol]!.to);
      }
    }
  });

  it('keeps stock counts as whole numbers', () => {
    for (const c of STOCK_LOT_CIRCULARS) {
      for (const n of [c.lowered, c.raised, c.loweredNotMultiple, c.unchanged]) expect(Number.isInteger(n) && n >= 0).toBe(true);
    }
  });

  it('lists a freeze limit for each index in the circular', () => {
    expect(FREEZE_LIMITS.rows.map((r) => r.symbol)).toEqual(expect.arrayContaining(['NIFTY', 'BANKNIFTY']));
    for (const r of FREEZE_LIMITS.rows) expect(r.limit).toBeGreaterThan(0);
  });
});
