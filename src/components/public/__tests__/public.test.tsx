import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PricingTable, defaultCurrency } from '../PricingTable';
import { PublicLayout } from '../PublicLayout';
import { formatSigned, SAMPLE_DAYS, sampleNet } from '../tourFixture';
import { PLAN_LIMITS } from '@/content/product-facts';
import { OPEN_CONSENT_EVENT } from '@/lib/analytics';

const wrap = (ui: React.ReactElement, route = '/') => render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);

describe('defaultCurrency', () => {
  it('is INR for any -IN locale and USD otherwise, with no network lookup', () => {
    expect(defaultCurrency(['en-IN'])).toBe('INR');
    expect(defaultCurrency(['hi-IN', 'en-US'])).toBe('INR');
    expect(defaultCurrency(['en-US'])).toBe('USD');
    expect(defaultCurrency(['en-GB', 'de-DE'])).toBe('USD');
    expect(defaultCurrency([])).toBe('USD');
  });
});

describe('PricingTable', () => {
  it('renders one row per plan limit from product-facts', () => {
    wrap(<PricingTable />);
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(PLAN_LIMITS.length + 1);
    for (const r of PLAN_LIMITS) expect(screen.getByRole('rowheader', { name: r.feature })).toBeInTheDocument();
  });

  it('toggles interval and currency with radio groups (selected = secondary, not an emerald fill)', async () => {
    const user = userEvent.setup();
    wrap(<PricingTable />);
    expect(screen.getByRole('radiogroup', { name: 'Billing period' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Currency' })).toBeInTheDocument();
    const monthly = screen.getByRole('radio', { name: 'Monthly' });
    const yearly = screen.getByRole('radio', { name: 'Yearly' });
    expect(monthly).toBeChecked();
    expect(monthly.closest('label')?.className).toContain('bg-secondary');
    expect(monthly.closest('label')?.className).not.toContain('bg-primary');
    expect(screen.getByText('$4.99')).toBeInTheDocument();
    await user.click(yearly);
    expect(yearly).toBeChecked();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'INR' }));
    expect(screen.getByText('₹4,999')).toBeInTheDocument();
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });

  it('shows the trial sentence and a Start free link', () => {
    wrap(<PricingTable />);
    expect(screen.getByText(/14-day Pro trial, no card required/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/signup');
  });
});

describe('tourFixture (the one sample month)', () => {
  it('fixture sums to the displayed net', () => {
    expect(sampleNet(SAMPLE_DAYS)).toBeCloseTo(SAMPLE_DAYS.reduce((s, d) => s + d.pnl, 0), 2);
    expect(formatSigned(-42)).toBe('−$42.00');
    expect(formatSigned(1234.5)).toBe('+$1,234.50');
  });
});

describe('PublicLayout', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('provides skip link, banner, main, footer and a single main landmark', () => {
    wrap(
      <PublicLayout>
        <h1>Page</h1>
      </PublicLayout>,
    );
    expect(screen.getByText('Skip to content')).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('has Log in and Start free in the header on every page', () => {
    wrap(<PublicLayout>x</PublicLayout>);
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/signup');
    expect(within(header).getAllByRole('link', { name: 'Log in' })[0]).toHaveAttribute('href', '/login');
  });

  it('opens and closes the mobile menu with aria-expanded and Escape', async () => {
    const user = userEvent.setup();
    wrap(<PublicLayout>x</PublicLayout>);
    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('footer groups legal links and re-opens cookie settings', async () => {
    const user = userEvent.setup();
    const opened = vi.fn();
    window.addEventListener(OPEN_CONSENT_EVENT, opened);
    wrap(<PublicLayout>x</PublicLayout>);
    const footer = screen.getByRole('contentinfo');
    for (const name of ['Privacy', 'Terms', 'Refunds', 'Status', 'Glossary', 'Changelog']) {
      expect(within(footer).getByRole('link', { name })).toBeInTheDocument();
    }
    await user.click(within(footer).getByRole('button', { name: 'Cookie settings' }));
    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_CONSENT_EVENT, opened);
  });

  it('has the same header link list on every page, with Resources as a disclosure', async () => {
    const user = userEvent.setup();
    wrap(<PublicLayout>x</PublicLayout>);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Product', 'Pricing', 'Guide', 'Blog']);
    const resources = within(nav).getByRole('button', { name: 'Resources' });
    expect(resources).toHaveAttribute('aria-expanded', 'false');
    await user.click(resources);
    expect(resources).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Product', 'Pricing', 'Guide', 'Blog', 'Glossary', 'Calculators', 'Scenarios', 'Alternatives', 'Changelog',
    ]);
    await user.keyboard('{Escape}');
    expect(resources).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not link the unpublished security page', () => {
    wrap(<PublicLayout>x</PublicLayout>);
    expect(screen.queryByRole('link', { name: /security/i })).not.toBeInTheDocument();
  });

  it('keeps the sticky header from covering focused elements (scroll padding)', () => {
    const { unmount } = wrap(<PublicLayout>x</PublicLayout>);
    expect(document.documentElement.style.scrollPaddingTop).toBe('4.5rem');
    unmount();
    expect(document.documentElement.style.scrollPaddingTop).toBe('');
  });

  it('scrolls to and focuses the hash target (e.g. /glossary#drawdown)', async () => {
    vi.useFakeTimers();
    wrap(
      <PublicLayout>
        <h3 id="drawdown">Drawdown</h3>
      </PublicLayout>,
      '/glossary#drawdown',
    );
    await act(async () => {
      vi.runAllTimers();
    });
    const target = document.getElementById('drawdown')!;
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(target).toHaveFocus();
    vi.useRealTimers();
  });
});
