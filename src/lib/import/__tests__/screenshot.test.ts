import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchLabel, batches, classifyFile, fitScreenshot, fromExtracted, MAX_SCREENSHOT_BYTES } from '../screenshot';
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

describe('fitScreenshot', () => {
  const file = (size: number, name = 'shot.png') => new File([new Uint8Array(size)], name, { type: 'image/png' });
  const blob = (size: number) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' });

  it('leaves a screenshot under the limit alone', async () => {
    const f = file(MAX_SCREENSHOT_BYTES);
    const render = vi.fn();
    expect(await fitScreenshot(f, render)).toBe(f);
    expect(render).not.toHaveBeenCalled();
  });

  it('re-encodes an oversized capture as JPEG, gentlest attempt first, and keeps its name', async () => {
    const render = vi.fn(async () => blob(900_000));
    const out = await fitScreenshot(file(3 * 1024 * 1024, 'broker.table.png'), render);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(expect.any(File), 2000, 0.85);
    expect(out.name).toBe('broker.table.jpg');
    expect(out.type).toBe('image/jpeg');
    expect(out.size).toBe(900_000);
  });

  it('tries smaller attempts until one fits', async () => {
    const sizes = [2_000_000, 1_500_000, 1_000_000];
    const render = vi.fn(async (_file: File, _edge: number, _quality: number) => blob(sizes.shift() ?? 100));
    const out = await fitScreenshot(file(3 * 1024 * 1024), render);
    expect(render.mock.calls.map((c) => [c[1], c[2]])).toEqual([[2000, 0.85], [2000, 0.7], [1400, 0.7]]);
    expect(out.size).toBe(1_000_000);
  });

  it('returns the original when nothing gets under the limit, or the browser cannot decode it, so the caller can reject it', async () => {
    const big = file(3 * 1024 * 1024);
    expect(await fitScreenshot(big, async () => blob(2 * 1024 * 1024))).toBe(big);
    expect(await fitScreenshot(big, async () => null)).toBe(big);
    expect(await fitScreenshot(big, async () => { throw new Error('decode'); })).toBe(big);
  });
});
