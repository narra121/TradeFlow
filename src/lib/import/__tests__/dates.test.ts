import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import type { NormalizedTrade } from '@/types/import';
import { extractedToUtc, readCell, resolveCell, switchableReadings, switchDateOrder, type RowDates } from '../dates';
import { editRow, makeRows, missingTimeCounts, missingTimeNote, type ReviewRow } from '../rows';
import { fromExtracted, rowDatesOf } from '../screenshot';

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'XAUUSD', side: 'BUY', quantity: 1, entryPrice: 1, exitPrice: 2, openDate: '', closeDate: '', outcome: 'TP', pnl: 1, stopLoss: null, takeProfit: null,
  tags: [], assetClass: 'stock', fees: 0, grossPnl: 1, externalId: 'x', importSource: 'ai_screenshot', ...p,
});
const dates = (p: Partial<RowDates> = {}): RowDates => ({ shot: 1, order: 'DMY', source: 'default', canSwitch: true, openRaw: '', closeRaw: '03/12/2025 08:41:09.075', openMissing: true, closeMissing: false, ...p });
const row = (key: string, d: RowDates, t: Partial<NormalizedTrade> = {}): ReviewRow => ({ ...makeRows([trade(t)], 'Screenshot 1')[0], key, dates: d });

beforeEach(() => patchUiState({ timeZone: 'Asia/Kolkata' }));
afterEach(() => {
  localStorage.clear();
  resetUiStateCache();
});

describe('readCell + resolveCell (twin of the server reader)', () => {
  const now = new Date('2026-11-13T06:00:00Z');
  it('reads the cTrader cell either way, keeping seconds and milliseconds', () => {
    expect(resolveCell(readCell('03/12/2025 08:41:09.075'), 'DMY', now)).toBe('2025-12-03T08:41:09.075');
    expect(resolveCell(readCell('03/12/2025 08:41:09.075'), 'MDY', now)).toBe('2025-03-12T08:41:09.075');
  });
  it('reads MT4 dots, month names, 12-hour clocks and 2-digit years', () => {
    expect(resolveCell(readCell('2025.12.03 08:41'), 'MDY', now)).toBe('2025-12-03T08:41:00');
    expect(resolveCell(readCell('Dec 3, 2025 8:41 PM'), 'DMY', now)).toBe('2025-12-03T20:41:00');
    expect(resolveCell(readCell('12/3/25 12:05 AM'), 'MDY', now)).toBe('2025-12-03T00:05:00');
    expect(resolveCell(readCell(''), 'DMY', now)).toBeNull();
  });
});

describe('extractedToUtc', () => {
  it('reads a wall clock on the app zone clock with seconds and milliseconds; an instant with a zone stays that instant', () => {
    expect(extractedToUtc('2025-12-03T08:41:09.075')).toBe('2025-12-03T03:11:09.075Z');
    patchUiState({ timeZone: 'America/New_York' });
    expect(extractedToUtc('2025-12-03T08:41:09')).toBe('2025-12-03T13:41:09.000Z');
    expect(extractedToUtc('2025-12-03T08:41:09Z')).toBe('2025-12-03T08:41:09.000Z');
    expect(extractedToUtc('')).toBe('');
    expect(extractedToUtc('soon')).toBe('');
  });

  it('fromExtracted uses it for both dates', () => {
    const t = fromExtracted({ symbol: 'A', side: 'BUY', quantity: 1, openDate: '2025-12-03T08:41:09.075', closeDate: '2025-12-03T08:41:09.075', entryPrice: 1, exitPrice: 2, pnl: 1 });
    expect(t.openDate).toBe('2025-12-03T03:11:09.075Z');
    expect(t.closeDate).toBe(t.openDate);
  });
});

describe('rowDatesOf', () => {
  it('numbers the screenshot across batches and carries the flags; nothing from an older server', () => {
    const item = { image: 1, openDateRaw: '', closeDateRaw: '03/12/2025 08:41', openDateMissing: true };
    const images = [{ image: 1, dateOrder: 'DMY' as const, dateOrderSource: 'region' as const, canSwitch: true }];
    expect(rowDatesOf(item, images, 2)).toEqual({ shot: 8, order: 'DMY', source: 'region', canSwitch: true, openRaw: '', closeRaw: '03/12/2025 08:41', openMissing: true, closeMissing: false });
    expect(rowDatesOf(item, undefined, 0)).toBeUndefined();
  });
});

describe('switchDateOrder', () => {
  it('re-reads only the rows of that screenshot with the other order, and back again', () => {
    const rows = [
      row('a', dates(), { openDate: '2025-12-03T03:11:09.075Z', closeDate: '2025-12-03T03:11:09.075Z' }),
      row('b', dates({ shot: 2 }), { openDate: '2025-12-03T03:11:09.075Z', closeDate: '2025-12-03T03:11:09.075Z' }),
    ];
    const once = switchDateOrder(rows, 1);
    expect(once[0].trade.closeDate).toBe('2025-03-12T03:11:09.075Z');
    expect(once[0].trade.openDate).toBe(once[0].trade.closeDate);
    expect(once[0].dates).toMatchObject({ order: 'MDY', openMissing: true });
    expect(once[1]).toBe(rows[1]);
    expect(switchDateOrder(once, 1)[0].trade.closeDate).toBe('2025-12-03T03:11:09.075Z');
  });

  it('leaves saved rows and ISO screenshots alone', () => {
    const saved = { ...row('a', dates()), saved: true };
    const iso = row('b', dates({ order: 'YMD', canSwitch: false }));
    expect(switchDateOrder([saved, iso], 1)).toEqual([saved, iso]);
  });
});

describe('switchableReadings and the missing-time flags', () => {
  it('lists each switchable screenshot once with an example cell', () => {
    const rows = [row('a', dates(), { closeDate: '2025-12-03T03:11:09.075Z' }), row('b', dates()), row('c', dates({ shot: 2, canSwitch: false }))];
    expect(switchableReadings(rows)).toEqual([{ shot: 1, order: 'DMY', source: 'default', example: { raw: '03/12/2025 08:41:09.075', iso: '2025-12-03T03:11:09.075Z' } }]);
  });

  it('counts and words rows with no open time; editing the open date clears the flag', () => {
    const rows = [row('a', dates()), row('b', dates({ openMissing: false, closeMissing: true })), row('c', dates({ openMissing: false }))];
    expect(missingTimeCounts(rows)).toEqual({ open: 1, close: 1 });
    expect(missingTimeNote(rows[0])).toBe('Open time not in the screenshot — set it or keep the close time.');
    expect(missingTimeNote(rows[2])).toBeNull();
    const edited = editRow(rows, 'a', 'openDate', '2025-12-03T02:00:00.000Z');
    expect(edited[0].dates?.openMissing).toBe(false);
    expect(edited[0].trade.openDate).toBe('2025-12-03T02:00:00.000Z');
    expect(missingTimeCounts(edited).open).toBe(0);
  });
});
