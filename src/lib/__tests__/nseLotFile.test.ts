import { describe, expect, it } from 'vitest';
import { changesLater, contractValue, firstLot, formatDay, parseLotFile, searchRows } from '../nseLotFile';

/** Invented underlyings in the layout of NSE's file: padded cells, indices first, then a second header row for the stocks with fewer months. */
const SAMPLE_LOT_FILE = [
  'UNDERLYING                          ,SYMBOL    ,AAA-26     ,BBB-26     ,CCC-27     ,DDD-27     ',
  'ALPHA INDEX                         ,ALPHAIDX  ,10         ,10         ,10         ,10         ',
  'ALPHA BANK INDEX                    ,ALPHABANK ,20         ,20         ,20         ,           ',
  'Derivatives on Individual Securities,Symbol    ,AAA-26     ,BBB-26     ,CCC-27     ,           ',
  'GAMMA CEMENTS LIMITED               ,GAMMACEM  ,100        ,100        ,150        ,           ',
  'DELTA & CO LTD                      ,DELTACO   ,50         ,50         ,50         ,           ',
  'EPSILON BANK LTD.                   ,EPSBANK   ,200        ,175        ,175        ,           ',
  '',
].join('\n');

describe('parseLotFile', () => {
  it('splits indices from stocks, each with its own months, and reads blanks as null', () => {
    const file = parseLotFile(SAMPLE_LOT_FILE);
    expect(file.indices.months).toEqual(['AAA-26', 'BBB-26', 'CCC-27', 'DDD-27']);
    expect(file.stocks.months).toEqual(['AAA-26', 'BBB-26', 'CCC-27']);
    expect(file.indices.rows.map((r) => r.symbol)).toEqual(['ALPHAIDX', 'ALPHABANK']);
    expect(file.stocks.rows).toHaveLength(3);
    expect(file.indices.rows[1].lots).toEqual([20, 20, 20, null]);
    expect(file.stocks.rows[0]).toEqual({ name: 'GAMMA CEMENTS LIMITED', symbol: 'GAMMACEM', lots: [100, 100, 150] });
  });

  it('accepts CRLF line endings and a byte order mark', () => {
    const file = parseLotFile(`\uFEFF${SAMPLE_LOT_FILE.replace(/\n/g, '\r\n')}`);
    expect(file.stocks.rows).toHaveLength(3);
  });

  it('rejects text that is not the lot file', () => {
    expect(() => parseLotFile('')).toThrow(/does not look like/);
    expect(() => parseLotFile('date,symbol,qty\n2026-11-15,ABC,10')).toThrow(/does not look like/);
  });
});

describe('searchRows', () => {
  const { stocks, indices } = parseLotFile(SAMPLE_LOT_FILE);

  it('matches the symbol or the name, ignoring case', () => {
    expect(searchRows(stocks.rows, 'gammacem').map((r) => r.symbol)).toEqual(['GAMMACEM']);
    expect(searchRows(stocks.rows, 'cements').map((r) => r.symbol)).toEqual(['GAMMACEM']);
    expect(searchRows(stocks.rows, 'DELTA &').map((r) => r.symbol)).toEqual(['DELTACO']);
  });

  it('needs every typed word, in any order, to be present', () => {
    expect(searchRows(indices.rows, 'bank alpha').map((r) => r.symbol)).toEqual(['ALPHABANK']);
    expect(searchRows(indices.rows, 'alpha')).toHaveLength(2);
  });

  it('returns every row for a blank query and none for a miss', () => {
    expect(searchRows(stocks.rows, '   ')).toHaveLength(3);
    expect(searchRows(stocks.rows, 'zzz')).toEqual([]);
  });
});

describe('lot changes between months', () => {
  const { stocks, indices } = parseLotFile(SAMPLE_LOT_FILE);
  const bySymbol = (rows: typeof stocks.rows, symbol: string) => rows.find((r) => r.symbol === symbol)!;

  it('flags only the underlyings whose lot differs between listed months', () => {
    expect(changesLater(bySymbol(stocks.rows, 'GAMMACEM'))).toBe(true);
    expect(changesLater(bySymbol(stocks.rows, 'EPSBANK'))).toBe(true);
    expect(changesLater(bySymbol(stocks.rows, 'DELTACO'))).toBe(false);
    expect(changesLater(bySymbol(indices.rows, 'ALPHABANK'))).toBe(false);
  });

  it('compares with the first listed month', () => {
    expect(firstLot(bySymbol(stocks.rows, 'EPSBANK'))).toBe(200);
    expect(firstLot({ name: 'x', symbol: 'X', lots: [null, 5, 6] })).toBe(5);
    expect(firstLot({ name: 'x', symbol: 'X', lots: [null, null] })).toBeNull();
  });
});

describe('helpers', () => {
  it('multiplies price by lot size', () => {
    expect(contractValue(250.5, 10)).toBe(2505);
  });

  it('writes a day as 3 Oct 2025 without relying on the locale', () => {
    expect(formatDay('2025-10-03')).toBe('3 Oct 2025');
    expect(formatDay('2026-09-30')).toBe('30 Sep 2026');
  });
});
