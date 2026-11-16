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
