import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { importFlow } from '@/lib/importFlowStore';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import { zoneOffsetMinutes } from '@/lib/appTimeZone';
import { makeRows } from '@/lib/import/rows';
import { PLAN_SIGNAL_EVENT } from '@/lib/planErrors';
import type { NormalizedTrade, ParseImportResponse, SaveImportedResult } from '@/types/import';
import { useImportActions } from '../useImportActions';

const call = (value: unknown, fail = false) => ({ unwrap: () => (fail ? Promise.reject(value) : Promise.resolve(value)), abort: vi.fn() });
const parse = vi.fn();
const extract = vi.fn();
const save = vi.fn();
const bulkDelete = vi.fn();
const navigate = vi.fn();
const dispatch = vi.fn();
let usage: { feature: string; used: number; limit: number | null }[] = [];
let readOnly = false;

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ usage, readOnly, periodResetsAt: '2026-12-01T00:00:00.000Z' }) }));
vi.mock('@/store/hooks', () => ({ useAppDispatch: () => dispatch }));
vi.mock('@/store/api', () => ({ useBulkDeleteTradesMutation: () => [bulkDelete] }));
vi.mock('@/store/api/importApi', () => ({
  importApi: { util: { invalidateTags: (t: unknown) => ({ type: 'invalidate', payload: t }) } },
  useParseImportMutation: () => [parse],
  useExtractScreenshotsMutation: () => [extract],
  useSaveImportedTradesMutation: () => [save],
}));
vi.mock('@/lib/analytics', () => ({ trackImportCompleted: vi.fn() }));
// jsdom cannot decode images, so the real fitScreenshot would return its input; a test can make it shrink a file.
const fit = vi.hoisted(() => vi.fn());
vi.mock('@/lib/import/screenshot', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/import/screenshot')>()), fitScreenshot: (f: File) => fit(f) }));

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'NIFTY', side: 'BUY', quantity: 10, entryPrice: 100, exitPrice: 105, openDate: '2026-10-02T03:45:00.000Z', closeDate: '2026-10-02T06:10:00.000Z',
  outcome: 'TP', pnl: 48.5, stopLoss: null, takeProfit: null, tags: [], assetClass: 'stock', fees: 1.5, grossPnl: 50, externalId: 'a', importSource: 'generic_csv', ...p,
});
const parsed = (p: Partial<ParseImportResponse> = {}): ParseImportResponse => ({ detectedSource: 'zerodha', trades: [trade({ externalId: '1' }), trade({ externalId: '2', duplicate: true })], warnings: [], skipped: 0, ...p });
const csv = (name = 'tradebook.csv') => new File(['symbol,side\nA,buy'], name, { type: 'text/csv' });
const png = (name = 's.png', size = 100) => new File([new Uint8Array(size)], name, { type: 'image/png' });
const saved = (p: Partial<SaveImportedResult> = {}): SaveImportedResult => ({ created: 1, skipped: 0, errors: 0, failed: 0, batchId: 'b1', createdIds: ['t1'], failedExternalIds: [], ...p });

beforeEach(() => {
  [parse, extract, save, bulkDelete, navigate, dispatch, fit].forEach((f) => f.mockReset());
  fit.mockImplementation(async (f: File) => f);
  usage = [];
  readOnly = false;
  act(() => importFlow.reset());
  act(() => importFlow.set({ accountId: 'a1', source: 'auto' }));
});

const setup = () => renderHook(() => useImportActions()).result.current;
/** The hook must be rendered outside `act`, or its effects have not run when the result is read. */
const run = async (fn: (a: ReturnType<typeof setup>) => unknown) => {
  const a = setup();
  await act(async () => {
    await fn(a);
  });
};

