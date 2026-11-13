import { SCREENSHOT_SOURCE, type NormalizedTrade } from '@/types/import';
import { shortHash } from './rows';

/** The extraction endpoint takes at most 3 images per request and rejects images above ~1 MB of base64. */
export const MAX_SCREENSHOT_BYTES = 1024 * 1024;
export const SCREENSHOTS_PER_REQUEST = 3;
export const MAX_SCREENSHOTS = 15;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const BROKER_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.txt', '.htm', '.html'];

export type FileKind = 'screenshot' | 'broker' | 'unsupported';

export function classifyFile(file: Pick<File, 'name' | 'type'>): FileKind {
  if (IMAGE_TYPES.includes(file.type)) return 'screenshot';
  const name = file.name.toLowerCase();
  if (BROKER_FILE_EXTENSIONS.some((e) => name.endsWith(e))) return 'broker';
  return 'unsupported';
}

export interface ScreenshotFile {
  name: string;
  /** data URL sent to the extraction endpoint and shown in the preview */
  url: string;
}

/** Long edge and JPEG quality of each attempt to bring an oversized screenshot under the limit, gentlest first. */
const FIT_ATTEMPTS: [edge: number, quality: number][] = [[2000, 0.85], [2000, 0.7], [1400, 0.7], [1000, 0.7]];

export type RenderJpeg = (file: File, edge: number, quality: number) => Promise<Blob | null>;

/** Draws the image on a canvas with its long edge at most `edge` and encodes it as JPEG; null when the browser cannot decode it. */
const renderJpeg: RenderJpeg = async (file, edge, quality) => {
  if (typeof createImageBitmap !== 'function') return null;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff'; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  } finally {
    bitmap.close();
  }
};

/**
 * A screenshot over the size limit, shrunk and re-encoded as JPEG so a retina or 1440p capture imports without cropping.
 * Returned unchanged when it already fits, the browser cannot decode it, or no attempt gets under the limit: the caller rejects what is still too large.
 */
export async function fitScreenshot(file: File, render: RenderJpeg = renderJpeg): Promise<File> {
  if (file.size <= MAX_SCREENSHOT_BYTES) return file;
  for (const [edge, quality] of FIT_ATTEMPTS) {
    const blob = await render(file, edge, quality).catch(() => null);
    if (!blob) return file;
    if (blob.size <= MAX_SCREENSHOT_BYTES) return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  }
  return file;
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function batches<T>(items: T[], size = SCREENSHOTS_PER_REQUEST): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function batchLabel(batch: number, total: number, perBatch = SCREENSHOTS_PER_REQUEST): string {
  const from = batch * perBatch + 1;
  const to = Math.min(total, from + perBatch - 1);
  return from === to ? `Screenshot ${from}` : `Screenshots ${from}–${to}`;
}

const toIso = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export interface ExtractedItem {
  symbol?: string;
  side?: string;
  quantity?: unknown;
  openDate?: unknown;
  closeDate?: unknown;
  entryPrice?: unknown;
  exitPrice?: unknown;
  stopLoss?: unknown;
  takeProfit?: unknown;
  pnl?: unknown;
}

/**
 * One extracted row → a review row. Missing dates stay empty so the grid flags them instead of saving "now"
 * (P1-22). The external id comes from the content, so extracting the same screenshot twice yields the same ids;
 * `occurrence` separates identical rows inside one extraction.
 */
export function fromExtracted(item: ExtractedItem, occurrence = 0): NormalizedTrade {
  const side = String(item.side ?? '').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  const symbol = String(item.symbol ?? '').trim().toUpperCase();
  const openDate = toIso(item.openDate);
  const closeDate = toIso(item.closeDate) || openDate;
  const quantity = num(item.quantity);
  const entryPrice = num(item.entryPrice);
  const exitPrice = num(item.exitPrice);
  const pnl = num(item.pnl);
  const sl = num(item.stopLoss);
  const tp = num(item.takeProfit);
  return {
    symbol,
    side,
    quantity,
    entryPrice,
    exitPrice,
    openDate,
    closeDate,
    outcome: pnl > 0 ? 'TP' : pnl < 0 ? 'SL' : 'BREAKEVEN',
    pnl,
    stopLoss: sl > 0 ? sl : null,
    takeProfit: tp > 0 ? tp : null,
    tags: [],
    assetClass: 'stock',
    fees: 0,
    grossPnl: pnl,
    externalId: `ai-${shortHash([symbol, side, quantity, openDate, closeDate, entryPrice, exitPrice].join('|'))}${occurrence > 0 ? `-${occurrence}` : ''}`,
    importSource: SCREENSHOT_SOURCE,
  };
}
