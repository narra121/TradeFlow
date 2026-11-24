import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode, SyntheticEvent } from 'react';
import { useStore } from 'react-redux';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/shell/TopBar';
import { ScopeBar } from '@/components/shell/ScopeBar';
import { NoticeSlot } from '@/components/shell/NoticeSlot';
import { IncidentBar } from '@/components/shell/IncidentBar';
import { Helmet } from 'react-helmet-async';
import { copy } from '@/copy';
import { useGettingStarted } from '@/components/onboarding/useGettingStarted';
import { useSyncServerPreferences } from '@/components/settings/usePreferences';
import { useImportPending } from '@/lib/importFlowStore';
import { ChromeProvider, useChromeState } from '@/components/shell/chrome';
import { refreshData } from '@/components/shell/refresh';
import { shiftRange } from '@/components/shell/ScopePeriod';
import { focusNextRegion } from '@/lib/regions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { useContentScroll } from '@/components/shell/useContentScroll';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { ShortcutsDialog } from '@/components/shell/ShortcutsDialog';
import { UpgradeDialog } from '@/components/billing/UpgradeDialog';
import { PlanCard } from '@/components/billing/PlanCard';
import { PaneHost } from '@/components/trade/PaneHost';
import { isScopedPath, titleForPath } from '@/components/shell/navItems';
import { Button } from '@/components/ui/button';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useTradesSync } from '@/hooks/useTradesSync';
import { useUiState } from '@/hooks/useUiState';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGetSavedOptionsQuery } from '@/store/api';
import { cn } from '@/lib/utils';
import { ALL_TIME_START } from '@/lib/scope';
import { lazyPage } from '@/content/lazyPage';
import { prefetchPage } from '@/components/shell/prefetchPage';
import type { RootState } from '@/store';

