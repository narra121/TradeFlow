import { createContext, useContext } from 'react';
import type { PanePresentation } from '@/components/trade/TradePane';

export interface PaneLayoutValue {
  presentation: PanePresentation | null;
  /** The open trade id (or `new`), so lists can highlight the row the pane shows. */
  openId: string | null;
  /** A list screen reports the trade ids in the order it shows them, so Prev / Next in the pane walk that order; null clears it. */
  setWalkOrder: (ids: string[] | null) => void;
}

export const PaneLayoutContext = createContext<PaneLayoutValue>({ presentation: null, openId: null, setWalkOrder: () => {} });
export const usePaneLayout = () => useContext(PaneLayoutContext);
