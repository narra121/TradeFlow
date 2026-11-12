import type { CanonicalField } from '@/types/import';

export type ColumnMap = Partial<Record<CanonicalField, string>>;

const KEY = 'tq.import.mappings';
const MAX_ENTRIES = 20;

/** Same headers in any order and case = same file layout. */
export function headerSignature(headers: string[]): string {
  return headers.map((h) => h.trim().toLowerCase()).filter(Boolean).sort().join('|');
}

function read(): Record<string, ColumnMap> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ColumnMap>) : {};
  } catch {
    return {};
  }
}

export function loadMapping(headers: string[]): ColumnMap | null {
  return read()[headerSignature(headers)] ?? null;
}

export function saveMapping(headers: string[], mapping: ColumnMap): void {
  const all = read();
  const sig = headerSignature(headers);
  delete all[sig];
  const entries = Object.entries({ [sig]: mapping, ...all }).slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // storage full or blocked: the mapping is asked for again next time
  }
}

export function forgetMapping(headers: string[]): void {
  const all = read();
  delete all[headerSignature(headers)];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // nothing stored to forget
  }
}

export interface MappingField {
  field: CanonicalField;
  label: string;
  group: 'trade' | 'fill' | 'extra';
}

/**
 * A closed-trade file needs the `trade` fields; a file of single executions needs symbol, side, quantity and the
 * `fill` fields (mirrors the parser in JournalAWSSetup src/features/import/parsers/generic.ts).
 */
export const MAPPING_FIELDS: MappingField[] = [
  { field: 'symbol', label: 'Symbol', group: 'trade' },
  { field: 'side', label: 'Side (buy / sell)', group: 'trade' },
  { field: 'quantity', label: 'Quantity', group: 'trade' },
  { field: 'entryPrice', label: 'Entry price', group: 'trade' },
  { field: 'exitPrice', label: 'Exit price', group: 'trade' },
  { field: 'openTime', label: 'Open time', group: 'trade' },
  { field: 'closeTime', label: 'Close time', group: 'trade' },
  { field: 'price', label: 'Price (one row per execution)', group: 'fill' },
  { field: 'time', label: 'Time (one row per execution)', group: 'fill' },
  { field: 'pnl', label: 'Net P&L', group: 'extra' },
  { field: 'fees', label: 'Fees', group: 'extra' },
  { field: 'stopLoss', label: 'Stop loss', group: 'extra' },
  { field: 'takeProfit', label: 'Take profit', group: 'extra' },
  { field: 'tradeId', label: 'Trade id', group: 'extra' },
];

const CLOSED_SET: CanonicalField[] = ['symbol', 'side', 'quantity', 'entryPrice', 'exitPrice', 'openTime'];
const FILL_SET: CanonicalField[] = ['symbol', 'side', 'quantity', 'price', 'time'];

/** Labels still missing for the layout the mapping points at (fill columns chosen = fills, otherwise closed trades); empty when enough. */
export function missingFields(mapping: ColumnMap): string[] {
  const label = (f: CanonicalField) => MAPPING_FIELDS.find((m) => m.field === f)?.label ?? f;
  const closed = CLOSED_SET.filter((f) => !mapping[f]);
  const fills = FILL_SET.filter((f) => !mapping[f]);
  if (closed.length === 0 || fills.length === 0) return [];
  return (mapping.price || mapping.time ? fills : closed).map(label);
}
