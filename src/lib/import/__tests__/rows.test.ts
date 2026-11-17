import { describe, expect, it } from 'vitest';
import type { NormalizedTrade } from '@/types/import';
import { applyEdit, canMerge, editRow, filterRows, makeRows, mergeRows, mergeTrades, moveRows, rowDateTime, rowStatus, setIncluded, spansYears, summarise, validateTrade } from '../rows';

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'EURUSD', side: 'BUY', quantity: 10, entryPrice: 100, exitPrice: 105, openDate: '2026-10-02T03:45:00.000Z', closeDate: '2026-10-02T06:10:00.000Z',
  outcome: 'TP', pnl: 48.5, stopLoss: null, takeProfit: null, tags: [], assetClass: 'forex', fees: 1.5, grossPnl: 50, externalId: 'a', importSource: 'generic_csv', ...p,
});

describe('validateTrade', () => {
  it('accepts a complete row', () => expect(validateTrade(trade())).toEqual({}));

  it('states each rule per field', () => {
    const e = validateTrade(trade({ symbol: ' ', quantity: 0, entryPrice: 0, exitPrice: -1, openDate: '', closeDate: '', fees: -1, pnl: Number.NaN }));
    expect(Object.keys(e).sort()).toEqual(['closeDate', 'entryPrice', 'exitPrice', 'fees', 'openDate', 'pnl', 'quantity', 'symbol']);
    expect(e.closeDate).toBe('Add a close date and time.');
  });

  it('flags a close before the open', () => {
    expect(validateTrade(trade({ closeDate: '2026-10-01T00:00:00.000Z' })).closeDate).toBe('Closed must be after Opened.');
  });
});

describe('rowStatus and summarise', () => {
  const rows = makeRows([trade({ externalId: '1' }), trade({ externalId: '2', exitPrice: 0 }), trade({ externalId: '3', duplicate: true }), trade({ externalId: '4' })], 'f.csv');

  it('derives one status per row', () => {
    expect(rows.map((r) => rowStatus(r))).toEqual(['ready', 'fix', 'duplicate', 'ready']);
  });

  it('a duplicate is unchecked by default and can be re-included', () => {
    expect(rows[2].included).toBe(false);
    expect(rowStatus({ ...rows[2], included: true })).toBe('ready');
  });

  it('an excluded row with errors is Excluded, not Needs a fix', () => {
    expect(rowStatus({ ...rows[1], included: false })).toBe('excluded');
  });

  it('counts statuses and sums net for the rows that will be saved', () => {
    expect(summarise(rows)).toMatchObject({ all: 4, ready: 2, fix: 1, duplicate: 1, excluded: 0, net: 97 });
  });

  it('a saved row is Imported and stays out of the edit paths', () => {
    const saved = { ...rows[0], saved: true };
    expect(rowStatus(saved)).toBe('saved');
    expect(setIncluded([saved], new Set([saved.key]), false)[0].included).toBe(true);
  });
});

describe('applyEdit', () => {
  it('P&L follows price edits when it matched the formula before', () => {
    const next = applyEdit(trade(), 'exitPrice', 110);
    expect(next.grossPnl).toBe(100);
    expect(next.pnl).toBe(98.5);
    expect(next.outcome).toBe('TP');
  });

  it('flips direction and outcome with the side', () => {
    const next = applyEdit(trade(), 'side', 'SELL');
    expect(next.grossPnl).toBe(-50);
    expect(next.outcome).toBe('SL');
  });

  it('leaves a broker-reported P&L alone when it did not match the formula', () => {
    const odd = trade({ pnl: 999, grossPnl: 1000.5 });
    const next = applyEdit(odd, 'exitPrice', 110);
    expect(next.pnl).toBe(999);
    expect(applyEdit(odd, 'fees', 2).pnl).toBe(998.5);
  });

  it('a cleared price leaves the P&L as it was and flags only that cell', () => {
    const next = applyEdit(trade(), 'exitPrice', Number.NaN);
    expect(next.pnl).toBe(48.5);
    expect(Object.keys(validateTrade(next))).toEqual(['exitPrice']);
  });

  it('editing P&L keeps gross consistent and sets the outcome', () => {
    const next = applyEdit(trade(), 'pnl', -10);
    expect(next.grossPnl).toBe(-8.5);
    expect(next.outcome).toBe('SL');
  });

  it('editRow changes only the keyed row', () => {
    const rows = makeRows([trade({ externalId: '1' }), trade({ externalId: '2' })], 'f');
    const out = editRow(rows, rows[1].key, 'symbol', 'GBPUSD');
    expect(out.map((r) => r.trade.symbol)).toEqual(['EURUSD', 'GBPUSD']);
  });
});

