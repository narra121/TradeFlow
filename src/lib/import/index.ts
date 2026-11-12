/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import type { ImportCreateItem, NormalizedTrade } from '@/types/import';

export const MAX_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
/** POST /trades accepts at most 50 items per request. */
export const SAVE_CHUNK_SIZE = 50;

export class ImportFileError extends Error {}

/** File → base64 for POST /import/parse. Rejects files the backend would refuse anyway. */
export async function fileToBase64(file: Blob): Promise<string> {
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new ImportFileError('The file is larger than 4 MB. Export a shorter date range.');
  if (file.size === 0) throw new ImportFileError('The file is empty.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Idempotency key shared with the backend duplicate check (src/features/import/service.ts#importKey). */
export const importKey = (accountId: string, t: Pick<NormalizedTrade, 'importSource' | 'externalId'>) => `imp|${accountId}|${t.importSource}|${t.externalId}`;

export interface ToCreateItemsOptions {
  /** default true: trades the parse marked as already imported are not sent */
  skipDuplicates?: boolean;
  /** only these externalIds (the user's selection in the preview) */
  only?: ReadonlySet<string>;
  /** sent as importBatchId on every item */
  batchId?: string;
}

/** Parsed trades → `POST /trades {items}` bodies. Response-only fields (charges, fills, duplicate) are dropped. */
export function toCreateItems(trades: NormalizedTrade[], accountId: string, opts: ToCreateItemsOptions = {}): ImportCreateItem[] {
  const { skipDuplicates = true, only, batchId } = opts;
  return trades
    .filter((t) => !(skipDuplicates && t.duplicate) && (!only || only.has(t.externalId)))
    .map((t) => ({
      symbol: t.symbol,
      side: t.side,
      quantity: t.quantity,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      openDate: t.openDate,
      closeDate: t.closeDate,
      outcome: t.outcome,
      pnl: t.pnl,
      ...(t.stopLoss ? { stopLoss: t.stopLoss } : {}),
      ...(t.takeProfit ? { takeProfit: t.takeProfit } : {}),
      tags: t.tags,
      accountIds: [accountId],
      assetClass: t.assetClass,
      fees: t.fees,
      grossPnl: t.grossPnl,
      ...(t.contractMultiplier ? { contractMultiplier: t.contractMultiplier } : {}),
      ...(t.underlying ? { underlying: t.underlying } : {}),
      ...(t.optionType ? { optionType: t.optionType } : {}),
      ...(t.strike != null ? { strike: t.strike } : {}),
      ...(t.expiry ? { expiry: t.expiry } : {}),
      externalId: t.externalId,
      importSource: t.importSource,
      idempotencyKey: importKey(accountId, t),
      ...(batchId ? { importBatchId: batchId } : {}),
    }));
}

export function chunk<T>(items: T[], size = SAVE_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface ImportErrorInfo {
  message: string;
  /** set for 402: show the upgrade call to action */
  upgrade?: { code: 'QUOTA_EXCEEDED' | 'PLAN_REQUIRED'; feature?: string; limit?: number; resetsAt?: string };
}

/** RTK Query error (or thrown error) → text and, for plan errors, upgrade data. */
export function importErrorMessage(err: unknown): ImportErrorInfo {
  if (err instanceof ImportFileError) return { message: err.message };
  const e = (err ?? {}) as { status?: number | string; data?: any; message?: string };
  const body = e.data && typeof e.data === 'object' ? e.data : {};
  const rawStatus = e.status;
  const status = typeof rawStatus === 'number' ? rawStatus : (body.statusCode as number | undefined);
  const apiMessage: string | undefined = body.errorMessage || body.message || (typeof e.data === 'string' ? e.data : undefined);
  if (status === 402) {
    const info = (body.error && typeof body.error === 'object' ? body.error : {}) as Record<string, any>;
    const code = info.code === 'PLAN_REQUIRED' || body.errorCode === 'PLAN_REQUIRED' ? 'PLAN_REQUIRED' : 'QUOTA_EXCEEDED';
    const when = typeof info.resetsAt === 'string' ? ` Your limit resets on ${info.resetsAt.slice(0, 10)}.` : '';
    return {
      message: code === 'PLAN_REQUIRED' ? 'This is part of the Pro plan.' : `You have used all of this month's broker imports.${when}`,
      upgrade: { code, feature: info.feature, limit: info.limit, resetsAt: info.resetsAt },
    };
  }
  if (status === 413) return { message: 'The file is larger than 4 MB. Export a shorter date range.' };
  if (status === 400) return { message: apiMessage || 'The request was not valid.' };
  if (rawStatus === 'FETCH_ERROR' || rawStatus === 'TIMEOUT_ERROR') return { message: typeof e.data === 'string' ? e.data : 'Network error. Please try again.' };
  return { message: apiMessage || e.message || 'Something went wrong while importing. Please try again.' };
}
