import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { TradeSpotlight } from '../TradeSpotlight';
import type { TradeSpotlight as TradeSpotlightType } from '@/types/insights';

describe('TradeSpotlight', () => {
  const lossTrade: TradeSpotlightType = {
    tradeId: 't1',
    symbol: 'EURUSD',
    date: '2026-04-10',
    pnl: -420,
    reason: 'Oversized position after consecutive losses',
  };

  const winTrade: TradeSpotlightType = {
    tradeId: 't2',
    symbol: 'GBPJPY',
    date: '2026-04-08',
    pnl: 890,
    reason: 'Perfect execution with 3.2:1 RR',
  };

  it('renders symbol', () => {
    render(<TradeSpotlight spotlight={lossTrade} />);
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
  });

  it('renders P&L value for a loss', () => {
    render(<TradeSpotlight spotlight={lossTrade} />);
    // pnl is -420, so rendered as $420.00 (without +)
    expect(screen.getByText('$420.00')).toBeInTheDocument();
  });

  it('renders P&L value for a win with plus sign', () => {
    render(<TradeSpotlight spotlight={winTrade} />);
    expect(screen.getByText('+$890.00')).toBeInTheDocument();
  });

  it('renders reason text', () => {
    render(<TradeSpotlight spotlight={lossTrade} />);
    expect(
      screen.getByText('Oversized position after consecutive losses')
    ).toBeInTheDocument();
  });

  it('renders date', () => {
    render(<TradeSpotlight spotlight={lossTrade} />);
    expect(screen.getByText('2026-04-10')).toBeInTheDocument();
  });

  it('applies destructive styling for loss trade', () => {
    render(<TradeSpotlight spotlight={lossTrade} />);
    const pnlBadge = screen.getByText('$420.00');
    expect(pnlBadge).toHaveClass('text-destructive');
  });

  it('applies success styling for win trade', () => {
    render(<TradeSpotlight spotlight={winTrade} />);
    const pnlBadge = screen.getByText('+$890.00');
    expect(pnlBadge).toHaveClass('text-success');
  });

  it('has role="button" for click navigation', () => {
    render(<TradeSpotlight spotlight={lossTrade} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders win trade symbol', () => {
    render(<TradeSpotlight spotlight={winTrade} />);
    expect(screen.getByText('GBPJPY')).toBeInTheDocument();
  });

  it('renders win trade date', () => {
    render(<TradeSpotlight spotlight={winTrade} />);
    expect(screen.getByText('2026-04-08')).toBeInTheDocument();
  });

  it('renders win trade reason', () => {
    render(<TradeSpotlight spotlight={winTrade} />);
    expect(
      screen.getByText('Perfect execution with 3.2:1 RR')
    ).toBeInTheDocument();
  });
});
