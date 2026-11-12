// Mirrors JournalAWSSetup src/features/import (GET /import/sources, POST /import/parse).
import type { AssetClass } from './trade';

export type ImportSourceId = 'zerodha' | 'zerodha_pnl' | 'dhan' | 'upstox' | 'angelone' | 'groww' | 'mt4' | 'mt5' | 'generic_csv';

/** Rows read from screenshots by AI extraction; not a parser id (the API never returns it). */
export const SCREENSHOT_SOURCE = 'ai_screenshot' as const;
export type RowSource = ImportSourceId | typeof SCREENSHOT_SOURCE;

export type CanonicalField =
  | 'symbol' | 'side' | 'quantity' | 'price' | 'time' | 'date' | 'tradeId' | 'orderId'
  | 'entryPrice' | 'exitPrice' | 'openTime' | 'closeTime' | 'pnl' | 'fees' | 'stopLoss' | 'takeProfit';

export interface ImportSource {
  id: ImportSourceId;
  name: string;
  assetClasses: AssetClass[];
  fileTypes: string[];
  howToExport: string;
  sampleColumns: string[];
}

export interface ImportCharges {
  brokerage: number;
  stt: number;
  exchange: number;
  sebi: number;
  stamp: number;
  gst: number;
  other: number;
}

export interface NormalizedTrade {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  /** UTC ISO */
  openDate: string;
  closeDate: string;
  outcome: 'TP' | 'SL' | 'BREAKEVEN';
  /** NET of fees */
  pnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
  tags: string[];
  assetClass: AssetClass;
  fees: number;
  grossPnl: number;
  contractMultiplier?: number;
  underlying?: string;
  optionType?: 'call' | 'put';
  strike?: number;
  /** ISO date */
  expiry?: string;
  externalId: string;
  importSource: RowSource;
  /** response-only: not sent when saving */
  charges?: ImportCharges;
  chargesEstimated?: boolean;
  fills?: number;
  /** already imported into the requested account */
  duplicate?: boolean;
}

export interface ParseImportRequest {
  source: ImportSourceId | 'auto';
  fileName: string;
  contentBase64: string;
  /** marks trades already imported into this account */
  accountId?: string;
  /** broker-server offset for MetaTrader files; default IST (+330) for Indian brokers, 0 for MT */
  utcOffsetMinutes?: number;
  /** generic_csv column mapping: canonical field → header text in the file */
  mapping?: Partial<Record<CanonicalField, string>>;
}

export interface ParseImportResponse {
  detectedSource: ImportSourceId | 'unknown';
  trades: NormalizedTrade[];
  warnings: string[];
  skipped: number;
  duplicates?: number;
  /** present when generic_csv needs a mapping step */
  columns?: { headers: string[]; suggested: Partial<Record<CanonicalField, string>> };
}

/** Body item for POST /trades {items} (backend field names). */
export interface ImportCreateItem {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  openDate: string;
  closeDate: string;
  outcome: 'TP' | 'SL' | 'BREAKEVEN';
  pnl: number;
  stopLoss?: number;
  takeProfit?: number;
  tags: string[];
  accountIds: string[];
  assetClass: AssetClass;
  fees: number;
  grossPnl: number;
  contractMultiplier?: number;
  underlying?: string;
  optionType?: 'call' | 'put';
  strike?: number;
  expiry?: string;
  externalId: string;
  importSource: RowSource;
  idempotencyKey: string;
  /** groups the trades of one import (BE-R12); ignored by backends without it */
  importBatchId?: string;
}

export interface SaveImportedResult {
  created: number;
  skipped: number;
  errors: number;
  /** trades in chunks that failed to send; retrying the same call is safe (idempotency keys) */
  failed: number;
  /** the batch id sent with every item; reuse it when retrying so a retry stays in the same batch */
  batchId: string;
  /** ids of the trades this call created (Undo import, View imported trades) */
  createdIds: string[];
  /** externalIds in chunks that failed to send */
  failedExternalIds: string[];
}
