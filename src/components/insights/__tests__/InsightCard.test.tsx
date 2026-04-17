import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { InsightCard } from '../InsightCard';
import type { Insight } from '@/types/insights';

describe('InsightCard', () => {
  const criticalInsight: Insight = {
    severity: 'critical',
    title: 'Revenge trading detected',
    detail: 'You took 3 trades within 10 minutes of a loss',
    evidence: '3 consecutive losses on March 12',
    tradeIds: ['t1', 't2', 't3'],
  };

  const strengthInsight: Insight = {
    severity: 'strength',
    title: 'Consistent EURUSD strategy',
    detail: 'Your EURUSD trades show a 72% win rate',
    evidence: '18 wins out of 25 trades',
  };

  it('renders severity badge "Critical"', () => {
    render(<InsightCard insight={criticalInsight} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders title text', () => {
    render(<InsightCard insight={criticalInsight} />);
    expect(screen.getByText('Revenge trading detected')).toBeInTheDocument();
  });

  it('hides detail by default (collapsed)', () => {
    render(<InsightCard insight={criticalInsight} />);
    expect(
      screen.queryByText('You took 3 trades within 10 minutes of a loss')
    ).not.toBeInTheDocument();
  });

  it('expands to show detail when clicked', async () => {
    const user = userEvent.setup();
    render(<InsightCard insight={criticalInsight} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(
      screen.getByText('You took 3 trades within 10 minutes of a loss')
    ).toBeInTheDocument();
  });

  it('collapses detail when clicked again', async () => {
    const user = userEvent.setup();
    render(<InsightCard insight={criticalInsight} />);

    const card = screen.getByRole('button');
    await user.click(card);
    expect(
      screen.getByText('You took 3 trades within 10 minutes of a loss')
    ).toBeInTheDocument();

    await user.click(card);
    expect(
      screen.queryByText('You took 3 trades within 10 minutes of a loss')
    ).not.toBeInTheDocument();
  });

  it('shows evidence text when expanded', async () => {
    const user = userEvent.setup();
    render(<InsightCard insight={criticalInsight} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(
      screen.getByText(/3 consecutive losses on March 12/)
    ).toBeInTheDocument();
  });

  it('shows trade link count when tradeIds are present', async () => {
    const user = userEvent.setup();
    render(<InsightCard insight={criticalInsight} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(screen.getByText('View 3 related trades')).toBeInTheDocument();
  });

  it('does not show trade link when tradeIds are absent', async () => {
    const user = userEvent.setup();
    render(<InsightCard insight={strengthInsight} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(screen.queryByText(/View.*related trade/)).not.toBeInTheDocument();
  });

  it('renders with strength severity badge', () => {
    render(<InsightCard insight={strengthInsight} />);
    expect(screen.getByText('Strength')).toBeInTheDocument();
  });

  it('renders with warning severity', () => {
    const warningInsight: Insight = {
      severity: 'warning',
      title: 'Position size increasing',
      detail: 'Your average position size has doubled this week',
      evidence: 'Average lot size went from 0.5 to 1.0',
    };
    render(<InsightCard insight={warningInsight} />);
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Position size increasing')).toBeInTheDocument();
  });

  it('renders with info severity', () => {
    const infoInsight: Insight = {
      severity: 'info',
      title: 'New symbol traded',
      detail: 'You traded USDJPY for the first time',
      evidence: '1 trade on USDJPY',
    };
    render(<InsightCard insight={infoInsight} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('toggles expansion with Enter key', async () => {
    const user = userEvent.setup();
    render(<InsightCard insight={criticalInsight} />);

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.getByText('You took 3 trades within 10 minutes of a loss')
    ).toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(
      screen.queryByText('You took 3 trades within 10 minutes of a loss')
    ).not.toBeInTheDocument();
  });

  it('toggles expansion with Space key', async () => {
    const user = userEvent.setup();
    render(<InsightCard insight={criticalInsight} />);

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard(' ');

    expect(
      screen.getByText('You took 3 trades within 10 minutes of a loss')
    ).toBeInTheDocument();
  });

  it('has correct role="button" for accessibility', () => {
    render(<InsightCard insight={criticalInsight} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows singular "trade" when only one tradeId', async () => {
    const user = userEvent.setup();
    const singleTradeInsight: Insight = {
      ...criticalInsight,
      tradeIds: ['t1'],
    };
    render(<InsightCard insight={singleTradeInsight} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(screen.getByText('View 1 related trade')).toBeInTheDocument();
  });
});
