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

describe('NotFound - extended', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the 404 text as a heading element', () => {
    renderWithProviders(<NotFound />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('404');
  });

  it('renders the "Page not found" message in a paragraph', () => {
    renderWithProviders(<NotFound />);
    const message = screen.getByText(/oops! page not found/i);
    expect(message).toBeInTheDocument();
    expect(message.tagName).toBe('P');
  });

  it('has a link back to home with href="/"', () => {
    renderWithProviders(<NotFound />);
    const link = screen.getByRole('link', { name: /return to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('the home link contains the text "Return to Home"', () => {
    renderWithProviders(<NotFound />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('Return to Home');
  });

  it('has a heading role for accessibility', () => {
    renderWithProviders(<NotFound />);
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(headings[0]).toHaveTextContent('404');
  });
});
