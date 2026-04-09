import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import NotFound from '../NotFound';

describe('NotFound', () => {
  beforeEach(() => {
    // Suppress the console.error from the useEffect in NotFound
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the 404 heading', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('displays "Page not found" message', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it('has a link back to home', () => {
    renderWithProviders(<NotFound />);
    const homeLink = screen.getByText(/return to home/i);
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('logs a 404 error to console', () => {
    renderWithProviders(<NotFound />, { route: '/some/missing/page' });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('404'),
      expect.any(String)
    );
  });
});
