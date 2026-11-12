import { useEffect } from 'react';
import { useUiState } from '@/hooks/useUiState';

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable || el.getAttribute('role') === 'combobox';
}

interface Handlers {
  onPalette: () => void;
  onNewTrade: () => void;
  onShortcuts: () => void;
  onSearch: () => void;
  /** `[` collapses or expands the sidebar. */
  onCollapse?: () => void;
  /** `,` and `.` step the period. */
  onStepPeriod?: (dir: 1 | -1) => void;
  /** `Shift+R` refreshes the data on screen. */
  onRefresh?: () => void;
  /** `F6` / `Shift+F6` move between the page regions. */
  onRegion?: (dir: 1 | -1) => void;
}

/** App-wide keys: Ctrl/⌘+K always; N, /, ? only when the single-key switch is on and no field has focus. */
export function useGlobalShortcuts({ onPalette, onNewTrade, onShortcuts, onSearch, onCollapse, onStepPeriod, onRefresh, onRegion }: Handlers) {
  const [ui] = useUiState();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onPalette();
        return;
      }
      if (e.key === 'F6' && !e.ctrlKey && !e.metaKey && !e.altKey && onRegion) {
        e.preventDefault();
        onRegion(e.shiftKey ? -1 : 1);
        return;
      }
      if (!ui.singleKeyShortcuts || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      if (e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        onNewTrade();
      } else if (e.key === '/') {
        e.preventDefault();
        onSearch();
      } else if (e.key === '?') {
        e.preventDefault();
        onShortcuts();
      } else if (e.key === '[' && onCollapse) {
        e.preventDefault();
        onCollapse();
      } else if ((e.key === ',' || e.key === '.') && onStepPeriod) {
        e.preventDefault();
        onStepPeriod(e.key === '.' ? 1 : -1);
      } else if (e.key === 'R' && e.shiftKey && onRefresh) {
        e.preventDefault();
        onRefresh();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui.singleKeyShortcuts, onPalette, onNewTrade, onShortcuts, onSearch, onCollapse, onStepPeriod, onRefresh, onRegion]);
}
