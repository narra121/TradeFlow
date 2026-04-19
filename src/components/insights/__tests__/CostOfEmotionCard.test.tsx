import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { CostOfEmotionCard } from '../CostOfEmotionCard';
import type { CostOfEmotion } from '@/types/insights';

describe('CostOfEmotionCard', () => {
  const mockCostOfEmotion: CostOfEmotion = {
    revengeTrading: { count: 3, totalPnl: -450, avgPnl: -150 },
    overtrading: { daysCount: 2, excessTradePnl: -200 },
    rulesViolations: { count: 5, totalPnl: -300 },
    totalEmotionalCost: -950,
  };

  it('renders "Cost of Emotion" heading', () => {
    render(<CostOfEmotionCard costOfEmotion={mockCostOfEmotion} />);
    expect(screen.getByText('Cost of Emotion')).toBeInTheDocument();
  });

  it('renders total emotional cost', () => {
    render(<CostOfEmotionCard costOfEmotion={mockCostOfEmotion} />);
    expect(screen.getByText('-$950')).toBeInTheDocument();
  });

  it('renders revenge trading row with count', () => {
    render(<CostOfEmotionCard costOfEmotion={mockCostOfEmotion} />);
    expect(screen.getByText('Revenge Trading')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('renders overtrading row with count', () => {
    render(<CostOfEmotionCard costOfEmotion={mockCostOfEmotion} />);
    expect(screen.getByText('Overtrading')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders rules violations row with count', () => {
    render(<CostOfEmotionCard costOfEmotion={mockCostOfEmotion} />);
    expect(screen.getByText('Rules Violations')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
  });

  it('hides rows with zero count', () => {
    const noCost: CostOfEmotion = {
      revengeTrading: { count: 0, totalPnl: 0, avgPnl: 0 },
      overtrading: { daysCount: 0, excessTradePnl: 0 },
      rulesViolations: { count: 1, totalPnl: -50 },
      totalEmotionalCost: -50,
    };
    render(<CostOfEmotionCard costOfEmotion={noCost} />);
    expect(screen.queryByText('Revenge Trading')).not.toBeInTheDocument();
    expect(screen.queryByText('Overtrading')).not.toBeInTheDocument();
    expect(screen.getByText('Rules Violations')).toBeInTheDocument();
  });

  it('applies critical border when cost exceeds -100', () => {
    const { container } = render(
      <CostOfEmotionCard costOfEmotion={mockCostOfEmotion} />
    );
    const card = container.querySelector('.border-l-destructive');
    expect(card).toBeInTheDocument();
  });

  it('does not apply critical border when cost is above -100', () => {
    const mildCost: CostOfEmotion = {
      revengeTrading: { count: 1, totalPnl: -20, avgPnl: -20 },
      overtrading: { daysCount: 0, excessTradePnl: 0 },
      rulesViolations: { count: 0, totalPnl: 0 },
      totalEmotionalCost: -20,
    };
    const { container } = render(
      <CostOfEmotionCard costOfEmotion={mildCost} />
    );
    const card = container.querySelector('.border-l-destructive');
    expect(card).not.toBeInTheDocument();
  });

  it('formats large values with K suffix', () => {
    const largeCost: CostOfEmotion = {
      revengeTrading: { count: 10, totalPnl: -5000, avgPnl: -500 },
      overtrading: { daysCount: 0, excessTradePnl: 0 },
      rulesViolations: { count: 0, totalPnl: 0 },
      totalEmotionalCost: -5000,
    };
    render(<CostOfEmotionCard costOfEmotion={largeCost} />);
    const elements = screen.getAllByText('-$5.0K');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});
