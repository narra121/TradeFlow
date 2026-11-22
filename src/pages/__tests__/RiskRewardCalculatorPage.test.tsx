import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { RiskRewardCalculatorPage } from '../resources/RiskRewardCalculatorPage';

describe('RiskRewardCalculatorPage', () => {
  it('renders one h1 and computes the default long trade: 1 : 3.00, break-even 25.0%', () => {
    renderWithProviders(<RiskRewardCalculatorPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Risk-reward calculator' })).toBeInTheDocument();
    const result = within(screen.getByTestId('rr-result'));
    expect(result.getByText('1 : 3.00')).toBeInTheDocument();
    expect(result.getByText('25.0%')).toBeInTheDocument();
    expect(result.getByText('5.00')).toBeInTheDocument();
    expect(result.getByText('15.00')).toBeInTheDocument();
  });

  it('loads the worked examples: EUR/USD long is 1 : 2.40 at 29.4%, Nifty short is 1 : 2.00 at 33.3%', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RiskRewardCalculatorPage />);
    await user.click(screen.getByRole('button', { name: 'Load the EUR/USD long example' }));
    let result = within(screen.getByTestId('rr-result'));
    expect(result.getByText('1 : 2.40')).toBeInTheDocument();
    expect(result.getByText('29.4%')).toBeInTheDocument();
    expect(result.getByText('0.0025')).toBeInTheDocument();
    expect(result.getByText('0.0060')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load the Nifty futures short example' }));
    expect(screen.getByLabelText('Short')).toBeChecked();
    expect(screen.getByLabelText('Entry price')).toHaveValue('24,500');
    result = within(screen.getByTestId('rr-result'));
    expect(result.getByText('1 : 2.00')).toBeInTheDocument();
    expect(result.getByText('33.3%')).toBeInTheDocument();
    expect(result.getByText('80.00')).toBeInTheDocument();
    expect(result.getByText('160.00')).toBeInTheDocument();
  });

  it('a stop on the entry is an error on the stop field, and no ratio is shown', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RiskRewardCalculatorPage />);
    const stop = screen.getByLabelText('Stop loss price');
    await user.clear(stop);
    await user.type(stop, '100');
    expect(stop).toHaveAttribute('aria-invalid', 'true');
    expect(stop).toHaveAccessibleDescription('For a long trade the stop loss must be below the entry.');
    expect(screen.queryByTestId('rr-result')).not.toBeInTheDocument();
  });

  it('switching a long setup to short flags both levels', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RiskRewardCalculatorPage />);
    await user.click(screen.getByLabelText('Short'));
    expect(screen.getByLabelText('Stop loss price')).toHaveAccessibleDescription('For a short trade the stop loss must be above the entry.');
    expect(screen.getByLabelText('Take profit price')).toHaveAccessibleDescription('For a short trade the take profit must be below the entry.');
  });

  it('shows the formula, both worked examples and the computed break-even table from 1 : 0.5 to 1 : 5', () => {
    renderWithProviders(<RiskRewardCalculatorPage />);
    expect(screen.getByRole('heading', { name: 'The risk-reward ratio formula' })).toBeInTheDocument();
    expect(screen.getByText('1.0850 − 1.0825 = 0.0025 (25 pips)')).toBeInTheDocument();
    expect(screen.getByText('24,580 − 24,500 = 80 points')).toBeInTheDocument();

    const table = screen.getByRole('columnheader', { name: 'With costs of 0.1R a trade' }).closest('table')!;
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell').map((c) => c.textContent));
    expect(rows).toEqual([
      ['1 : 0.5', '66.7%', '73.3%'],
      ['1 : 1', '50.0%', '55.0%'],
      ['1 : 1.5', '40.0%', '44.0%'],
      ['1 : 2', '33.3%', '36.7%'],
      ['1 : 2.5', '28.6%', '31.4%'],
      ['1 : 3', '25.0%', '27.5%'],
      ['1 : 4', '20.0%', '22.0%'],
      ['1 : 5', '16.7%', '18.3%'],
    ]);
  });

  it('renders the FAQ visibly, emits the same questions and answers as FAQPage JSON-LD and links the guide and related pages', async () => {
    const { container } = renderWithProviders(<RiskRewardCalculatorPage />);
    const faq = container.querySelector('#faq')!.closest('section')!;
    const questions = [...faq.querySelectorAll('h3')].map((h) => h.textContent ?? '');
    expect(questions.length).toBeGreaterThanOrEqual(4);
    expect(questions).toContain('How do you calculate risk-reward ratio?');

    let graph: { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[]; url?: string }[] = [];
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      graph = JSON.parse(script!.textContent!)['@graph'];
    });
    expect(graph.find((n) => n['@type'] === 'WebApplication')!.url).toBe('https://tradequt.com/resources/risk-reward');
    const entries = graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity!;
    expect(entries.map((e) => e.name)).toEqual(questions);
    expect(entries.map((e) => e.acceptedAnswer.text)).toEqual([...faq.querySelectorAll('h3 + p')].map((p) => p.textContent));

    await waitFor(() => expect(document.title).toBe('Risk-reward calculator: ratio and break-even win rate'));
    expect(document.title.length).toBeLessThanOrEqual(60);
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')!.length).toBeLessThanOrEqual(160);

    for (const href of ['/blog/risk-reward-ratio-guide', '/blog/win-rate-vs-profit-factor', '/blog/r-multiple-explained', '/resources/position-size']) {
      expect(container.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\bbest\b|#1|recommended/i);
  });
});
