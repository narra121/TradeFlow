import { useSyncExternalStore } from 'react';
import type { ColumnMap } from '@/lib/import/mappingMemory';
import type { ReviewRow, RowStatus } from '@/lib/import/rows';
import type { ImportSourceId, ParseImportResponse, RowSource, SaveImportedResult } from '@/types/import';

export type ImportPhase = 'idle' | 'parsing' | 'review' | 'saving' | 'done';

export interface ImportProgress {
  label: string;
  done: number;
  total: number;
}

export interface ImportScreenshot {
  name: string;
  url: string;
}

export interface ImportFlowState {
  phase: ImportPhase;
  accountId: string | null;
  source: ImportSourceId | 'auto';
  /** `tradebook-oct.csv`, or `4 screenshots` */
  fileLabel: string | null;
  detected: RowSource | 'unknown' | null;
  rows: ReviewRow[];
  warnings: string[];
  /** rows the parser dropped (open positions, unreadable lines) */
  skipped: number;
  /** skipped lines that could not be turned into rows (line, raw text, reason) */
  unreadLines: { line: number; raw: string; reason: string }[];
  /** rows beyond the review ceiling that were cut off */
  truncated: number;
  /** present while a generic CSV waits for its column mapping */
  columns: ParseImportResponse['columns'] | null;
  /** the mapping in force for a generic CSV, and whether it came from the remembered ones */
  mapping: { values: ColumnMap; remembered: boolean } | null;
  /** the file as last sent, so a mapping or account change re-parses without picking it again (memory only) */
  rawFile: { name: string; contentBase64: string } | null;
  screenshots: ImportScreenshot[];
  progress: ImportProgress | null;
  error: string | null;
  filter: 'all' | RowStatus;
  query: string;
  /** rows before the last exclude / include / merge, for the grid's Undo */
  undoRows: ReviewRow[] | null;
  result: SaveImportedResult | null;
  /** files dropped on another page, waiting for the import page to read them (F-127) */
  queued: File[];
}

const initial: ImportFlowState = {
  phase: 'idle',
  accountId: null,
  source: 'auto',
  fileLabel: null,
  detected: null,
  rows: [],
  warnings: [],
  skipped: 0,
  truncated: 0,
  unreadLines: [],
  columns: null,
  mapping: null,
  rawFile: null,
  screenshots: [],
  progress: null,
  error: null,
  filter: 'all',
  query: '',
  undoRows: null,
  result: null,
  queued: [],
};

let state: ImportFlowState = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Review state lives outside the route so leaving the page keeps the reviewed rows (WF §2.5). */
export const importFlow = {
  get: () => state,
  set(patch: Partial<ImportFlowState>) {
    state = { ...state, ...patch };
    emit();
  },
  /** Keeps the chosen account and source; everything read from a file is dropped. */
  reset() {
    state = { ...initial, accountId: state.accountId, source: state.source, queued: state.queued };
    emit();
  },
  /** Files dropped elsewhere in the app: the import page reads them when it opens. */
  queue(files: File[]) {
    state = { ...state, queued: [...state.queued, ...files] };
    emit();
  },
  /** True while reviewed rows would be lost by closing the tab. */
  hasUnsavedReview: () => (state.phase === 'review' || state.phase === 'saving') && state.rows.length > 0,
  /** True while there is something to come back to: rows in review, or a save in progress. */
  hasPending: () => state.phase === 'review' || state.phase === 'saving',
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useImportFlow(): ImportFlowState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** For the sidebar dot on `Import`: rows are waiting in a review. */
export function useImportPending(): boolean {
  return useSyncExternalStore(subscribe, importFlow.hasPending, () => false);
}
