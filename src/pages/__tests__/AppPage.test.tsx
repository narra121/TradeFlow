import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock all heavy child components to isolate AppPage
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: (props: any) => (
    <div data-testid="sidebar" data-active-view={props.activeView}>
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

vi.mock('@/hooks/useTradesSync', () => ({
  useTradesSync: () => {},
}));

import { AppPage } from '../AppPage';

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
  it('renders without crashing', () => {
    renderAppPage('/app/dashboard');
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('shows the sidebar component', () => {
    renderAppPage('/app/dashboard');
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });

  it('renders DashboardView at /app/dashboard', () => {
    renderAppPage('/app/dashboard');
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
  });

  it('renders TradeLogView at /app/tradelog', () => {
    renderAppPage('/app/tradelog');
    expect(screen.getByTestId('tradelog-view')).toBeInTheDocument();
  });

  it('renders AnalyticsView at /app/analytics', () => {
    renderAppPage('/app/analytics');
    expect(screen.getByTestId('analytics-view')).toBeInTheDocument();
  });

  it('renders GoalsView at /app/goals', () => {
    renderAppPage('/app/goals');
    expect(screen.getByTestId('goals-view')).toBeInTheDocument();
  });

  it('renders ProfileView at /app/profile', () => {
    renderAppPage('/app/profile');
    expect(screen.getByTestId('profile-view')).toBeInTheDocument();
  });

  it('renders SettingsView at /app/settings', () => {
    renderAppPage('/app/settings');
    expect(screen.getByTestId('settings-view')).toBeInTheDocument();
  });

  it('renders AccountsView at /app/accounts', () => {
    renderAppPage('/app/accounts');
    expect(screen.getByTestId('accounts-view')).toBeInTheDocument();
  });

  it('passes activeView derived from URL to the Sidebar', () => {
    renderAppPage('/app/analytics');
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-active-view', 'analytics');
  });
});
