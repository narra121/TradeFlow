import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PositionSizeCalculatorPage } from '../resources/PositionSizeCalculatorPage';
import { RiskRewardCalculatorPage } from '../resources/RiskRewardCalculatorPage';
import { PipCalculatorPage } from '../resources/PipCalculatorPage';
import { parseDecimal } from '@/components/content/calculator';

describe('parseDecimal', () => {
  it('accepts commas, spaces and a trailing dot while typing, and returns 0 for junk', () => {
    expect(parseDecimal('1,250.50')).toBe(1250.5);
    expect(parseDecimal(' 10 000 ')).toBe(10000);
    expect(parseDecimal('1.')).toBe(1);
    expect(parseDecimal('abc')).toBe(0);
    expect(parseDecimal('')).toBe(0);
  });
});

describe('calculators', () => {
  it('use text inputs with the decimal keypad, never spinner number inputs', () => {
    for (const Page of [PositionSizeCalculatorPage, RiskRewardCalculatorPage]) {
      const { container, unmount } = renderWithProviders(<Page />);
      expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0);
      for (const input of Array.from(container.querySelectorAll('input[type="text"]'))) expect(input).toHaveAttribute('inputmode', 'decimal');
      unmount();
    }
  });

  it('position size: shows 0.20 lots and $100.00 for the defaults, matching the live region wording', async () => {
    renderWithProviders(<PositionSizeCalculatorPage />);
    expect(screen.getByText('0.20 lots')).toBeInTheDocument();
    expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0);
    expect(screen.queryByText(/0\.2000/)).not.toBeInTheDocument();
  });

  it('position size: recomputes while typing, including a half-typed number like "1."', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    const risk = screen.getByLabelText(/Risk per trade/);
    await user.clear(risk);
    await user.type(risk, '2.');
    expect(risk).toHaveValue('2.');
    expect(screen.getByText('0.40 lots')).toBeInTheDocument();
  });

  it('uses sentence case for titles and labels', () => {
    renderWithProviders(<PipCalculatorPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Pip value calculator' })).toBeInTheDocument();
    expect(screen.getByLabelText('Currency pair')).toBeInTheDocument();
    expect(screen.getByLabelText('Lot size')).toBeInTheDocument();
  });

  it('pip value: EUR/USD standard lot shows $10.00', () => {
    renderWithProviders(<PipCalculatorPage />);
    expect(screen.getAllByText('$10.00').length).toBeGreaterThan(0);
  });

  it('risk-reward: default long trade is 1 : 3.00 with a 25.0% breakeven win rate', () => {
    renderWithProviders(<RiskRewardCalculatorPage />);
    expect(screen.getByText('1 : 3.00')).toBeInTheDocument();
    expect(screen.getByTestId('rr-result')).toHaveTextContent('25.0%');
  });
  it('risk-reward: a forex short shows risk and reward per unit at the price precision, not rounded to 0.01', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RiskRewardCalculatorPage />);
    await user.click(screen.getByLabelText('Short'));
    for (const [label, value] of [['Entry price', '1.2650'], ['Stop loss price', '1.2700'], ['Take profit price', '1.2500']] as const) {
      const input = screen.getByLabelText(label);
      await user.clear(input);
      await user.type(input, value);
    }
    expect(screen.getByText('1 : 3.00')).toBeInTheDocument();
    expect(screen.getByText('0.0050')).toBeInTheDocument();
    expect(screen.getByText('0.0150')).toBeInTheDocument();
  });

  it('risk-reward: whole-number prices keep two decimals', () => {
    renderWithProviders(<RiskRewardCalculatorPage />);
    expect(screen.getByText('5.00')).toBeInTheDocument();
    expect(screen.getByText('15.00')).toBeInTheDocument();
  });
});