describe('the returned actions', () => {
  it('are one object across re-renders, so listeners that depend on it do not re-subscribe', () => {
    const { result, rerender } = renderHook(() => useImportActions());
    const first = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('addFiles', () => {
  it('needs an account first', async () => {
    act(() => importFlow.set({ accountId: null }));
    await run((x) => x.addFiles([csv()]));
    expect(importFlow.get().error).toBe('Choose the account these trades belong to first.');
    expect(parse).not.toHaveBeenCalled();
  });

  it('rejects unsupported files and mixed kinds without calling the API', async () => {
    await run((x) => x.addFiles([new File(['x'], 'notes.pdf', { type: 'application/pdf' })]));
    expect(importFlow.get().error).toMatch(/notes\.pdf can’t be imported/);
    await run((x) => x.addFiles([csv(), png()]));
    expect(importFlow.get().error).toMatch(/either broker files or screenshots/);
    expect(parse).not.toHaveBeenCalled();
    expect(extract).not.toHaveBeenCalled();
  });

  it('after the trial, opens the upgrade dialog (TRIAL_EXPIRED) before uploading anything', async () => {
    readOnly = true;
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    await run((x) => x.addFiles([csv()]));
    window.removeEventListener(PLAN_SIGNAL_EVENT, seen);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ code: 'TRIAL_EXPIRED', kind: 'mutation' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('after the trial there is no writable account, and a file still opens the upgrade dialog, not "choose the account"', async () => {
    readOnly = true;
    act(() => importFlow.set({ accountId: null }));
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    await run((x) => x.addFiles([png()]));
    window.removeEventListener(PLAN_SIGNAL_EVENT, seen);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ code: 'TRIAL_EXPIRED', kind: 'mutation' });
    expect(importFlow.get().error).toBeNull();
    expect(extract).not.toHaveBeenCalled();
  });

  it('opens the upgrade dialog before uploading when the quota is used up', async () => {
    usage = [{ feature: 'broker_import', used: 3, limit: 3 }];
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    await run((x) => x.addFiles([csv()]));
    window.removeEventListener(PLAN_SIGNAL_EVENT, seen);
    expect(seen).toHaveBeenCalledTimes(1);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ code: 'QUOTA_EXCEEDED', feature: 'broker_import', limit: 3, kind: 'mutation' });
    expect(parse).not.toHaveBeenCalled();
  });

  describe('the clock of the file (X-009)', () => {
    afterEach(() => {
      localStorage.clear();
      resetUiStateCache();
    });

    it('a generic CSV is read in the app time zone, not the IST default of the parser', async () => {
      patchUiState({ timeZone: 'America/New_York' });
      act(() => importFlow.set({ source: 'generic_csv' }));
      parse.mockReturnValue(call(parsed({ detectedSource: 'generic_csv' })));
      await run((x) => x.addFiles([csv()]));
      expect(parse.mock.calls[0][0].utcOffsetMinutes).toBe(zoneOffsetMinutes(new Date(), 'America/New_York'));
      expect([-300, -240]).toContain(parse.mock.calls[0][0].utcOffsetMinutes);
    });

    it('with no saved zone it sends the offset of this browser', async () => {
      act(() => importFlow.set({ source: 'generic_csv' }));
      parse.mockReturnValue(call(parsed({ detectedSource: 'generic_csv' })));
      await run((x) => x.addFiles([csv()]));
      // `|| 0`: in UTC the negation gives -0, which toBe (Object.is) does not equal to the 0 sent.
      expect(parse.mock.calls[0][0].utcOffsetMinutes).toBe(-new Date().getTimezoneOffset() || 0);
    });

    it('the generic fallback after auto-detect finds no broker sends it too, and so does a column mapping', async () => {
      patchUiState({ timeZone: 'Asia/Kolkata' });
      parse
        .mockReturnValueOnce(call(parsed({ detectedSource: 'unknown', trades: [] })))
        .mockReturnValueOnce(call(parsed({ detectedSource: 'generic_csv', trades: [], columns: { headers: ['a', 'b'], suggested: {} } })));
      await run((x) => x.addFiles([csv()]));
      expect(parse.mock.calls[0][0].utcOffsetMinutes).toBeUndefined();
      expect(parse.mock.calls[1][0]).toMatchObject({ source: 'generic_csv', utcOffsetMinutes: 330 });
      parse.mockReturnValueOnce(call(parsed({ detectedSource: 'generic_csv' })));
      await run((x) => x.reparse({ symbol: 'a' }));
      expect(parse.mock.calls[2][0]).toMatchObject({ mapping: { symbol: 'a' }, utcOffsetMinutes: 330 });
    });

    it('a broker with its own clock keeps the parser default: nothing is sent for Auto-detect or a named broker', async () => {
      patchUiState({ timeZone: 'America/New_York' });
      parse.mockReturnValue(call(parsed()));
      await run((x) => x.addFiles([csv()]));
      act(() => importFlow.set({ source: 'zerodha' }));
      await run((x) => x.reparse());
      for (const [req] of parse.mock.calls) expect(req.utcOffsetMinutes).toBeUndefined();
    });
  });

  it('parses a broker file into rows; duplicates start unchecked; the file is kept for a re-check', async () => {
    parse.mockReturnValue(call(parsed()));
    await run((x) => x.addFiles([csv()]));
    const s = importFlow.get();
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ source: 'auto', fileName: 'tradebook.csv', accountId: 'a1' }));
    expect(s.phase).toBe('review');
    expect(s.rows.map((r) => r.included)).toEqual([true, false]);
    expect(s.rawFile?.name).toBe('tradebook.csv');
    expect(s.detected).toBe('zerodha');
  });

  it('brings a line the parser dropped back as a row that needs a fix, with the line and the reason', async () => {
    const text = ['Symbol,Side,Quantity,Entry Price,Exit Price,Open Time,Close Time', 'NIFTY,Buy,10,100,105,2026-10-02 09:15,2026-10-02 11:40', 'BANKNIFTY,Buy,5,,240,2026-10-03 09:15,2026-10-03 10:40'].join('\n');
    parse.mockReturnValue(call(parsed({ detectedSource: 'generic_csv', trades: [trade({ symbol: 'NIFTY', quantity: 10, externalId: 'generic_csv:1' })], skipped: 1 })));
    await run((x) => x.addFiles([new File([text], 'odd.csv', { type: 'text/csv' })]));
    const s = importFlow.get();
    expect(s.rows).toHaveLength(2);
    expect(s.skipped).toBe(0);
    expect(s.rows[1].note).toBe('Line 3: the parser skipped this line. Entry price is missing or not readable.');
    expect(s.rows[1].trade).toMatchObject({ symbol: 'BANKNIFTY', quantity: 5, exitPrice: 240 });
  });

  it('keeps the count when the dropped lines cannot be matched to the file', async () => {
    parse.mockReturnValue(call(parsed({ detectedSource: 'zerodha', skipped: 3 })));
    await run((x) => x.addFiles([csv()]));
    expect(importFlow.get().skipped).toBe(3);
    expect(importFlow.get().rows).toHaveLength(2);
  });

  it('retries an unrecognised auto-detect as a generic CSV', async () => {
    parse.mockReturnValueOnce(call(parsed({ detectedSource: 'unknown', trades: [] }))).mockReturnValueOnce(call(parsed({ detectedSource: 'generic_csv' })));
    await run((x) => x.addFiles([csv()]));
    expect(parse.mock.calls[1][0]).toMatchObject({ source: 'generic_csv' });
    expect(importFlow.get().rows).toHaveLength(2);
  });

  it('shows the column mapping when the parser asks for one, and applies the remembered mapping next time', async () => {
    const columns = { headers: ['Scrip', 'B/S'], suggested: { symbol: 'Scrip' } };
    parse.mockReturnValue(call(parsed({ detectedSource: 'generic_csv', trades: [], columns })));
    await run((x) => x.addFiles([csv()]));
    expect(importFlow.get().columns).toEqual(columns);

    parse.mockReset();
    parse.mockReturnValueOnce(call(parsed({ detectedSource: 'generic_csv', trades: [], columns }))).mockReturnValueOnce(call(parsed({ detectedSource: 'generic_csv' })));
    act(() => importFlow.reset());
    await run((x) => x.reparse({ symbol: 'Scrip', side: 'B/S' }));
    // reparse without a kept file does nothing
    expect(parse).not.toHaveBeenCalled();
  });

  it('Detect automatically on a kept file falls back to the generic layout like a first read', async () => {
    parse.mockReturnValueOnce(call(parsed({ detectedSource: 'unknown', trades: [] }))).mockReturnValueOnce(call(parsed({ detectedSource: 'generic_csv' })));
    act(() => importFlow.set({ source: 'auto', rawFile: { name: 'f.csv', contentBase64: btoa('x') }, phase: 'review' }));
    await run((x) => x.reparse());
    expect(parse.mock.calls[1][0]).toMatchObject({ source: 'generic_csv' });
    expect(importFlow.get().rows).toHaveLength(2);
  });

  it('reports a parse failure inline and keeps the page usable', async () => {
    parse.mockReturnValue(call({ status: 400, data: { errorMessage: 'This file is empty.' } }, true));
    await run((x) => x.addFiles([csv()]));
    expect(importFlow.get().phase).toBe('idle');
    expect(importFlow.get().error).toBe('This file is empty.');
  });

  it('shrinks an oversized screenshot instead of refusing it, and sends the smaller image', async () => {
    const shrunk = new File([new Uint8Array(500_000)], 'big.jpg', { type: 'image/jpeg' });
    fit.mockResolvedValueOnce(shrunk);
    extract.mockReturnValue(call({ items: [] }));
    await run((x) => x.addFiles([png('big.png', 3 * 1024 * 1024)]));
    expect(importFlow.get().error).not.toMatch(/larger than 1 MB/);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(extract.mock.calls[0][0].images[0].length).toBeLessThan(1_000_000); // the 500 KB image, not the 3 MB one
  });

  it('refuses screenshots above 1 MB by name instead of dropping them', async () => {
    await run((x) => x.addFiles([png('big.png', 1024 * 1024 + 1)]));
    expect(importFlow.get().error).toMatch(/big\.png is larger than 1 MB/);
    expect(extract).not.toHaveBeenCalled();
  });

  it('reads screenshots three at a time and tags rows with their batch', async () => {
    extract
      .mockReturnValueOnce(call({ items: [{ symbol: 'EURUSD', side: 'BUY', quantity: 1, openDate: '2026-11-03T09:00:00Z', closeDate: '2026-11-03T10:00:00Z', entryPrice: 1, exitPrice: 2, pnl: 1 }] }))
      .mockReturnValueOnce(call({ items: [] }));
    await run((x) => x.addFiles([png('1.png'), png('2.png'), png('3.png'), png('4.png')]));
    expect(extract).toHaveBeenCalledTimes(2);
    expect(extract.mock.calls[0][0].images).toHaveLength(3);
    expect(extract.mock.calls[1][0].images).toHaveLength(1);
    const s = importFlow.get();
    expect(s.phase).toBe('review');
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]).toMatchObject({ source: 'Screenshots 1–3', batch: 0 });
    expect(s.warnings.join(' ')).toMatch(/Screenshot 4: no trades found/);
  });

  it('screenshot rows carry how their dates were read; the app zone is sent; switching re-reads that screenshot (undoable)', async () => {
    patchUiState({ timeZone: 'Asia/Kolkata' });
    extract.mockReturnValue(
      call({
        items: [
          { symbol: 'XAUUSD', side: 'BUY', quantity: 0.92, openDate: '2025-12-03T08:41:09.075', closeDate: '2025-12-03T08:41:09.075', entryPrice: 4220.8, exitPrice: 4221.2, pnl: 32.2, image: 0, openDateRaw: '', closeDateRaw: '03/12/2025 08:41:09.075', openDateMissing: true, closeDateMissing: false },
        ],
        images: [{ image: 0, dateOrder: 'DMY', dateOrderSource: 'default', canSwitch: true, timeColumns: { open: null, close: 'Closing time' } }],
      }),
    );
    await run((x) => x.addFiles([png('ctrader.png')]));
    expect(extract.mock.calls[0][0].timeZone).toBe('Asia/Kolkata');
    const [r] = importFlow.get().rows;
    expect(r.trade.closeDate).toBe('2025-12-03T03:11:09.075Z');
    expect(r.trade.openDate).toBe(r.trade.closeDate);
    expect(r.dates).toEqual({ shot: 1, order: 'DMY', source: 'default', canSwitch: true, openRaw: '', closeRaw: '03/12/2025 08:41:09.075', openMissing: true, closeMissing: false });

    await run((x) => x.switchDates(1));
    expect(importFlow.get().rows[0].trade.closeDate).toBe('2025-03-12T03:11:09.075Z');
    expect(importFlow.get().rows[0].dates?.order).toBe('MDY');
    expect(save).not.toHaveBeenCalled();
    await run((x) => x.undoRows());
    expect(importFlow.get().rows[0].trade.closeDate).toBe('2025-12-03T03:11:09.075Z');
    localStorage.clear();
    resetUiStateCache();
  });

  it('a second file adds rows and marks rows already in the review as duplicates', async () => {
    parse.mockReturnValueOnce(call(parsed({ trades: [trade({ externalId: '1' })] }))).mockReturnValueOnce(call(parsed({ trades: [trade({ externalId: '1' }), trade({ externalId: '9' })] })));
    await run((x) => x.addFiles([csv('a.csv')]));
    await run((x) => x.addFiles([csv('b.csv')], { append: true }));
    const rows = importFlow.get().rows;
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => [r.trade.externalId, r.included])).toEqual([['1', true], ['1', false], ['9', true]]);
    expect(importFlow.get().fileLabel).toBe('a.csv, b.csv');
  });
});

