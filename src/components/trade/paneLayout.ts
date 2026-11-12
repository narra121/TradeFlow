import { createContext, useContext } from 'react';
import type { PanePresentation } from '@/components/trade/TradePane';

export interface PaneLayoutValue {
  presentation: PanePresentation | null;
  /** The open trade id (or `new`), so lists can highlight the row the pane shows. */
  openId: string | null;
}

export const PaneLayoutContext = createContext<PaneLayoutValue>({ presentation: null, openId: null });
export const usePaneLayout = () => useContext(PaneLayoutContext);
