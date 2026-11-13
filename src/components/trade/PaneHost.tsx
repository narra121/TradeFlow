import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { TradePane, type PanePresentation, type TradePaneHandle } from '@/components/trade/TradePane';
import { PaneLayoutContext } from '@/components/trade/paneLayout';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useUiState } from '@/hooks/useUiState';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/** Minimum width the screen needs beside a docked pane (px). */
const MIN_MAIN: Record<string, number> = { '/app/tradelog': 440, '/app/calendar': 640 };
const MIN_PANE = 480;

export interface PaneLayout {
  presentation: PanePresentation | 'closed';
  /** Pixel width reserved by a docked pane; 0 otherwise. */
  dockedWidth: number;
}

export function choosePresentation(opts: { pathname: string; isMobile: boolean; expanded: boolean; available: number; paneWidth: number }): PanePresentation {
  if (opts.isMobile) return 'screen';
  if (opts.expanded) return 'expanded';
  const minMain = MIN_MAIN[opts.pathname];
  if (minMain !== undefined && opts.available - opts.paneWidth >= minMain) return 'docked';
  return 'overlay';
}

/**
 * Hosts the trade pane for every app screen. Docked beside the list on Trades and Calendar when it fits,
 * otherwise an overlay sheet; full screen on phones; `pane=full` expands it over the content area.
 * The screen underneath stays mounted, so its scroll position and filters survive.
 */
export function PaneHost({ children }: { children: React.ReactNode }) {
  const param = useTradeParam();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [ui, setUi] = useUiState();
  const containerRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const paneRef = useRef<TradePaneHandle>(null);
  const [walkIds, setWalkIds] = useState<string[] | null>(null);
  const [available, setAvailable] = useState(1200);
  const { trades, isLoading, isError, error, refetch } = useScopeTrades(undefined, { skip: param.mode === 'closed' });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvailable(el.clientWidth));
    ro.observe(el);
    setAvailable(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const paneWidth = Math.max(MIN_PANE, Math.min(ui.paneWidth, Math.floor(available * 0.6)));
  const open = param.mode !== 'closed';
  const presentation = open ? choosePresentation({ pathname, isMobile, expanded: param.expanded, available, paneWidth }) : null;

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = paneWidth;
      let width = startW;
      // The width is written to the element while dragging and stored once on release, so nothing re-renders per pointermove.
      const move = (ev: PointerEvent) => {
        width = Math.max(MIN_PANE, Math.min(Math.floor(available * 0.6), startW + (startX - ev.clientX)));
        if (asideRef.current) asideRef.current.style.width = `${width}px`;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        setUi({ paneWidth: width });
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    [available, paneWidth, setUi],
  );

  const pane = presentation && (
    <TradePane ref={paneRef} trades={trades} isLoading={isLoading} isError={isError} error={error} onRetry={refetch} presentation={presentation} walkIds={walkIds} />
  );
  const layout = useMemo(() => ({ presentation, openId: param.trade, setWalkOrder: setWalkIds }), [presentation, param.trade]);
  const label = param.mode === 'new' ? 'New trade' : 'Trade';

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1">
      <PaneLayoutContext.Provider value={layout}>
        <div className={cn('min-w-0 flex-1 overflow-y-auto', presentation === 'expanded' && 'hidden')} data-trade-list>
          {children}
        </div>
      </PaneLayoutContext.Provider>

      {presentation === 'docked' && (
        <aside ref={asideRef} aria-label={label} className="relative flex shrink-0 border-l border-border" style={{ width: paneWidth }}>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize trade pane"
            aria-valuenow={paneWidth}
            aria-valuemin={MIN_PANE}
            aria-valuemax={Math.floor(available * 0.6)}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setUi({ paneWidth: Math.min(Math.floor(available * 0.6), paneWidth + 24) });
              if (e.key === 'ArrowRight') setUi({ paneWidth: Math.max(MIN_PANE, paneWidth - 24) });
            }}
            className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize hover:bg-primary/30 focus-visible:bg-primary/40"
          />
          <div className="min-w-0 flex-1">{pane}</div>
        </aside>
      )}

      {presentation === 'expanded' && (
        <section aria-label={label} className="min-w-0 flex-1">
          {pane}
        </section>
      )}

      {(presentation === 'overlay' || presentation === 'screen') && (
        <Sheet open onOpenChange={(o) => !o && (paneRef.current ? paneRef.current.requestClose() : param.close())}>
          <SheetContent
            side="right"
            className={cn('flex flex-col gap-0 p-0 [&>button.absolute]:hidden', presentation === 'screen' ? 'w-full max-w-none' : 'w-[min(640px,calc(100vw-56px))] max-w-none')}
          >
            <SheetTitle className="sr-only">{label}</SheetTitle>
            <SheetDescription className="sr-only">Trade details and journal</SheetDescription>
            {pane}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
