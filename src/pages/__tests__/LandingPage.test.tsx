import { describe, it, expect, beforeAll, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import { LandingPage } from '../LandingPage';
import { IMPORT_SOURCES, PRODUCT_FAQ } from '@/content/product-facts';
import { daysSortedAt } from '@/components/landing/ParticleAssembly';
import { SAMPLE_DAYS } from '@/components/public/tourFixture';

// jsdom has no layout observers or 2-D canvas; the stageshow stages and the particle canvas only need them to exist.
beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

describe('LandingPage', () => {
  it('has one h1 that states the value proposition', () => {
    renderWithProviders(<LandingPage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('The trading journal that shows what your rules cost you.');
  });

  it('invents no social proof: no counts, ratings, testimonials or rankings', () => {
    const { container } = renderWithProviders(<LandingPage />);
    const text = container.textContent ?? '';
    for (const banned of [/10,000\+/, /500K\+/, /4\.9\/5/, /#1 Trading Journal/i, /Marcus Chen|Sarah Johnson|David Kim/, /Loved by/i, /Join thousands/i, /Avg\.? Win Rate/i]) {
      expect(text).not.toMatch(banned);
    }
  });

  it('offers Start free to /signup and Log in to /login in the shared header', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getAllByRole('link', { name: 'Start free' }).every((l) => l.getAttribute('href') === '/signup')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Log in' }).some((l) => l.getAttribute('href') === '/login')).toBe(true);
  });

  it('states the trial and that no card is needed', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getAllByText('14-day Pro trial. No card.')).toHaveLength(2); // hero and closing band
  });

  it('lists every import source and says sync is planned', () => {
    renderWithProviders(<LandingPage />);
    const section = screen.getByRole('region', { name: 'Import from your broker' });
    for (const s of IMPORT_SOURCES) {
      expect(within(section).getByText(s.id === 'generic_csv' ? 'Any CSV' : s.name)).toBeInTheDocument();
    }
    expect(within(section).getByText('File import today. Automatic sync is planned.')).toBeInTheDocument();
  });

  it('compares a spreadsheet with TradeQut without competitor claims', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('heading', { name: 'Spreadsheet vs TradeQut' })).toBeInTheDocument();
    expect(screen.getAllByText('Getting trades in').length).toBeGreaterThan(0);
  });

  it('shows the Free vs Pro pricing table with a currency toggle', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);
    const pricing = screen.getByRole('region', { name: 'Pricing' });
    expect(within(pricing).getByText('$9.99')).toBeInTheDocument();
    await user.click(within(pricing).getByRole('radio', { name: 'INR' }));
    expect(within(pricing).getByText('₹199')).toBeInTheDocument();
    await user.click(within(pricing).getByRole('radio', { name: 'Yearly' }));
    expect(within(pricing).getByText('₹1,499')).toBeInTheDocument();
  });

  it('renders every product FAQ question visibly', () => {
    renderWithProviders(<LandingPage />);
    for (const f of PRODUCT_FAQ) {
      expect(screen.getByRole('heading', { name: f.question })).toBeInTheDocument();
    }
  });

  it('names the services that handle data', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText(/Stripe processes subscription payments/)).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini/)).toBeInTheDocument();
  });

  it('renders the shared footer with cookie settings', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('button', { name: 'Cookie settings' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${new Date().getFullYear()} TradeQut`))).toBeInTheDocument();
  });

  it('answers FAQ items in an accordion: question headings hold buttons that show the answer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);
    const q = screen.getByRole('button', { name: 'Is TradeQut free?' });
    expect(q).toHaveAttribute('aria-expanded', 'false');
    await user.click(q);
    expect(q).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(q.getAttribute('aria-controls')!)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Do I need to connect my broker account?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What happens when the Pro trial ends?' })).toBeInTheDocument();
  });

  it('labels every product picture as sample data', () => {
    renderWithProviders(<LandingPage />);
    const pictures = screen.getAllByRole('img').filter((el) => el.tagName !== 'svg' && el.tagName !== 'IMG');
    expect(pictures.length).toBeGreaterThanOrEqual(8);
    for (const p of pictures) expect(p.getAttribute('aria-label')).toMatch(/^Sample data/);
  });

  it('sends See pricing and the pricing section links to /pricing', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('link', { name: 'See pricing' })).toHaveAttribute('href', '/pricing');
    const pricing = screen.getByRole('region', { name: 'Pricing' });
    expect(within(pricing).getByRole('link', { name: 'See full pricing' })).toHaveAttribute('href', '/pricing');
  });

  it('sorts the sample month into the calendar: no day at the pin, every day before the release, never a day taken back', () => {
    expect(daysSortedAt(0)).toBe(0);
    expect(daysSortedAt(0.94)).toBe(SAMPLE_DAYS.length);
    const steps = Array.from({ length: 101 }, (_, i) => daysSortedAt(i / 100));
    steps.forEach((n, i) => expect(n).toBeGreaterThanOrEqual(steps[Math.max(0, i - 1)]));
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('heading', { name: 'Every trade from the file, sorted into days and read as a month.' })).toBeInTheDocument();
    expect(screen.getByText('29 trades in 11 days')).toBeInTheDocument();
  });

  it('has a Pause control for the animations', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);
    const pause = screen.getByRole('button', { name: /animations/ });
    const before = pause.getAttribute('aria-pressed');
    await user.click(pause);
    expect(pause.getAttribute('aria-pressed')).not.toBe(before);
  });
});
