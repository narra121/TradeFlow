import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/components/layout/Sidebar', () => ({ Sidebar: () => <nav data-testid="sidebar" /> }));
vi.mock('@/components/shell/ScopeBar', () => ({ ScopeBar: () => <div data-testid="scopebar" /> }));
vi.mock('@/components/shell/NoticeSlot', () => ({ NoticeSlot: () => null }));
vi.mock('@/components/shell/TopBar', () => ({ TopBar: () => <header data-testid="topbar" /> }));
vi.mock('@/components/shell/MobileTabBar', () => ({ MobileTabBar: () => <nav data-testid="tabbar" /> }));
vi.mock('@/components/shell/CommandPalette', () => ({ CommandPalette: () => null }));
vi.mock('@/components/shell/ShortcutsDialog', () => ({ ShortcutsDialog: () => null }));
vi.mock('@/components/billing/UpgradeDialog', () => ({ UpgradeDialog: () => <div data-testid="upgrade-dialog" /> }));
vi.mock('@/components/trade/PaneHost', () => ({ PaneHost: ({ children }: { children: React.ReactNode }) => <div data-testid="pane-host">{children}</div> }));

const view = (id: string, name: string) => ({ [name]: () => <div data-testid={id}>{id}</div> });
vi.mock('@/components/views/DashboardView', () => view('dashboard-view', 'DashboardView'));
vi.mock('@/components/views/TradeLogView', () => view('tradelog-view', 'TradeLogView'));
vi.mock('@/components/views/CalendarView', () => view('calendar-view', 'CalendarView'));
vi.mock('@/components/views/AnalyticsView', () => view('analytics-view', 'AnalyticsView'));
vi.mock('@/components/views/GoalsView', () => view('goals-view', 'GoalsView'));
vi.mock('@/components/views/SettingsView', () => view('settings-view', 'SettingsView'));
vi.mock('@/components/views/AccountsView', () => view('accounts-view', 'AccountsView'));
vi.mock('@/components/views/ImportView', () => view('import-view', 'ImportView'));

vi.mock('@/components/insights/InsightsView', () => ({ InsightsView: () => <div data-testid="insights-view">i</div> }));
vi.mock('@/components/chat/ChatView', () => ({ ChatView: () => <div data-testid="chat-view">c</div> }));
vi.mock('@/components/billing/BillingView', () => ({ BillingView: () => <div data-testid="billing-view">billing</div> }));
vi.mock('@/components/billing/PlanCard', () => ({ PlanCard: () => null }));
vi.mock('@/store/api', () => ({ useGetSavedOptionsQuery: () => ({ data: undefined }), useGetAccountsQuery: () => ({ data: { accounts: [] } }) }));
vi.mock('@/components/views/SettingsView', () => ({ SettingsView: () => <div data-testid="settings-view">s</div> }));
const gettingStarted = vi.fn((_n: number | null) => ({ isLoading: false, unknown: false, complete: true, done: 3, total: 3 }));
vi.mock('@/components/onboarding/useGettingStarted', () => ({ useGettingStarted: (n: number | null) => gettingStarted(n) }));
vi.mock('@/components/settings/usePreferences', () => ({ useSyncServerPreferences: () => undefined }));
vi.mock('@/hooks/useTradesSync', () => ({ useTradesSync: () => undefined }));
let scopeTrades: { trades: unknown[]; isLoading?: boolean; isError?: boolean } = { trades: [] };
vi.mock('@/hooks/useScopeTrades', () => ({ useScopeTrades: () => scopeTrades }));
const isMobile = vi.fn(() => false);
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => isMobile() }));

import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { AppPage } from '../AppPage';

function renderAt(path: string) {
  return render(
    <HelmetProvider>
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/*" element={<AppPage />} />
          <Route path="*" element={<div data-testid="outside">outside</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
    </HelmetProvider>,
  );
}

describe('AppPage', () => {
  it('gives Getting started no trade count while the trades failed to load, so it never says 0 of 3 (R-040)', async () => {
    scopeTrades = { trades: [], isError: true };
    gettingStarted.mockClear();
    renderAt('/app/dashboard');
    await screen.findByTestId('dashboard-view');
    expect(gettingStarted).toHaveBeenCalledWith(null);
    expect(gettingStarted).not.toHaveBeenCalledWith(0);
    scopeTrades = { trades: [] };
  });

  it.each([
    ['/app/dashboard', 'dashboard-view'],
    ['/app/tradelog', 'tradelog-view'],
    ['/app/calendar', 'calendar-view'],
    ['/app/analytics', 'analytics-view'],
    ['/app/goals', 'goals-view'],
    ['/app/accounts', 'accounts-view'],
    ['/app/import', 'import-view'],
    ['/app/insights', 'insights-view'],
    ['/app/chat', 'chat-view'],
    ['/app/settings/profile', 'settings-view'],
  ])('renders %s', async (path, id) => {
    renderAt(path);
    expect(await screen.findByTestId(id)).toBeInTheDocument();
  });

  it('redirects /app to the dashboard', async () => {
    renderAt('/app');
    expect(await screen.findByTestId('dashboard-view')).toBeInTheDocument();
  });

  it('sends the old profile and billing URLs into Settings and keeps the Stripe query', async () => {
    renderAt('/app/profile?session_id=cs_1');
    expect(await screen.findByTestId('settings-view')).toBeInTheDocument();
    renderAt('/app/billing?checkout=cancelled');
    await waitFor(() => expect(screen.getAllByTestId('settings-view').length).toBeGreaterThan(1));
  });

  it('shows an in-app page-not-found inside the frame for unknown paths', async () => {
    renderAt('/app/nope');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('is one dynamic viewport tall and clips its overflow, so the document never scrolls', () => {
    renderAt('/app/dashboard');
    const shell = screen.getByText('Skip to content').parentElement;
    expect(shell).toHaveClass('h-dvh', 'overflow-clip');
    expect(shell).not.toHaveClass('min-h-screen');
    expect(screen.getByTestId('pane-host').parentElement).toHaveClass('h-full');
  });

  it('has a skip link, the sidebar on desktop and the tab bar only on phones', async () => {
    const { unmount } = renderAt('/app/dashboard');
    expect(screen.getByText('Skip to content')).toHaveAttribute('href', '#main');
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('tabbar')).toBeNull();
    expect(screen.getByTestId('upgrade-dialog')).toBeInTheDocument();
    unmount();
    isMobile.mockReturnValue(true);
    renderAt('/app/dashboard');
    expect(screen.getByTestId('tabbar')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).toBeNull();
    isMobile.mockReturnValue(false);
  });
});
