import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Table } from '@/content/components/ArticleParts';

function widths(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
}

describe('article tables on a narrow screen (axe scrollable-region-focusable)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a table wider than the page is a named region the keyboard can reach', () => {
    widths(620, 358);
    render(<MemoryRouter><Table caption="Margin for one lot" head={['Position', 'Value']} rows={[['1 lot', '$108,500']]} /></MemoryRouter>);
    const region = screen.getByRole('region', { name: 'Margin for one lot' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('without a caption the region is named after the columns', () => {
    widths(620, 358);
    render(<MemoryRouter><Table head={['Position', 'Value']} rows={[['1 lot', '$108,500']]} /></MemoryRouter>);
    expect(screen.getByRole('region', { name: 'Table: Position, Value' })).toBeInTheDocument();
  });

  it('a table that fits adds no tab stop', () => {
    widths(358, 358);
    const { container } = render(<MemoryRouter><Table head={['A']} rows={[['1']]} /></MemoryRouter>);
    expect(screen.queryByRole('region')).toBeNull();
    expect(container.querySelector('[tabindex]')).toBeNull();
  });
});

describe('a wide table says it scrolls, and its caption is never cut (L21-032)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('while it scrolls, a hint says more columns sit to the right; a table that fits has none', () => {
    widths(620, 358);
    const { unmount } = render(<MemoryRouter><Table caption="MTM by day" head={['Day', 'MTM']} rows={[['Mon', '₹1,200.00']]} /></MemoryRouter>);
    expect(screen.getByText('Scroll sideways for more columns →')).toBeInTheDocument();
    unmount();
    widths(358, 358);
    render(<MemoryRouter><Table caption="MTM by day" head={['Day', 'MTM']} rows={[['Mon', '₹1,200.00']]} /></MemoryRouter>);
    expect(screen.queryByText('Scroll sideways for more columns →')).toBeNull();
  });

  it('shows the caption outside the scrolling box and keeps it as the table name', () => {
    widths(620, 358);
    render(<MemoryRouter><Table caption="MTM by day" head={['Day', 'MTM']} rows={[['Mon', '₹1,200.00']]} /></MemoryRouter>);
    const region = screen.getByRole('region', { name: 'MTM by day' });
    expect(screen.getByRole('table', { name: 'MTM by day' })).toBeInTheDocument();
    const visible = [...document.querySelectorAll('p')].find((p) => p.textContent === 'MTM by day');
    expect(visible).toBeDefined();
    expect(region.contains(visible!)).toBe(false);
  });
});
