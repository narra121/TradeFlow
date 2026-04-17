import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock all heavy child components to isolate AppPage
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: (props: any) => (
    <div data-testid="sidebar" data-active-view={props.activeView} data-mobile-open={String(props.mobileOpen)}>
      Sidebar
    </div>
  ),
}));

vi.mock('@/components/views/DashboardView', () => ({
  DashboardView: () => <div data-testid="dashboard-view">Dashboard</div>,
}));

vi.mock('@/components/views/TradeLogView', () => ({
  TradeLogView: () => <div data-testid="tradelog-view">TradeLog</div>,
}));

vi.mock('@/components/views/AnalyticsView', () => ({
  AnalyticsView: () => <div data-testid="analytics-view">Analytics</div>,
}));

vi.mock('@/components/views/GoalsView', () => ({
  GoalsView: () => <div data-testid="goals-view">Goals</div>,
}));

vi.mock('@/components/views/ProfileView', () => ({
  ProfileView: () => <div data-testid="profile-view">Profile</div>,
}));

vi.mock('@/components/views/SettingsView', () => ({
  SettingsView: () => <div data-testid="settings-view">Settings</div>,
}));

vi.mock('@/components/views/AccountsView', () => ({
  AccountsView: () => <div data-testid="accounts-view">Accounts</div>,
}));

vi.mock('@/components/dashboard/AddTradeModal', () => ({
  AddTradeModal: () => null,
}));

vi.mock('@/components/dashboard/ImportTradesModal', () => ({
  ImportTradesModal: () => null,
}));

vi.mock('@/store/api', () => ({
  useCreateTradeMutation: () => [vi.fn(), {}],
  useBulkImportTradesMutation: () => [vi.fn(), {}],
  useGetSavedOptionsQuery: () => ({ data: undefined }),
  useGetSubscriptionQuery: () => ({ data: undefined }),
}));

vi.mock('@/store/api/adConfigApi', () => ({
  useGetAdConfigQuery: () => ({ data: undefined }),
}));

vi.mock('@/hooks/useTradesSync', () => ({
  useTradesSync: () => {},
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

import { AppPage } from '../AppPage';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * AppPage uses nested <Routes> with relative paths (e.g., "dashboard").
 * These only resolve when a parent <Route path="/app/*"> exists.
 * We create a custom render that sets up the proper routing context.
 */
function renderAppPage(route: string) {
  const store = configureStore({
    reducer: {
      auth: (state: any = { isAuthenticated: false, user: null, token: null, refreshToken: null, signupSuccess: false }) => state,
      accounts: (state: any = { selectedAccountId: null }) => state,
      trades: (state: any = {}) => state,
      api: (state: any = {}) => state,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/app/*" element={<AppPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('AppPage', () => {
  it('renders without crashing', async () => {
    renderAppPage('/app/dashboard');
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    // Wait for lazy-loaded view
    await screen.findByTestId('dashboard-view');
  });

  it('shows the sidebar component', () => {
    renderAppPage('/app/dashboard');
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });

  it('renders DashboardView at /app/dashboard', async () => {
    renderAppPage('/app/dashboard');
    expect(await screen.findByTestId('dashboard-view')).toBeInTheDocument();
  });

  it('renders TradeLogView at /app/tradelog', async () => {
    renderAppPage('/app/tradelog');
    expect(await screen.findByTestId('tradelog-view')).toBeInTheDocument();
  });

  it('renders AnalyticsView at /app/analytics', async () => {
    renderAppPage('/app/analytics');
    expect(await screen.findByTestId('analytics-view')).toBeInTheDocument();
  });

  it('renders GoalsView at /app/goals', async () => {
    renderAppPage('/app/goals');
    expect(await screen.findByTestId('goals-view')).toBeInTheDocument();
  });

  it('renders ProfileView at /app/profile', async () => {
    renderAppPage('/app/profile');
    expect(await screen.findByTestId('profile-view')).toBeInTheDocument();
  });

  it('renders SettingsView at /app/settings', async () => {
    renderAppPage('/app/settings');
    expect(await screen.findByTestId('settings-view')).toBeInTheDocument();
  });

  it('renders AccountsView at /app/accounts', async () => {
    renderAppPage('/app/accounts');
    expect(await screen.findByTestId('accounts-view')).toBeInTheDocument();
  });

  it('passes activeView derived from URL to the Sidebar', () => {
    renderAppPage('/app/analytics');
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-active-view', 'analytics');
  });
});

describe('AppPage - default route redirect', () => {
  it('redirects /app to /app/dashboard (index route)', async () => {
    renderAppPage('/app');
    expect(await screen.findByTestId('dashboard-view')).toBeInTheDocument();
  });

  it('shows dashboard as the active view when redirected from /app', () => {
    renderAppPage('/app');
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-active-view', 'dashboard');
  });
});

describe('AppPage - unknown nested routes', () => {
  it('redirects unknown nested routes to dashboard', async () => {
    renderAppPage('/app/nonexistent');
    // The catch-all route redirects to /app/dashboard
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
    });
  });

  it('still renders the sidebar for an unknown nested route', () => {
    renderAppPage('/app/unknown-route');
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });
});

describe('AppPage - Mobile Sidebar', () => {
  // useIsMobile is mocked with vi.fn() at the module level above and imported at the top.
  const mockedUseIsMobile = vi.mocked(useIsMobile);

  afterEach(() => {
    // Reset to default (desktop) after each test
    mockedUseIsMobile.mockReturnValue(false);
  });

  it('renders hamburger button when on mobile', () => {
    mockedUseIsMobile.mockReturnValue(true);
    renderAppPage('/app/dashboard');
    const hamburgerButton = screen.getByLabelText('Open sidebar menu');
    expect(hamburgerButton).toBeInTheDocument();
  });

  it('does not render hamburger button on desktop', () => {
    mockedUseIsMobile.mockReturnValue(false);
    renderAppPage('/app/dashboard');
    expect(screen.queryByLabelText('Open sidebar menu')).not.toBeInTheDocument();
  });

  it('passes mobileSidebarOpen to Sidebar component', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    mockedUseIsMobile.mockReturnValue(true);
    renderAppPage('/app/dashboard');

    const sidebar = screen.getByTestId('sidebar');

    // Initially mobileSidebarOpen should be false
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false');

    // Click the hamburger button to open the mobile sidebar
    const hamburgerButton = screen.getByLabelText('Open sidebar menu');
    await user.click(hamburgerButton);

    // After clicking, mobileSidebarOpen should be true, passed as mobileOpen prop
    expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
  });
});
