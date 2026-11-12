import { useEffect } from 'react';
import { isTypingTarget } from '@/hooks/useGlobalShortcuts';
import { useUiState } from '@/hooks/useUiState';

/** `,` and `.` step the page's own period (D.8); like every single key they stay quiet in a field, in a dialog, and when the switch is off. */
export function usePeriodKeys(step: (dir: -1 | 1) => void, enabled = true) {
  const [ui] = useUiState();
  useEffect(() => {
    if (!enabled || !ui.singleKeyShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return;
      if (e.key === ',') {
        e.preventDefault();
        step(-1);
      } else if (e.key === '.') {
        e.preventDefault();
        step(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, enabled, ui.singleKeyShortcuts]);
}