describe('merge', () => {
  const a = trade({ externalId: 'a', quantity: 10, entryPrice: 100, exitPrice: 105, fees: 1, pnl: 49, grossPnl: 50 });
  const b = trade({ externalId: 'b', quantity: 30, entryPrice: 104, exitPrice: 106, fees: 2, pnl: 58, grossPnl: 60, openDate: '2026-10-02T01:00:00.000Z', closeDate: '2026-10-02T09:00:00.000Z' });

  it('size-weights the prices, adds quantity, fees and P&L, and spans first open to last close', () => {
    const m = mergeTrades([a, b]);
    expect(m.quantity).toBe(40);
    expect(m.entryPrice).toBe(103);
    expect(m.exitPrice).toBe(105.75);
    expect(m.fees).toBe(3);
    expect(m.pnl).toBe(107);
    expect(m.openDate).toBe('2026-10-02T01:00:00.000Z');
    expect(m.closeDate).toBe('2026-10-02T09:00:00.000Z');
    expect(m.externalId).toMatch(/^m-/);
  });

  it('only merges rows of one symbol and direction', () => {
    const rows = makeRows([a, b, trade({ externalId: 'c', side: 'SELL' })], 'f');
    expect(canMerge(rows.slice(0, 2))).toBe(true);
    expect(canMerge(rows)).toBe(false);
    expect(mergeRows(rows, new Set(rows.map((r) => r.key)))).toBe(rows);
  });

  it('replaces the selected rows with one at the first position and remembers its parts', () => {
    const rows = makeRows([trade({ externalId: 'x', symbol: 'AAA' }), a, b], 'f');
    const out = mergeRows(rows, new Set([rows[1].key, rows[2].key]));
    expect(out).toHaveLength(2);
    expect(out[1].mergedFrom).toEqual(['a', 'b']);
    expect(out[0].trade.symbol).toBe('AAA');
  });

  it('a merge of fills that were all already imported stays Already imported instead of becoming Ready', () => {
    const rows = makeRows([trade({ externalId: 'a', duplicate: true }), trade({ externalId: 'b', duplicate: true })], 'f');
    const out = mergeRows(rows, new Set(rows.map((r) => r.key)));
    expect(out).toHaveLength(1);
    expect(out[0].trade.duplicate).toBe(true);
    expect(out[0].included).toBe(false);
    expect(rowStatus(out[0])).toBe('duplicate');
  });

  it('a merge that includes a new fill is Ready', () => {
    const rows = makeRows([trade({ externalId: 'a', duplicate: true }), trade({ externalId: 'b' })], 'f');
    const out = mergeRows(rows, new Set(rows.map((r) => r.key)));
    expect(rowStatus(out[0])).toBe('ready');
  });
});

describe('filterRows and moveRows', () => {
  const rows = makeRows([trade({ externalId: '1', symbol: 'NIFTY' }), trade({ externalId: '2', symbol: 'BANKNIFTY', exitPrice: 0 })], 'f');
  it('filters by status chip and symbol search', () => {
    expect(filterRows(rows, 'fix', '').map((r) => r.trade.externalId)).toEqual(['2']);
    expect(filterRows(rows, 'all', 'bank').map((r) => r.trade.externalId)).toEqual(['2']);
    expect(filterRows(rows, 'all', '')).toHaveLength(2);
  });
  it('moves rows to another account without touching others', () => {
    const out = moveRows(rows, new Set([rows[0].key]), 'acc2');
    expect(out.map((r) => r.accountId)).toEqual(['acc2', undefined]);
  });
});

describe('parseTruncation', () => {
  it('reads the parser warning as numbers and ignores other warnings', async () => {
    const { parseTruncation } = await import('../rows');
    expect(parseTruncation('The file has 7412 trades; only the first 5000 are returned. Import a shorter date range for the rest.')).toEqual({ total: 7412, shown: 5000 });
    expect(parseTruncation('3 rows skipped')).toBeNull();
  });
});

describe('dates across years (L22-031)', () => {
  it('adds the year when the rows span years, so a held trade never reads closed before opened', () => {
    const held = { trade: trade({ openDate: '2025-04-01T03:30:00.000Z', closeDate: '2026-03-31T03:30:00.000Z' }) };
    expect(spansYears([held])).toBe(true);
    expect(spansYears([{ trade: trade() }])).toBe(false);
    expect(rowDateTime('2025-04-01T03:30:00.000Z', true)).toMatch(/^01 Apr 2025 \d{2}:\d{2}$/);
    expect(rowDateTime('2026-10-02T03:45:00.000Z', false)).toMatch(/^02 Oct \d{2}:\d{2}$/);
  });
});
