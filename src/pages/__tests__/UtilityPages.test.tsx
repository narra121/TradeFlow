import { describe, it, expect, vi, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import SecurityPage from '../seo/SecurityPage';
import GoodbyePage from '../seo/GoodbyePage';
import StatusPage from '../seo/StatusPage';
import { incidentVisible, parseIncident } from '@/lib/incident';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SecurityPage', () => {
  it('states only verifiable facts and links to the privacy policy', () => {
    renderWithProviders(<SecurityPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Security and privacy' })).toBeInTheDocument();
    expect(screen.getAllByText(/us-east-1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Point-in-time recovery is enabled on the data tables/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/privacy');
  });

  it('claims no certification and no bounty', () => {
    const { container } = renderWithProviders(<SecurityPage />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/SOC ?2|ISO ?27001|PCI|bank-grade|military/i);
    expect(text).toMatch(/do not run a paid bounty/);
  });

  it('says deleted data stays in backups for up to 35 days', () => {
    const { container } = renderWithProviders(<SecurityPage />);
    expect(container.textContent).toMatch(/up to 35 days/);
  });
});

describe('GoodbyePage', () => {
  it('is a quiet receipt in the auth frame: no site navigation, no Start free, three rows', () => {
    renderWithProviders(<GoodbyePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your account has been deleted' })).toBeInTheDocument();
    expect(screen.getByText('Thank you for using TradeQut.')).toBeInTheDocument();
    ['Deleted', 'Subscription', 'Kept'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByText('Your journal, screenshots and AI reports')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Start free/ })).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByRole('link', { name: 'support@tradequt.com' })).toHaveAttribute('href', 'mailto:support@tradequt.com');
    expect(screen.getByRole('link', { name: 'Tell us why you left' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Go to tradequt.com' })).toHaveAttribute('href', '/');
  });
});

describe('status.json (shared parser with the in-app incident bar)', () => {
  const base = { id: 'inc-1', level: 'investigating', message: 'Imports are slow.' };

  it('treats an empty object, junk and unknown levels as nothing to show', () => {
    expect(parseIncident({})).toBeNull();
    expect(parseIncident(null)).toBeNull();
    expect(parseIncident({ ...base, level: 'fire' })).toBeNull();
  });

  it('honours from / until', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    expect(incidentVisible(parseIncident(base), now, new Set())).toBe(true);
    expect(incidentVisible(parseIncident({ ...base, from: '2026-11-11T13:00:00Z' }), now, new Set())).toBe(false);
    expect(incidentVisible(parseIncident({ ...base, level: 'resolved', until: '2026-11-11T11:00:00Z' }), now, new Set())).toBe(false);
  });
});

describe('StatusPage', () => {
  const stubFetch = (impl: () => Promise<unknown>) => vi.stubGlobal('fetch', vi.fn(impl));
  const json = (body: unknown) => () => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

  it('says all systems normal for an empty status file', async () => {
    stubFetch(json({}));
    renderWithProviders(<StatusPage />);
    expect(await screen.findByText('All systems normal')).toBeInTheDocument();
  });

  it('shows the active notice with its level, message and link', async () => {
    stubFetch(json({ id: 'inc-2', level: 'identified', message: 'Imports are slow.', link: 'https://example.com/x', from: '2026-01-01T00:00:00Z' }));
    renderWithProviders(<StatusPage />);
    expect(await screen.findByText('Issue identified')).toBeInTheDocument();
    expect(screen.getByText('Imports are slow.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'More detail' })).toHaveAttribute('href', 'https://example.com/x');
  });

  it('says so and gives an email when the status file cannot be loaded', async () => {
    stubFetch(() => Promise.reject(new Error('offline')));
    renderWithProviders(<StatusPage />);
    await waitFor(() => expect(screen.getByText(/could not load the status file/)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'support@tradequt.com' })).toHaveAttribute('href', 'mailto:support@tradequt.com');
  });

  it('is announced politely', () => {
    stubFetch(() => new Promise(() => {}));
    renderWithProviders(<StatusPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking status...');
  });
});