describe('saveRows', () => {
  const seed = () =>
    act(() =>
      importFlow.set({
        phase: 'review',
        accountId: 'a1',
        detected: 'zerodha',
        rows: makeRows([trade({ externalId: '1' }), trade({ externalId: '2' }), trade({ externalId: '3', duplicate: true }), trade({ externalId: '4', exitPrice: 0 })], 'f.csv'),
      }),
    );

  it('does not save while a checked row needs a fix', async () => {
    seed();
    await run((x) => x.saveRows());
    expect(save).not.toHaveBeenCalled();
  });

  it('saves the ready rows only, marks them imported and keeps the created ids for Undo', async () => {
    seed();
    const a = setup();
    act(() => a.toggle([importFlow.get().rows[3].key], false));
    save.mockReturnValue(call(saved({ created: 2, createdIds: ['t1', 't2'] })));
    await act(() => a.saveRows());
    expect(save).toHaveBeenCalledTimes(1);
    const arg = save.mock.calls[0][0];
    expect(arg.accountId).toBe('a1');
    expect(arg.trades.map((t: NormalizedTrade) => t.externalId)).toEqual(['1', '2']);
    const s = importFlow.get();
    expect(s.phase).toBe('done');
    expect(s.result?.createdIds).toEqual(['t1', 't2']);
    expect(s.rows.filter((r) => r.saved)).toHaveLength(2);
  });

  it('groups rows moved to another account into their own save under the same batch', async () => {
    seed();
    const a = setup();
    act(() => a.toggle([importFlow.get().rows[3].key], false));
    act(() => a.move([importFlow.get().rows[1].key], 'a2'));
    save.mockReturnValueOnce(call(saved({ batchId: 'B', createdIds: ['t1'] }))).mockReturnValueOnce(call(saved({ batchId: 'B', createdIds: ['t2'] })));
    await act(() => a.saveRows());
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls.map((c) => c[0].accountId)).toEqual(['a1', 'a2']);
    expect(save.mock.calls[1][0].batchId).toBe('B');
    expect(importFlow.get().result).toMatchObject({ created: 2, createdIds: ['t1', 't2'], batchId: 'B' });
  });

  it('after a partial failure keeps the result open and retries exactly the failed rows in the same batch', async () => {
    seed();
    const a = setup();
    act(() => a.toggle([importFlow.get().rows[3].key], false));
    save.mockReturnValueOnce(call(saved({ created: 1, failed: 1, createdIds: ['t1'], failedExternalIds: ['2'] })));
    await act(() => a.saveRows());
    expect(importFlow.get().phase).toBe('review');
    expect(importFlow.get().result).toMatchObject({ created: 1, failed: 1 });
    expect(importFlow.get().rows.map((r) => !!r.saved)).toEqual([true, false, false, false]);

    save.mockReturnValueOnce(call(saved({ created: 1, createdIds: ['t2'], batchId: 'b1' })));
    await act(() => a.saveRows({ retry: true }));
    expect(save.mock.calls[1][0].trades.map((t: NormalizedTrade) => t.externalId)).toEqual(['2']);
    expect(save.mock.calls[1][0].batchId).toBe('b1');
    expect(importFlow.get().phase).toBe('done');
    expect(importFlow.get().result).toMatchObject({ created: 2, failed: 0, createdIds: ['t1', 't2'] });
  });

  it('when every chunk fails the rows stay in review with an inline message', async () => {
    seed();
    const a = setup();
    act(() => a.toggle([importFlow.get().rows[3].key], false));
    save.mockReturnValue(call({ status: 'FETCH_ERROR', data: 'Network error. Please try again.' }, true));
    await act(() => a.saveRows());
    const s = importFlow.get();
    expect(s.phase).toBe('review');
    expect(s.result).toBeNull();
    expect(s.error).toMatch(/Couldn’t save the trades/);
    expect(s.rows.some((r) => r.saved)).toBe(false);
  });
});

