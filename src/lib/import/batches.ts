export interface ImportBatch {
  batchId: string;
  accountId: string;
  /** importSource of the trades, `mixed` when a batch holds several */
  source: string;
  /** earliest createdAt of the batch (ISO) */
  importedAt: string;
  count: number;
  /** span of the trades' open dates (ISO), used to open Trades on the right period */
  from: string;
  to: string;
}

export interface RawBatchTrade {
  importBatchId?: string | null;
  accountId?: string;
  importSource?: string | null;
  createdAt?: string;
  openDate?: string;
  closeDate?: string;
  deletedAt?: string | null;
}

/** Trades saved by one import share an importBatchId (BE-R12); newest import first. */
export function groupBatches(trades: RawBatchTrade[]): ImportBatch[] {
  const map = new Map<string, ImportBatch>();
  for (const t of trades) {
    if (!t.importBatchId || t.deletedAt || !t.accountId) continue;
    const open = t.openDate ?? t.closeDate ?? '';
    const close = t.closeDate ?? open;
    const made = t.createdAt ?? open;
    const cur = map.get(t.importBatchId);
    if (!cur) {
      map.set(t.importBatchId, { batchId: t.importBatchId, accountId: t.accountId, source: t.importSource ?? 'unknown', importedAt: made, count: 1, from: open, to: close });
      continue;
    }
    cur.count += 1;
    if (t.importSource && t.importSource !== cur.source) cur.source = 'mixed';
    if (made && (!cur.importedAt || made < cur.importedAt)) cur.importedAt = made;
    if (open && (!cur.from || open < cur.from)) cur.from = open;
    if (close && close > cur.to) cur.to = close;
  }
  return [...map.values()].sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1));
}

const KEY = 'tq.import.files';
const MAX_REMEMBERED = 100;

/** The API stores no file name; this device remembers the one used for each batch. */
export function rememberBatchFile(batchId: string, label: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
    delete all[batchId];
    const entries = Object.entries({ [batchId]: label, ...all }).slice(0, MAX_REMEMBERED);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // storage blocked: the list shows the source instead of the file name
  }
}

export function batchFile(batchId: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>)[batchId] ?? null;
  } catch {
    return null;
  }
}
