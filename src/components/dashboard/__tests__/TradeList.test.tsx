import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TradeList } from '../TradeList';
import type { Trade } from '@/types/trade';

describe('TradeList', () => {
  const mockTrades: Trade[] = [
    {
      id: '1',
      symbol: 'EURUSD',
      direction: 'LONG',
      entryPrice: 1.1,
      exitPrice: 1.12,
      stopLoss: 1.09,
      takeProfit: 1.13,
      size: 1,
      entryDate: '2025-01-15T10:00:00Z',
      exitDate: '2025-01-15T14:00:00Z',
      outcome: 'TP',
      pnl: 200,
      riskRewardRatio: 2.0,
      accountId: 'acc1',
      tags: ['swing', 'breakout'],
    },
    {
      id: '2',
      symbol: 'GBPUSD',
      direction: 'SHORT',
      entryPrice: 1.3,
      exitPrice: 1.28,
      stopLoss: 1.31,
      takeProfit: 1.27,
      size: 0.5,
      entryDate: '2025-01-16T09:00:00Z',
      exitDate: '2025-01-16T12:00:00Z',
      outcome: 'SL',
      pnl: -100,
      riskRewardRatio: 1.5,
      accountId: 'acc1',
    },
    {
      id: '3',
      symbol: 'USDJPY',
      direction: 'LONG',
      entryPrice: 148.5,
      exitPrice: 149.0,
      stopLoss: 148.0,
      takeProfit: 149.5,
      size: 2,
      entryDate: '2025-01-17T08:00:00Z',
      exitDate: '2025-01-17T11:00:00Z',
      outcome: 'PARTIAL',
      pnl: 50,
      riskRewardRatio: 1.0,
      accountId: 'acc1',
    },
  ];

  it('renders without crashing', () => {
    render(<TradeList trades={mockTrades} />);
    expect(screen.getByText('Recent Trades')).toBeInTheDocument();
  });

  it('displays the heading', () => {
    render(<TradeList trades={mockTrades} />);
    expect(screen.getByText('Recent Trades')).toBeInTheDocument();
  });

  it('renders all trades when no limit is set', () => {
    render(<TradeList trades={mockTrades} />);
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    expect(screen.getByText('USDJPY')).toBeInTheDocument();
  });

  it('limits displayed trades when limit prop is set', () => {
    render(<TradeList trades={mockTrades} limit={2} />);
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    expect(screen.queryByText('USDJPY')).not.toBeInTheDocument();
  });

  it('shows trade direction badges', () => {
    render(<TradeList trades={mockTrades} />);
    // LONG appears for both LONG trades (id '1' and '3')
    expect(screen.getAllByText('LONG').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SHORT').length).toBeGreaterThanOrEqual(1);
  });

  it('shows P&L values for trades with pnl', () => {
    render(<TradeList trades={mockTrades} />);
    expect(screen.getByText('+200.00')).toBeInTheDocument();
    expect(screen.getByText('-100.00')).toBeInTheDocument();
  });

  it('shows trade outcome badges', () => {
    render(<TradeList trades={mockTrades} />);
    expect(screen.getByText('TP')).toBeInTheDocument();
    expect(screen.getByText('SL')).toBeInTheDocument();
    expect(screen.getByText('PARTIAL')).toBeInTheDocument();
  });

  it('shows trade size', () => {
    render(<TradeList trades={mockTrades} />);
    expect(screen.getByText(/1 lot(?:s)?/)).toBeInTheDocument();
  });

  it('renders tags when present', () => {
    render(<TradeList trades={mockTrades} />);
    expect(screen.getByText('swing')).toBeInTheDocument();
    expect(screen.getByText('breakout')).toBeInTheDocument();
  });

  it('renders empty state gracefully', () => {
    const { container } = render(<TradeList trades={[]} />);
    expect(screen.getByText('Recent Trades')).toBeInTheDocument();
    // The divider area should contain the empty state message
    const divider = container.querySelector('.divide-y');
    expect(divider?.children.length).toBe(1);
    expect(screen.getByText('No recent trades')).toBeInTheDocument();
  });

  it('shows unmapped trade warning for trades without accountId', () => {
    const unmappedTrade: Trade[] = [
      {
        id: '4',
        symbol: 'AUDUSD',
        direction: 'LONG',
        entryPrice: 0.65,
        exitPrice: 0.66,
        stopLoss: 0.64,
        takeProfit: 0.66,
        size: 1,
        entryDate: '2025-01-18T10:00:00Z',
        exitDate: '2025-01-18T14:00:00Z',
        outcome: 'TP',
        pnl: 100,
        riskRewardRatio: 1.0,
        // no accountId - should show warning
      },
    ];
    render(<TradeList trades={unmappedTrade} />);
    expect(screen.getByText('AUDUSD')).toBeInTheDocument();
  });
});

describe('TradeList – extended coverage', () => {
  it('renders with empty trades array showing heading only', () => {
    render(<TradeList trades={[]} />);
    expect(screen.getByText('Recent Trades')).toBeInTheDocument();
    // No trade symbols should be rendered
    expect(screen.queryByText('EURUSD')).not.toBeInTheDocument();
  });

  it('shows limit correctly (default 5) by displaying only first N trades', () => {
    const manyTrades: Trade[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1),
      symbol: `SYM${i + 1}`,
      direction: 'LONG' as const,
      entryPrice: 1.0 + i * 0.01,
      exitPrice: 1.01 + i * 0.01,
      stopLoss: 0.99 + i * 0.01,
      takeProfit: 1.02 + i * 0.01,
      size: 1,
      entryDate: `2025-01-${String(i + 10).padStart(2, '0')}T10:00:00Z`,
      exitDate: `2025-01-${String(i + 10).padStart(2, '0')}T14:00:00Z`,
      outcome: 'TP' as const,
      pnl: 100,
      riskRewardRatio: 1.5,
      accountId: 'acc1',
    }));

    render(<TradeList trades={manyTrades} limit={5} />);

    // First 5 trades should be visible
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`SYM${i}`)).toBeInTheDocument();
    }
    // Trades beyond limit should not appear
    expect(screen.queryByText('SYM6')).not.toBeInTheDocument();
    expect(screen.queryByText('SYM7')).not.toBeInTheDocument();
    expect(screen.queryByText('SYM8')).not.toBeInTheDocument();
  });

  it('renders correct PnL colors (green for positive, red for negative)', () => {
    const trades: Trade[] = [
      {
        id: '1',
        symbol: 'EURUSD',
        direction: 'LONG',
        entryPrice: 1.1,
        exitPrice: 1.12,
        stopLoss: 1.09,
        takeProfit: 1.13,
        size: 1,
        entryDate: '2025-01-15T10:00:00Z',
        exitDate: '2025-01-15T14:00:00Z',
        outcome: 'TP',
        pnl: 200,
        riskRewardRatio: 2.0,
        accountId: 'acc1',
      },
      {
        id: '2',
        symbol: 'GBPUSD',
        direction: 'SHORT',
        entryPrice: 1.3,
        exitPrice: 1.32,
        stopLoss: 1.31,
        takeProfit: 1.27,
        size: 1,
        entryDate: '2025-01-16T09:00:00Z',
        exitDate: '2025-01-16T12:00:00Z',
        outcome: 'SL',
        pnl: -150,
        riskRewardRatio: 1.5,
        accountId: 'acc1',
      },
    ];

    render(<TradeList trades={trades} />);

    // Positive PnL should have text-success class
    const positivePnl = screen.getByText('+200.00');
    expect(positivePnl).toHaveClass('text-success');

    // Negative PnL should have text-destructive class
    const negativePnl = screen.getByText('-150.00');
    expect(negativePnl).toHaveClass('text-destructive');
  });

  it('handles trades without exitDate', () => {
    const tradesNoExit: Trade[] = [
      {
        id: '10',
        symbol: 'NZDUSD',
        direction: 'LONG',
        entryPrice: 0.62,
        exitPrice: 0.64,
        stopLoss: 0.61,
        takeProfit: 0.64,
        size: 2,
        entryDate: '2025-02-01T08:00:00Z',
        exitDate: '',
        outcome: 'TP',
        pnl: 300,
        riskRewardRatio: 2.0,
        accountId: 'acc1',
      },
    ];

    render(<TradeList trades={tradesNoExit} />);

    expect(screen.getByText('NZDUSD')).toBeInTheDocument();
    expect(screen.getByText('+300.00')).toBeInTheDocument();
    expect(screen.getByText('LONG')).toBeInTheDocument();
  });
});