describe('undo and view', () => {
  const done = () =>
    act(() =>
      importFlow.set({
        phase: 'done',
        accountId: 'a1',
        rows: makeRows([trade({ externalId: '1', openDate: '2026-10-02T03:45:00.000Z' }), trade({ externalId: '2', openDate: '2026-10-05T03:45:00.000Z', closeDate: '2026-10-06T03:45:00.000Z' })], 'f').map((r) => ({ ...r, saved: true })),
        result: saved({ created: 2, createdIds: ['t1', 't2'], batchId: 'B' }),
      }),
    );

  it('Undo import deletes exactly the created ids and returns the rows to the review', async () => {
    done();
    bulkDelete.mockReturnValue(call({}));
    await run((x) => x.undoImport());
    expect(bulkDelete).toHaveBeenCalledWith({ tradeIds: ['t1', 't2'] });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'invalidate', payload: ['ImportBatches'] }));
    const s = importFlow.get();
    expect(s.phase).toBe('review');
    expect(s.result).toBeNull();
    expect(s.rows.every((r) => !r.saved)).toBe(true);
  });

  it('a failed undo keeps the result and says so', async () => {
    done();
    bulkDelete.mockReturnValue(call({ status: 500 }, true));
    await run((x) => x.undoImport());
    expect(importFlow.get().phase).toBe('done');
    expect(importFlow.get().error).toMatch(/Couldn’t undo the import/);
  });

  it('opens an older import by its own account and span', () => {
    const a = setup();
    a.viewBatch({ batchId: 'old', accountId: 'a2', source: 'zerodha', importedAt: '2026-10-01T00:00:00.000Z', count: 3, from: '2026-09-01T03:00:00.000Z', to: '2026-09-20T03:00:00.000Z' });
    expect(dispatch.mock.calls[0][0].payload).toBe('a2');
    expect(dispatch.mock.calls[1][0].payload).toMatchObject({ datePreset: 'custom' });
    expect(navigate).toHaveBeenCalledWith('/app/tradelog?importBatch=old');
  });

  it('remembers the file name of a saved batch on this device', async () => {
    localStorage.clear();
    act(() => importFlow.set({ phase: 'review', accountId: 'a1', fileLabel: 'tradebook-oct.csv', detected: 'zerodha', rows: makeRows([trade({ externalId: '1' })], 'f.csv') }));
    save.mockReturnValue(call(saved({ batchId: 'B7' })));
    await run((x) => x.saveRows());
    expect(JSON.parse(localStorage.getItem('tq.import.files') ?? '{}')).toEqual({ B7: 'tradebook-oct.csv' });
  });

  it('View imported trades sets the account and the span of the imported trades, then opens Trades for the batch', () => {
    done();
    const a = setup();
    a.viewImported();
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[1][0].payload).toMatchObject({ datePreset: 'custom' });
    expect(navigate).toHaveBeenCalledWith('/app/tradelog?importBatch=B');
  });
});

describe('row actions', () => {
  it('exclude, merge and move keep one undo step', () => {
    act(() => importFlow.set({ phase: 'review', rows: makeRows([trade({ externalId: '1' }), trade({ externalId: '2' })], 'f') }));
    const a = setup();
    const keys = importFlow.get().rows.map((r) => r.key);
    act(() => a.toggle([keys[0]], false));
    expect(importFlow.get().rows[0].included).toBe(false);
    act(() => a.undoRows());
    expect(importFlow.get().rows[0].included).toBe(true);
    act(() => a.merge(keys));
    expect(importFlow.get().rows).toHaveLength(1);
    act(() => a.undoRows());
    expect(importFlow.get().rows).toHaveLength(2);
  });
});
