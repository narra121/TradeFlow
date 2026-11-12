import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import NotFound from '../NotFound';

describe('NotFound', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Page not found" as the one h1', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('offers links to Home, Guide, Blog and Log in using router links', () => {
    renderWithProviders(<NotFound />);
    const main = screen.getByRole('main');
    for (const [name, href] of [
      ['Home', '/'],
      ['Guide', '/guide'],
      ['Blog', '/blog'],
      ['Log in', '/login'],
    ] as const) {
      const link = Array.from(main.querySelectorAll('a')).find((a) => a.textContent === name);
      expect(link, name).toBeDefined();
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('is inside the public frame: skip link, header and footer', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('Skip to content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start free' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${new Date().getFullYear()} TradeQut`))).toBeInTheDocument();
  });

  it('does not write to the console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<NotFound />, { route: '/some/missing/page' });
    expect(spy).not.toHaveBeenCalled();
  });
});
