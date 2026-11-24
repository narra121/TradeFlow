import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'tq.compare';
const listeners = new Set<() => void>();
let memory: boolean | null = null;

/** The preference outside React. */
export function readCompare(): boolean {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

/** The `Compare: previous period` preference, one value for Dashboard and Analytics; on by default (E-024). */
export function useCompare(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, readCompare, () => true);
  const set = useCallback((next: boolean) => {
    memory = next;
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off');
    } catch {
      // storage unavailable: the in-memory value keeps the choice for this session
    }
    listeners.forEach((l) => l());
  }, []);
  return [on, set];
}