const DashboardView = lazyPage(() => import('@/components/views/DashboardView').then((m) => ({ default: m.DashboardView })));
const TradeLogView = lazyPage(() => import('@/components/views/TradeLogView').then((m) => ({ default: m.TradeLogView })));
const CalendarView = lazyPage(() => import('@/components/views/CalendarView').then((m) => ({ default: m.CalendarView })));
const AnalyticsView = lazyPage(() => import('@/components/views/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const GoalsView = lazyPage(() => import('@/components/views/GoalsView').then((m) => ({ default: m.GoalsView })));
const SettingsView = lazyPage(() => import('@/components/views/SettingsView').then((m) => ({ default: m.SettingsView })));
const AccountsView = lazyPage(() => import('@/components/views/AccountsView').then((m) => ({ default: m.AccountsView })));
const ImportView = lazyPage(() => import('@/components/views/ImportView').then((m) => ({ default: m.ImportView })));
const InsightsView = lazyPage(() => import('@/components/insights/InsightsView').then((m) => ({ default: m.InsightsView })));
const ChatView = lazyPage(() => import('@/components/chat/ChatView').then((m) => ({ default: m.ChatView })));

/** The view of each `/app/<segment>`. */
const VIEW_AT: Record<string, { preload: () => Promise<void> }> = {
  dashboard: DashboardView,
  tradelog: TradeLogView,
  calendar: CalendarView,
  analytics: AnalyticsView,
  goals: GoalsView,
  settings: SettingsView,
  accounts: AccountsView,
  import: ImportView,
  insights: InsightsView,
  chat: ChatView,
};

const WHOLE_JOURNAL = { accountId: 'ALL', startDate: ALL_TIME_START, endDate: '2099-12-31' };

function RouteFallback() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/** Old Stripe return URLs and bookmarks: profile and billing live inside Settings now; the query string is kept. */
function RedirectTo({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function NotFoundInApp() {
  return (
    <div className="max-w-md space-y-3 py-10">
      <h2 className="text-base font-semibold">{copy.frame.notFound.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.frame.notFound.body}</p>
      <Button asChild><Link to="/app/dashboard">Go to the dashboard</Link></Button>
    </div>
  );
}

/** Route-level boundary: a broken screen shows a reference id and keeps the frame usable. */
class RouteErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null; id: string }> {
  state = { error: null as Error | null, id: '' };
  static getDerivedStateFromError(error: Error) {
    return { error, id: Math.random().toString(36).slice(2, 10) };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    import('@/lib/errorReporter').then((m) => m.reportReactError(error, info)).catch(() => undefined);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const id = this.state.id;
    return (
      <div role="alert" className="max-w-md space-y-3 py-10">
        <h2 className="text-base font-semibold">{copy.frame.boundary.title}</h2>
        <p className="text-sm text-muted-foreground">{copy.frame.boundary.body}</p>
        <p className="font-mono text-xs text-muted-foreground">Reference {id}</p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>{copy.frame.boundary.reload}</Button>
          <Button asChild variant="outline"><a href={`mailto:support@tradequt.com?subject=${encodeURIComponent(`TradeQut error ${id}`)}&body=${encodeURIComponent(`Reference ${id}\nPage ${window.location.pathname}`)}`}>Report this</a></Button>
        </div>
      </div>
    );
  }
}

function AppFrame() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const trade = useTradeParam();
  const [ui, setUi] = useUiState();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useGetSavedOptionsQuery();
  useTradesSync();
  const { trades } = useScopeTrades(undefined, { skip: false });
  const tradesWithoutAccount = useMemo(() => trades.filter((t) => !t.accountId).length, [trades]);
  // Getting started describes the user, not the scope: the newest trade of the whole journal, one request.
  // A failed or unfinished load is not "no trades": the notice waits for a real answer (R-040).
  const journal = useScopeTrades(WHOLE_JOURNAL, { newestOnly: true });
  const started = useGettingStarted(journal.isLoading || journal.isError ? null : journal.trades.length);
  const gettingStarted = started.isLoading || started.unknown || started.complete ? null : { done: started.done, total: started.total };
  const importInReview = useImportPending();
  useSyncServerPreferences();
  useContentScroll();

  // Every view's code loads in the background once the opened one has, so no first visit waits on the network.
  useEffect(() => {
    const preloadRest = () => Object.values(VIEW_AT).forEach((view) => void view.preload().catch(() => undefined));
    const opened = VIEW_AT[location.pathname.split('/')[2]];
    void (opened?.preload() ?? Promise.resolve())
      .catch(() => undefined)
      // Safari has no requestIdleCallback.
      .then(() => (typeof requestIdleCallback === 'function' ? requestIdleCallback(preloadRest, { timeout: 3000 }) : setTimeout(preloadRest, 500)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once, from the page the app opened on

  // The icon rail takes over between 768 and 1279 px regardless of the saved preference.
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1280);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const collapsed = ui.sidebarCollapsed || narrow;

  // Colour-blind safe P&L palette and density live on <html>.
  useEffect(() => {
    document.documentElement.dataset.pnl = ui.pnlPalette;
    document.documentElement.dataset.density = ui.density;
  }, [ui.pnlPalette, ui.density]);

  // One document title per page, set through Helmet so it outranks the shell's generic `TradeQut` (RequireAuth); on
  // route change focus moves to the page title, which announces it.
  const title = titleForPath(location.pathname);
  useEffect(() => {
    const h = document.getElementById('page-title');
    h?.focus({ preventScroll: true });
  }, [title, location.pathname]);

  const focusSearch = useCallback(() => {
    const el = document.getElementById('trades-search');
    if (el) el.focus();
    else navigate('/app/tradelog?focus=search');
  }, [navigate]);

  const dispatch = useAppDispatch();
  const scope = useAppSelector((s) => s.trades.filters);
  const chrome = useChromeState();
  const stepPeriod = useCallback(
    (dir: 1 | -1) => {
      if (!isScopedPath(location.pathname) || chrome.ownPeriod) return;
      const next = shiftRange(scope.datePreset, scope.startDate, scope.endDate, dir);
      if (next) dispatch(setDateRangeFilter({ ...next, datePreset: 'custom' }));
    },
    [location.pathname, chrome.ownPeriod, scope.datePreset, scope.startDate, scope.endDate, dispatch],
  );

  const store = useStore<RootState>();
  const lastIntent = useRef({ href: '', at: 0 });
  // Hover or focus on a desktop, the start of a tap on a phone: the page's code and data load before the click. A control that
  // navigates without a link names its page in `data-prefetch`.
  const onIntent = useCallback(
    (e: SyntheticEvent) => {
      const el = e.target instanceof Element ? e.target.closest('a[href^="/app/"], [data-prefetch]') : null;
      const href = el?.getAttribute('data-prefetch') ?? el?.getAttribute('href');
      if (!href) return;
      // pointerover repeats for every child of a link, and RTK dispatches an action even for a request it skips.
      const now = Date.now();
      if (href === lastIntent.current.href && now - lastIntent.current.at < 5000) return;
      lastIntent.current = { href, at: now };
      const url = new URL(href, window.location.origin);
      void VIEW_AT[url.pathname.split('/')[2]]?.preload().catch(() => undefined);
      prefetchPage(url, dispatch, store.getState);
    },
    [dispatch, store],
  );

  useGlobalShortcuts({
    onStepPeriod: stepPeriod,
    onRefresh: () => refreshData(dispatch),
    onRegion: (dir) => focusNextRegion(dir),
    onPalette: () => setPaletteOpen(true),
    onNewTrade: () => trade.openNew(),
    onShortcuts: () => setShortcutsOpen(true),
    onSearch: focusSearch,
    onCollapse: () => setUi({ sidebarCollapsed: !ui.sidebarCollapsed }),
  });

  // One viewport tall and clipped: the document never scrolls and PaneHost's list is the only scroller. A `.sr-only` node in
  // the list is positioned against this wrapper, not the list, so without the clip it stretches the document. `dvh` tracks
  // a phone's collapsing URL bar; `clip` (not `hidden`) leaves the wrapper unscrollable by focus and anchors.
  return (
    <div className="relative h-dvh overflow-clip bg-background" onPointerOver={onIntent} onPointerDown={onIntent} onFocus={onIntent}>
      <Helmet>
        <title>{`${title} · TradeQut`}</title>
      </Helmet>
      <a href="#main" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Skip to content
      </a>
      {!isMobile && (
        <Sidebar importInReview={importInReview} collapsed={collapsed} onCollapsedChange={(c) => setUi({ sidebarCollapsed: c })} onShowShortcuts={() => setShortcutsOpen(true)} planCard={<PlanCard collapsed={collapsed} />} />
      )}

      <div className={cn('flex h-full min-w-0 flex-col', isMobile ? 'pb-14' : collapsed ? 'ml-14' : 'ml-[232px]')}>
        <IncidentBar />
        <TopBar isMobile={isMobile} onOpenPalette={() => setPaletteOpen(true)} onShowShortcuts={() => setShortcutsOpen(true)} />
        <ScopeBar scoped={isScopedPath(location.pathname)} isMobile={isMobile} />
        <NoticeSlot tradesWithoutAccount={tradesWithoutAccount} gettingStarted={gettingStarted} />
        <PaneHost>
          {/* Chat fills the visible pane so its conversation log, not the page, scrolls (ChatView.tsx). */}
          <main id="main" tabIndex={-1} className={cn('mx-auto w-full max-w-[1440px] p-3 outline-none md:p-6', /^\/app\/chat\/?$/.test(location.pathname) && 'flex h-full flex-col')}>
            <RouteErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardView onAddTrade={() => trade.openNew()} onImportTrades={() => navigate('/app/import')} />} />
                  <Route path="tradelog" element={<TradeLogView />} />
                  <Route path="calendar" element={<CalendarView />} />
                  <Route path="analytics" element={<AnalyticsView />} />
                  <Route path="insights" element={<InsightsView />} />
                  <Route path="chat" element={<ChatView />} />
                  <Route path="goals" element={<GoalsView />} />
                  <Route path="accounts" element={<AccountsView />} />
                  <Route path="import" element={<ImportView />} />
                  <Route path="settings/*" element={<SettingsView />} />
                  <Route path="profile" element={<RedirectTo to="/app/settings/profile" />} />
                  <Route path="billing" element={<RedirectTo to="/app/settings/billing" />} />
                  <Route path="*" element={<NotFoundInApp />} />
                </Routes>
              </Suspense>
            </RouteErrorBoundary>
          </main>
        </PaneHost>
      </div>

      {isMobile && trade.mode === 'closed' && <MobileTabBar onAddTrade={() => trade.openNew()} />}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} trades={trades} onShowShortcuts={() => setShortcutsOpen(true)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <UpgradeDialog />
    </div>
  );
}

export function AppPage() {
  return (
    <ChromeProvider>
      <AppFrame />
    </ChromeProvider>
  );
}
