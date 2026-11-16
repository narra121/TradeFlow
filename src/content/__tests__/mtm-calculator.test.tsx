import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BLOG_ARTICLES } from '../blog/articles';
import { MtmCalculator } from '../components/MtmCalculator';

const dayRow = (label: string) => screen.getByRole('row', { name: new RegExp(`^${label}`) });

describe('MtmCalculator', () => {
  it('starts as the worked example and reconciles', () => {
    render(<MtmCalculator />);
    const exit = within(dayRow('Exit, day 4')).getAllByRole('cell');
    expect(exit.map((c) => c.textContent)).toEqual(['Exit, day 4', '24,095.50', '−₹5,450.00', '+₹3,550.00', '−₹5,450.00']);
    const [realised, summed] = screen.getAllByRole('definition');
    expect(realised).toHaveTextContent('−₹5,450.00');
    expect(summed).toHaveTextContent('−₹5,450.00');
  });

  it('reverses the signs for a short position', async () => {
    const user = userEvent.setup();
    render(<MtmCalculator />);
    await user.click(screen.getByLabelText('Short'));
    expect(within(dayRow('Day 2')).getAllByRole('cell')[3]).toHaveTextContent('+₹6,525.00');
    expect(screen.getAllByRole('definition')[0]).toHaveTextContent('+₹5,450.00');
  });

  it('with no settlement prices it shows one exit row whose MTM is the realised P&L', async () => {
    const user = userEvent.setup();
    render(<MtmCalculator />);
    for (const day of [1, 2, 3]) await user.clear(screen.getByLabelText(`Day ${day}`));
    const cells = within(dayRow('Exit, day 1')).getAllByRole('cell');
    expect(cells[3]).toHaveTextContent('−₹5,450.00');
    expect(screen.queryByRole('row', { name: /^Day 1/ })).toBeNull();
  });

  it('shows a message instead of a table for invalid input', async () => {
    const user = userEvent.setup();
    render(<MtmCalculator />);
    await user.clear(screen.getByLabelText('Quantity (lots × lot size)'));
    await user.type(screen.getByLabelText('Quantity (lots × lot size)'), '0');
    expect(screen.getAllByText('Quantity must be above zero.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('uses text inputs with the decimal keypad', () => {
    const { container } = render(<MtmCalculator />);
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0);
    for (const input of Array.from(container.querySelectorAll('input[type="text"]'))) expect(input).toHaveAttribute('inputmode', 'decimal');
  });
});

describe('MTM article', () => {
  it('quotes the same worked-example totals the calculator produces and cites the exchange source', async () => {
    const a = BLOG_ARTICLES.find((x) => x.slug === 'mtm-vs-realised-pnl-futures-options')!;
    const Content = (await a.content()).default;
    const { container } = render(
      <MemoryRouter>
        <Content />
      </MemoryRouter>,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('−5,450.00');
    expect(text).toContain('−6,525.00');
    expect(container.querySelector('a[href="https://www.nseclearing.in/clearing-settlement/equity-derivatives/settlement-mechanism"]')).not.toBeNull();
    expect(a.publishedAt).toBe('2026-11-15');
    expect(a.faq?.length).toBeGreaterThanOrEqual(4);
  });
});
