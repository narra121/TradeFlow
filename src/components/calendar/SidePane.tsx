import { forwardRef, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const SIDE_PANE_WIDTH = 480;

interface PaneFrameProps {
  title: React.ReactNode;
  /** Right-aligned header actions, before the close button (`Edit`, `⋯`). */
  actions?: React.ReactNode;
  /** Controls to the left of the title (previous / next day). */
  leading?: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Same anatomy as the trade pane: 48 px header (title, actions, close), scrolling body, optional footer. */
export const PaneFrame = forwardRef<HTMLHeadingElement, PaneFrameProps>(function PaneFrame({ title, actions, leading, closeLabel, onClose, children, footer }, headingRef) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
        {leading}
        <h2 ref={headingRef} tabIndex={-1} className="min-w-0 flex-1 truncate px-1 text-sm font-semibold outline-none">
          {title}
        </h2>
        {actions}
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={closeLabel} className="[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-border p-3">{footer}</div>}
    </div>
  );
});

interface SidePaneLayoutProps {
  open: boolean;
  /** Accessible name of the pane region. */
  label: string;
  /** Pixel width the main content needs before the pane may dock beside it. */
  minMain: number;
  pane: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/** Docked beside the content when it fits, a sheet over it below that, full screen on phones. */
export function SidePaneLayout({ open, label, minMain, pane, onClose, children, className }: SidePaneLayoutProps) {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(1200);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setAvailable(el.clientWidth));
    ro.observe(el);
    setAvailable(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const docked = open && !isMobile && available - SIDE_PANE_WIDTH >= minMain;

  return (
    <div ref={ref} className={cn('flex items-start gap-4', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {docked && (
        <aside aria-label={label} onKeyDown={(e) => e.key === 'Escape' && !e.defaultPrevented && onClose()} className="sticky top-0 hidden h-[calc(100vh-11rem)] w-[480px] shrink-0 overflow-hidden rounded-lg border border-border bg-card md:block">
          {pane}
        </aside>
      )}
      {open && !docked && (
        <Sheet open onOpenChange={(o) => !o && onClose()}>
          <SheetContent
            ref={sheetRef}
            side="right"
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              sheetRef.current?.querySelector<HTMLElement>('h2[tabindex="-1"]')?.focus();
            }}
            className={cn('flex flex-col gap-0 p-0 [&>button.absolute]:hidden', isMobile ? 'w-full max-w-none' : 'w-[min(480px,calc(100vw-56px))] max-w-none')}>
            <SheetTitle className="sr-only">{`${label} panel`}</SheetTitle>
            {pane}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
