import { beforeEach, describe, expect, it } from 'vitest';
import { batchLabel, batches, classifyFile, fromExtracted } from '../screenshot';
import { forgetMapping, headerSignature, loadMapping, missingFields, saveMapping } from '../mappingMemory';

describe('classifyFile', () => {
  it('separates screenshots, broker files and everything else', () => {
    expect(classifyFile({ name: 'a.png', type: 'image/png' })).toBe('screenshot');
    expect(classifyFile({ name: 'tradebook.CSV', type: 'text/csv' })).toBe('broker');
    expect(classifyFile({ name: 'x.xlsx', type: '' })).toBe('broker');
    expect(classifyFile({ name: 'notes.pdf', type: 'application/pdf' })).toBe('unsupported');
  });
});

describe('batches', () => {
  it('sends screenshots three at a time and labels each batch', () => {
    expect(batches([1, 2, 3, 4, 5, 6, 7]).map((b) => b.length)).toEqual([3, 3, 1]);
    expect(batchLabel(0, 7)).toBe('Screenshots 1–3');
    expect(batchLabel(2, 7)).toBe('Screenshot 7');
  });
});

describe('fromExtracted', () => {
  it('keeps missing dates empty so the grid flags them instead of saving now', () => {
    const t = fromExtracted({ symbol: ' xauusd ', side: 'sell', quantity: '0.5', openDate: '', entryPrice: '2400', exitPrice: 2390, pnl: '50' });
    expect(t).toMatchObject({ symbol: 'XAUUSD', side: 'SELL', quantity: 0.5, openDate: '', closeDate: '', entryPrice: 2400, exitPrice: 2390, pnl: 50, outcome: 'TP', importSource: 'ai_screenshot' });
  });

  it('turns a readable date into ISO and uses the open date when the close is missing', () => {
    const t = fromExtracted({ symbol: 'A', side: 'BUY', quantity: 1, openDate: '2026-11-04T14:30:00Z', entryPrice: 1, exitPrice: 2, pnl: 1 });
    expect(t.openDate).toBe('2026-11-04T14:30:00.000Z');
    expect(t.closeDate).toBe(t.openDate);
  });

  it('derives the external id from the content; identical rows are told apart by occurrence', () => {
    const item = { symbol: 'A', side: 'BUY', quantity: 1, openDate: '2026-11-04T14:30:00Z', entryPrice: 1, exitPrice: 2, pnl: 1 };
    expect(fromExtracted(item).externalId).toBe(fromExtracted(item).externalId);
    expect(fromExtracted(item, 1).externalId).toBe(`${fromExtracted(item).externalId}-1`);
  });
});

describe('mapping memory', () => {
  beforeEach(() => localStorage.clear());

  it('same headers in any order and case are the same layout', () => {
    expect(headerSignature(['Symbol', ' qty '])).toBe(headerSignature(['QTY', 'symbol']));
  });

  it('stores and returns the mapping for a signature, and forgets it', () => {
    const headers = ['Scrip', 'B/S', 'Lots'];
    expect(loadMapping(headers)).toBeNull();
    saveMapping(headers, { symbol: 'Scrip', side: 'B/S', quantity: 'Lots' });
    expect(loadMapping(['lots', 'scrip', 'b/s'])).toEqual({ symbol: 'Scrip', side: 'B/S', quantity: 'Lots' });
    forgetMapping(headers);
    expect(loadMapping(headers)).toBeNull();
  });

  it('asks for the fields of the layout the mapping points at', () => {
    expect(missingFields({ symbol: 'a', side: 'b', quantity: 'c', entryPrice: 'd', exitPrice: 'e', openTime: 'f' })).toEqual([]);
    expect(missingFields({ symbol: 'a', side: 'b', quantity: 'c', price: 'd', time: 'e' })).toEqual([]);
    expect(missingFields({ symbol: 'a', side: 'b', quantity: 'c', entryPrice: 'd' })).toEqual(['Exit price', 'Open time']);
    expect(missingFields({ symbol: 'a', side: 'b', quantity: 'c', price: 'd' })).toEqual(['Time (one row per execution)']);
  });
});
