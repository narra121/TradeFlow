import { useCallback, useSyncExternalStore } from 'react';
import type { DatePreset } from '@/lib/scope';

export interface UiState {
  sidebarCollapsed: boolean;
  paneWidth: number;
  singleKeyShortcuts: boolean;
  reviewOpen: boolean;
  /** `cb` swaps profit / loss to a colour-blind safe blue / orange pair (E-012). */
  pnlPalette: 'default' | 'cb';
  density: 'comfortable' | 'compact';
  /** IANA zone for day boundaries; empty = this browser's zone. */
  timeZone: string;
  defaultPeriod: DatePreset;
}

export const UI_KEY = 'tq.ui';
const DEFAULTS: UiState = { sidebarCollapsed: false, paneWidth: 560, singleKeyShortcuts: true, reviewOpen: false, pnlPalette: 'default', density: 'comfortable', timeZone: '', defaultPeriod: 'all' };

/** Reads the saved UI preferences without React (used by store initialisers). */
export function readUiState(): UiState {
  return read();
}

const listeners = new Set<() => void>();
let cache: UiState | null = null;

function read(): UiState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(UI_KEY);
    cache = { ...DEFAULTS, ...(raw ? (JSON.parse(raw) as Partial<UiState>) : {}) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function patchUiState(patch: Partial<UiState>): void {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(cache));
  } catch {
    // not persisted; the in-memory value still applies
  }
  listeners.forEach((l) => l());
}

/** Test helper: drop the in-memory copy so the next read goes to storage. */
export function resetUiStateCache(): void {
  cache = null;
  listeners.forEach((l) => l());
}

export function useUiState(): [UiState, (patch: Partial<UiState>) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  const state = useSyncExternalStore(subscribe, read, read);
  return [state, patchUiState];
}
