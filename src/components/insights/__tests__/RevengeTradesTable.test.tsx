import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { RevengeTradesTable } from '../RevengeTradesTable';
import type { RevengeTradeSignal } from '@/types/insights';

describe('RevengeTradesTable', () => {
  const mockTrades: RevengeTradeSignal[] = [
    {
      tradeId: 'abcdef12-3456-7890-abcd-ef1234567890',
      triggerTradeId: '12345678-abcd-ef12-3456-7890abcdef12',
      gapMinutes: 5,
      triggerPnl: -200,
      revengePnl: -150,
    },
    {
      tradeId: 'bbbbbbbb-1111-2222-3333-444444444444',
      triggerTradeId: 'cccccccc-1111-2222-3333-444444444444',
      gapMinutes: 12,
      triggerPnl: -500,
      revengePnl: 100,
    },
  ];

  it('renders "Revenge Trades Detected" heading', () => {
    render(<RevengeTradesTable revengeTrades={mockTrades} />);
    expect(screen.getByText('Revenge Trades Detected')).toBeInTheDocument();
  });

  it('renders count badge', () => {
    render(<RevengeTradesTable revengeTrades={mockTrades} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<RevengeTradesTable revengeTrades={mockTrades} />);
    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.getByText('After Loss')).toBeInTheDocument();
    expect(screen.getByText('Gap')).toBeInTheDocument();
    expect(screen.getByText('Trigger P&L')).toBeInTheDocument();
    expect(screen.getByText('Revenge P&L')).toBeInTheDocument();
  });

  it('renders truncated trade IDs (first 8 chars)', () => {
    render(<RevengeTradesTable revengeTrades={mockTrades} />);
    expect(screen.getByText('abcdef12')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
  });

  it('renders gap minutes', () => {
    render(<RevengeTradesTable revengeTrades={mockTrades} />);
    expect(screen.getByText('5m')).toBeInTheDocument();
    expect(screen.getByText('12m')).toBeInTheDocument();
  });

  it('renders total PnL', () => {
    render(<RevengeTradesTable revengeTrades={mockTrades} />);
    // total = -150 + 100 = -50
    expect(screen.getByText('-$50')).toBeInTheDocument();
  });

  it('renders nothing when trades array is empty', () => {
    const { container } = render(
      <RevengeTradesTable revengeTrades={[]} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('limits display to 10 trades', () => {
    const manyTrades: RevengeTradeSignal[] = Array.from({ length: 15 }, (_, i) => ({
      tradeId: `trade-id-${String(i).padStart(4, '0')}-xxxx-yyyy-zzzz`,
      triggerTradeId: `trigger-${String(i).padStart(4, '0')}-xxxx-yyyy-zzzz`,
      gapMinutes: 5,
      triggerPnl: -100,
      revengePnl: -50,
    }));
    render(<RevengeTradesTable revengeTrades={manyTrades} />);
    const rows = screen.getAllByRole('row');
    // 1 header row + 10 data rows
    expect(rows.length).toBe(11);
  });

  it('shows count as total including non-displayed trades', () => {
    const manyTrades: RevengeTradeSignal[] = Array.from({ length: 15 }, (_, i) => ({
      tradeId: `trade-id-${String(i).padStart(4, '0')}-xxxx-yyyy-zzzz`,
      triggerTradeId: `trigger-${String(i).padStart(4, '0')}-xxxx-yyyy-zzzz`,
      gapMinutes: 5,
      triggerPnl: -100,
      revengePnl: -50,
    }));
    render(<RevengeTradesTable revengeTrades={manyTrades} />);
    expect(screen.getByText('(15)')).toBeInTheDocument();
  });
});
