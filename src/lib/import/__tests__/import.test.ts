import { describe, expect, it } from 'vitest';
import type { NormalizedTrade } from '@/types/import';
import { chunk, fileToBase64, importErrorMessage, importKey, ImportFileError, MAX_IMPORT_FILE_BYTES, toCreateItems } from '../index';

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'NIFTY2641324000CE', side: 'BUY', quantity: 75, entryPrice: 120.5, exitPrice: 150.25, openDate: '2026-04-08T04:00:10.000Z', closeDate: '2026-04-08T05:30:45.000Z',
  outcome: 'TP', pnl: 2158.47, stopLoss: null, takeProfit: null, tags: [], assetClass: 'options', fees: 72.78, grossPnl: 2231.25, underlying: 'NIFTY', optionType: 'call', strike: 24000, expiry: '2026-04-13',
  externalId: 'zerodha:41000006:41000007', importSource: 'zerodha', charges: { brokerage: 40, stt: 16.9, exchange: 7.11, sebi: 0.02, stamp: 0.27, gst: 8.48, other: 0 }, chargesEstimated: true, fills: 2, ...p,
});

describe('toCreateItems', () => {
  it('maps to backend fields with the idempotency key and drops response-only fields', () => {
    const [item] = toCreateItems([trade()], 'acc1');
    expect(item).toMatchObject({ accountIds: ['acc1'], idempotencyKey: 'imp|acc1|zerodha|zerodha:41000006:41000007', fees: 72.78, grossPnl: 2231.25, assetClass: 'options', optionType: 'call', strike: 24000, expiry: '2026-04-13', externalId: 'zerodha:41000006:41000007', importSource: 'zerodha' });
    expect(item).not.toHaveProperty('charges');
    expect(item).not.toHaveProperty('chargesEstimated');
    expect(item).not.toHaveProperty('fills');
    expect(item).not.toHaveProperty('duplicate');
    expect(item).not.toHaveProperty('stopLoss');
  });

  it('keeps a real stop, skips parse-time duplicates by default and honours the selection', () => {
    const a = trade({ externalId: 'a', stopLoss: 100 });
    const b = trade({ externalId: 'b', duplicate: true });
    const c = trade({ externalId: 'c' });
    expect(toCreateItems([a, b, c], 'x').map((i) => i.externalId)).toEqual(['a', 'c']);
    expect(toCreateItems([a, b, c], 'x')[0].stopLoss).toBe(100);
    expect(toCreateItems([a, b, c], 'x', { skipDuplicates: false }).map((i) => i.externalId)).toEqual(['a', 'b', 'c']);
    expect(toCreateItems([a, b, c], 'x', { only: new Set(['c']) }).map((i) => i.externalId)).toEqual(['c']);
  });

  it('adds the batch id to every item when given', () => {
    expect(toCreateItems([trade()], 'a', { batchId: 'b-1' })[0].importBatchId).toBe('b-1');
    expect(toCreateItems([trade()], 'a')[0]).not.toHaveProperty('importBatchId');
  });

  it('the key matches the backend format (same file, same account → same key)', () => {
    expect(importKey('acc1', { importSource: 'mt4', externalId: 'mt4:50010001' })).toBe('imp|acc1|mt4|mt4:50010001');
  });
});

describe('chunk', () => {
  it('splits into pieces of at most 50', () => {
    expect(chunk(Array.from({ length: 120 }, (_, i) => i)).map((c) => c.length)).toEqual([50, 50, 20]);
    expect(chunk([])).toEqual([]);
  });
});

describe('fileToBase64', () => {
  it('encodes bytes exactly', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 65]);
    expect(await fileToBase64(new Blob([bytes]))).toBe(btoa(String.fromCharCode(...bytes)));
  });

  it('encodes a large file without overflowing the call stack', async () => {
    const big = new Uint8Array(3 * 1024 * 1024).fill(97);
    expect((await fileToBase64(new Blob([big]))).length).toBe(Math.ceil(big.length / 3) * 4);
  });

  it('rejects empty and oversized files with a readable error', async () => {
    await expect(fileToBase64(new Blob([]))).rejects.toBeInstanceOf(ImportFileError);
    await expect(fileToBase64({ size: MAX_IMPORT_FILE_BYTES + 1 } as Blob)).rejects.toThrow(/4 MB/);
  });
});

describe('importErrorMessage', () => {
  it('402 quota → upgrade data and a reset date', () => {
    const r = importErrorMessage({ status: 402, data: { errorCode: 'QUOTA_EXCEEDED', error: { code: 'QUOTA_EXCEEDED', feature: 'broker_import', limit: 3, resetsAt: '2026-12-01T00:00:00.000Z' } } });
    expect(r.upgrade).toEqual({ code: 'QUOTA_EXCEEDED', feature: 'broker_import', limit: 3, resetsAt: '2026-12-01T00:00:00.000Z' });
    expect(r.message).toMatch(/2026-12-01/);
  });

  it('402 TRIAL_EXPIRED → the API message, never the broker-import quota sentence', () => {
    const message = 'Your free trial has ended. Upgrade to Pro to add, edit or delete.';
    expect(importErrorMessage({ status: 402, data: { success: false, errorCode: 'TRIAL_EXPIRED', message } })).toEqual({ message, upgrade: { code: 'TRIAL_EXPIRED' } });
  });

  it('402 plan required, 413, 400, network and unknown', () => {
    expect(importErrorMessage({ status: 402, data: { errorCode: 'PLAN_REQUIRED', error: { code: 'PLAN_REQUIRED' } } }).upgrade?.code).toBe('PLAN_REQUIRED');
    expect(importErrorMessage({ status: 413 }).message).toMatch(/4 MB/);
    expect(importErrorMessage({ status: 400, data: { errorMessage: 'accountId must be a non-empty string.' } }).message).toBe('accountId must be a non-empty string.');
    expect(importErrorMessage({ status: 'FETCH_ERROR', data: 'x' }).message).toMatch(/internet connection/i);
    expect(importErrorMessage({ status: 'TIMEOUT_ERROR' }).message).toMatch(/timed out/i);
    expect(importErrorMessage({ status: 500, data: { message: 'The parser is down for maintenance.' } }).message).toBe('The parser is down for maintenance.');
    expect(importErrorMessage({ status: 502, data: '<html>Bad Gateway</html>' }).message).toMatch(/temporarily unavailable/);
    expect(importErrorMessage(undefined).message).toMatch(/Something went wrong/);
    expect(importErrorMessage(new ImportFileError('The file is empty.')).message).toBe('The file is empty.');
  });
});
