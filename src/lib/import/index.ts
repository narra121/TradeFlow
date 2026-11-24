/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import type { ImportCreateItem, NormalizedTrade } from '@/types/import';
import { readApiError } from '@/lib/apiError';
import { TRIAL_EXPIRED_MESSAGE } from '@/lib/planErrors';

export const MAX_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
/** POST /trades accepts at most 50 items per request. */
export const SAVE_CHUNK_SIZE = 50;

export class ImportFileError extends Error {}

/** UTF-16 text with a byte-order mark (MetaTrader 5 saves its HTML reports so) → UTF-8, which halves an ASCII report. */
function utf16ToUtf8(bytes: Uint8Array): Uint8Array {
  const le = bytes[0] === 0xff && bytes[1] === 0xfe;
  if (!le && !(bytes[0] === 0xfe && bytes[1] === 0xff)) return bytes;
  return new TextEncoder().encode(new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(bytes));
}

/** File → base64 for POST /import/parse. Rejects files the backend would refuse anyway (the limit applies after UTF-16 → UTF-8). */
export async function fileToBase64(file: Blob): Promise<string> {
  const tooLarge = () => new ImportFileError('The file is larger than 4 MB. Export a shorter date range.');
  if (file.size > 2 * MAX_IMPORT_FILE_BYTES) throw tooLarge();
  if (file.size === 0) throw new ImportFileError('The file is empty.');
  const bytes = utf16ToUtf8(new Uint8Array(await file.arrayBuffer()));
  if (bytes.length > MAX_IMPORT_FILE_BYTES) throw tooLarge();
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
  upgrade?: { code: 'QUOTA_EXCEEDED' | 'PLAN_REQUIRED' | 'TRIAL_EXPIRED'; feature?: string; limit?: number; resetsAt?: string };
}

/** RTK Query error (or thrown error) → text and, for plan errors, upgrade data. */
export function importErrorMessage(err: unknown): ImportErrorInfo {
  if (err instanceof ImportFileError) return { message: err.message };
  const e = (err ?? {}) as { status?: number | string; data?: any; message?: string };
  const body = e.data && typeof e.data === 'object' ? e.data : {};
  const rawStatus = e.status;
  const status = typeof rawStatus === 'number' ? rawStatus : (body.statusCode as number | undefined);
  if (status === 402) {
    const info = (body.error && typeof body.error === 'object' ? body.error : {}) as Record<string, any>;
    if (body.errorCode === 'TRIAL_EXPIRED') return { message: typeof body.message === 'string' && body.message ? body.message : TRIAL_EXPIRED_MESSAGE, upgrade: { code: 'TRIAL_EXPIRED' } };
    const code = info.code === 'PLAN_REQUIRED' || body.errorCode === 'PLAN_REQUIRED' ? 'PLAN_REQUIRED' : 'QUOTA_EXCEEDED';
    const when = typeof info.resetsAt === 'string' ? ` Your limit resets on ${info.resetsAt.slice(0, 10)}.` : '';
    return {
      message: code === 'PLAN_REQUIRED' ? 'This is part of the Pro plan.' : `You have used all of this month's broker imports.${when}`,
      upgrade: { code, feature: info.feature, limit: info.limit, resetsAt: info.resetsAt },
    };
  }
  if (status === 413) return { message: 'The file is larger than 4 MB. Export a shorter date range.' };
  return { message: readApiError(err, status === 400 ? 'The request was not valid.' : 'Something went wrong while importing. Please try again.').message };
}
