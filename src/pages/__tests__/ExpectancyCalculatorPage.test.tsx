import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ExpectancyCalculatorPage } from '../resources/ExpectancyCalculatorPage';

describe('ExpectancyCalculatorPage', () => {
  it('computes the forex defaults: +9.00 a trade, +0.09R, break-even 41.4%', () => {
    renderWithProviders(<ExpectancyCalculatorPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Expectancy and break-even win rate calculator' })).toBeInTheDocument();
    expect(screen.getByText('+9.00')).toBeInTheDocument();
    expect(screen.getByText('+0.09R')).toBeInTheDocument();
    expect(screen.getAllByText('41.4%').length).toBeGreaterThan(0);
    expect(screen.getByText('1 : 1.50')).toBeInTheDocument();
  });

  it('loads the Nifty options example, which turns negative after charges', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpectancyCalculatorPage />);
    await user.click(screen.getByRole('button', { name: 'Load the Nifty options example' }));
    expect(screen.getByText('−38.00')).toBeInTheDocument();
    expect(screen.getByText('Before charges: +52.00')).toBeInTheDocument();
  });

  it('shows n/a for R when the average loss is 0, and an error for a win rate over 100', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpectancyCalculatorPage />);
    const loss = screen.getByLabelText(/Average loss/);
    await user.clear(loss);
    await user.type(loss, '0');
    expect(screen.getByText('n/a (no losses)')).toBeInTheDocument();
    const winRate = screen.getByLabelText('Win rate (%)');
    await user.clear(winRate);
    await user.type(winRate, '120');
    expect(screen.getAllByText('Win rate must be between 0 and 100 percent.').length).toBeGreaterThan(0);
  });

  it('switches to R multiples and checks a reward:risk', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpectancyCalculatorPage />);
    await user.click(screen.getByLabelText('R multiples'));
    expect(screen.getByLabelText('Average win (R)')).toHaveValue('1.5');
    expect(screen.getByTestId('ratio-check')).toHaveTextContent('1:2 needs 33.3% before charges.');
  });

  it('renders the break-even table and the FAQ, with links to the related articles', () => {
    const { container } = renderWithProviders(<ExpectancyCalculatorPage />);
    expect(screen.getByRole('heading', { name: 'Break-even win rate by reward:risk' })).toBeInTheDocument();
    expect(screen.getByText('1 : 3')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeInTheDocument();
    for (const href of ['/blog/trading-expectancy-formula', '/blog/win-rate-vs-profit-factor', '/blog/r-multiple-explained', '/resources/pip-calculator']) {
      expect(container.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\bbest\b|#1/i);
  });
});
