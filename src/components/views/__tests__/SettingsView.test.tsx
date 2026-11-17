import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

let mobile = false;
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ plan: 'trial', status: 'trialing', trialDaysLeft: 9 }) }));
vi.mock('@/components/profile', () => ({
  ProfileSection: () => <p>profile-section</p>,
  SecuritySection: () => <p>security-section</p>,
  DataPrivacySection: () => <p>data-section</p>,
}));
vi.mock('@/components/settings/PreferencesSection', () => ({ PreferencesSection: () => <p>preferences-section</p> }));
vi.mock('@/components/settings/OptionsSection', () => ({ OptionsSection: () => <p>options-section</p> }));
vi.mock('@/components/settings/NotificationsSection', () => ({ NotificationsSection: () => <p>notifications-section</p> }));
vi.mock('@/components/billing/BillingView', () => ({ BillingView: () => <p>billing-section</p> }));
const chrome = vi.hoisted(() => ({ statement: '' }));
vi.mock('@/components/shell/chrome', () => ({ usePageChrome: (c: { statement: string }) => void (chrome.statement = c.statement) }));

import { SettingsView } from '../SettingsView';

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/settings/*" element={<><SettingsView /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mobile = false;
  window.matchMedia = ((query: string) => ({ matches: mobile && query.includes('767'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
});

describe('SettingsView', () => {
  it.each([
    ['profile', 'profile-section'],
    ['security', 'security-section'],
    ['preferences', 'preferences-section'],
    ['options', 'options-section'],
    ['notifications', 'notifications-section'],
    ['data', 'data-section'],
    ['billing', 'billing-section'],
  ])('/app/settings/%s renders its section with aria-current in the list', (path, text) => {
    at(`/app/settings/${path}`);
    expect(screen.getByText(text)).toBeInTheDocument();
    const current = screen.getByRole('navigation', { name: 'Settings' }).querySelector('[aria-current="page"]');
    expect(current).toBeTruthy();
    expect(current?.getAttribute('href')).toBe(`/app/settings/${path}`);
  });

  it('the index opens Profile on desktop', () => {
    at('/app/settings');
    expect(screen.getByText('profile-section')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/app/settings/profile');
  });

  it('groups the list as Account, Journal, Data and Billing and shows the plan beside Plan & billing', () => {
    at('/app/settings/profile');
    const nav = screen.getByRole('navigation', { name: 'Settings' });
    for (const g of ['Account', 'Journal', 'Data', 'Billing']) expect(nav).toHaveTextContent(g);
    expect(screen.getByRole('link', { name: /Plan & billing/ })).toHaveTextContent('Free trial');
  });

  it('an unknown section goes back to Profile', () => {
    at('/app/settings/nope');
    expect(screen.getByTestId('where')).toHaveTextContent('/app/settings/profile');
  });

  it('on a phone the index is the section list and a section has a back link', () => {
    mobile = true;
    const { unmount } = at('/app/settings');
    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByText('profile-section')).toBeNull();
    // The sub-header under the page title says what the list holds, not "Settings" a second time.
    expect(chrome.statement).toBe('Settings — account, journal, data and billing');
    unmount();
    at('/app/settings/preferences');
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/app/settings');
    expect(screen.queryByRole('navigation', { name: 'Settings' })).toBeNull();
  });
});
