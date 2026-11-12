import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AccountSwitcher } from '@/components/shell/AccountSwitcher';
import { ScopePeriod } from '@/components/shell/ScopePeriod';
import { ScopeBarTargets, useChromeState } from '@/components/shell/chrome';
import { refreshData } from '@/components/shell/refresh';
import { useOnline } from '@/hooks/useOnline';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Queries whose data the scope bar's `Updated` refers to. */
const SCREEN_QUERIES = ['getScopeTrades', 'getStats', 'getAccounts', 'getRulesAndGoals', 'getGoalsProgress'];

interface ScopeBarProps {
  /** Pages with scoped data show account + period; the others show a one-line statement (the page bar). */
  scoped: boolean;
  isMobile: boolean;
}

/**
 * Second chrome row (44 px): which data is shown (left, shrinks), the page's own actions and `Updated` (right, never
 * pushed off), or the selection bar in their place. It never scrolls sideways (R-fe-app-001).
 */
export function ScopeBar({ scoped, isMobile }: ScopeBarProps) {
  const dispatch = useAppDispatch();
  const chrome = useChromeState();
  const targets = ScopeBarTargets();
  const online = useOnline();
  const [spinning, setSpinning] = useState(false);
  const selecting = !!chrome.selecting && !isMobile;

  // The last successful fetch of the screen's data, not the time the bar mounted; a failed refetch says so.
  const lastOk = useAppSelector((s) => {
    let latest = 0;
    for (const q of Object.values(s.api.queries)) {
      const t = q && SCREEN_QUERIES.includes(q.endpointName) ? (q.fulfilledTimeStamp ?? 0) : 0;
      if (t > latest) latest = t;
    }
    return latest;
  });
  const failed = useAppSelector((s) => Object.values(s.api.queries).some((q) => q && SCREEN_QUERIES.includes(q.endpointName) && q.status === 'rejected'));

  const stamp = useCallback(() => {
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 800);
  }, []);
  const refresh = useCallback(() => refreshData(dispatch), [dispatch]);

  useEffect(() => {
    window.addEventListener('tq:refreshed', stamp);
    return () => window.removeEventListener('tq:refreshed', stamp);
  }, [stamp]);

  // Refetch on focus when the data on screen is older than 60 s.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && lastOk && Date.now() - lastOk > 60_000) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [lastOk, refresh]);

  const label = !online ? 'Offline' : failed ? "Couldn't refresh · Retry" : lastOk ? `Updated ${formatTime(new Date(lastOk))}` : 'Updating…';

  return (
    <div role="toolbar" aria-label="Data shown" className="sticky top-12 z-bar flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-6">
      <div className={cn('flex min-w-0 flex-1 items-center gap-2 overflow-hidden', selecting && 'hidden')}>
        {scoped ? (
          <>
            <AccountSwitcher className="h-7 max-w-[100px] shrink-0 md:max-w-[220px]" />
            {!chrome.ownPeriod && <ScopePeriod />}
          </>
        ) : (
          <p className="truncate text-13 text-muted-foreground">{chrome.statement}</p>
        )}
        <div ref={targets.left} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden" />
      </div>
      <div className={cn('flex shrink-0 items-center gap-2', selecting && 'hidden')}>
        <div ref={targets.right} className="flex items-center gap-2" />
        <button
          type="button"
          onClick={refresh}
          disabled={!online}
          className={cn('flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs hover:bg-muted hover:text-foreground disabled:pointer-events-none', failed && online ? 'text-error' : 'text-muted-foreground')}
          aria-label={isMobile ? (failed ? "Couldn't refresh. Retry" : 'Refresh data') : `Refresh data. ${label}`}
        >
          {!isMobile && <>{label}</>}
          <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>
      <div ref={targets.selection} className={cn('flex min-w-0 flex-1 items-center gap-2', !selecting && 'hidden')} />
    </div>
  );
}
