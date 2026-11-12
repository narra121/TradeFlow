import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ChromeTab {
  id: string;
  label: string;
  /** `to` makes the tab a link (URL changes); otherwise `onSelect` switches a view in place. */
  to?: string;
  onSelect?: () => void;
  badge?: string | number;
  active: boolean;
}

export interface ChromeState {
  count?: number | string | null;
  tabs?: ChromeTab[];
  /** One-line statement shown at the left of the page bar on pages without scoped data. */
  statement?: string;
  /** The page renders its own period control (Calendar, Goals & rules) through ScopeBarSlot; the shell's is skipped. */
  ownPeriod?: boolean;
  /** Rows are selected: on wide screens the selection bar replaces the scope bar's content in place (E.6). */
  selecting?: boolean;
}

interface ChromeApi {
  state: ChromeState;
  setState: (s: ChromeState) => void;
  leftTarget: HTMLElement | null;
  rightTarget: HTMLElement | null;
  selectionTarget: HTMLElement | null;
  setLeftTarget: (el: HTMLElement | null) => void;
  setRightTarget: (el: HTMLElement | null) => void;
  setSelectionTarget: (el: HTMLElement | null) => void;
}

const ChromeContext = createContext<ChromeApi | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ChromeState>({});
  const [leftTarget, setLeftTarget] = useState<HTMLElement | null>(null);
  const [rightTarget, setRightTarget] = useState<HTMLElement | null>(null);
  const [selectionTarget, setSelectionTarget] = useState<HTMLElement | null>(null);
  const value = useMemo(
    () => ({ state, setState, leftTarget, rightTarget, selectionTarget, setLeftTarget, setRightTarget, setSelectionTarget }),
    [state, leftTarget, rightTarget, selectionTarget],
  );
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

const NOOP: ChromeApi = {
  state: {},
  setState: () => undefined,
  leftTarget: null,
  rightTarget: null,
  selectionTarget: null,
  setLeftTarget: () => undefined,
  setRightTarget: () => undefined,
  setSelectionTarget: () => undefined,
};

/** Outside the app frame (public pages, unit tests) the chrome calls do nothing. */
function useChrome(): ChromeApi {
  return useContext(ChromeContext) ?? NOOP;
}

export function useChromeState(): ChromeState {
  return useChrome().state;
}

/** A page declares its count, level-2 tabs and page-bar statement; they clear when the page unmounts. */
export function usePageChrome(next: ChromeState) {
  const { setState } = useChrome();
  const key = JSON.stringify({ c: next.count, s: next.statement, o: next.ownPeriod, x: next.selecting, t: next.tabs?.map((t) => [t.id, t.label, t.to, t.badge, t.active]) });
  // Tab callbacks are read from the latest render through the ref-free closure below.
  useEffect(() => {
    setState(next);
    return () => setState({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setState]);
}

export function ScopeBarTargets() {
  const { setLeftTarget, setRightTarget, setSelectionTarget } = useChrome();
  return {
    left: useCallback((el: HTMLElement | null) => setLeftTarget(el), [setLeftTarget]),
    right: useCallback((el: HTMLElement | null) => setRightTarget(el), [setRightTarget]),
    selection: useCallback((el: HTMLElement | null) => setSelectionTarget(el), [setSelectionTarget]),
  };
}

/** Renders children into the left or right cluster of the scope bar, or into the selection bar that replaces both. */
export function ScopeBarSlot({ side, children }: { side: 'left' | 'right' | 'selection'; children: React.ReactNode }) {
  const { leftTarget, rightTarget, selectionTarget } = useChrome();
  const target = side === 'left' ? leftTarget : side === 'right' ? rightTarget : selectionTarget;
  return target ? createPortal(children, target) : null;
}
