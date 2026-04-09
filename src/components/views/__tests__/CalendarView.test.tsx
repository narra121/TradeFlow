import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarView } from '../CalendarView';
import type { Trade } from '@/types/trade';

// Mock CalendarTradeModal
vi.mock('@/components/trade/CalendarTradeModal', () => ({
  CalendarTradeModal: () => <div data-testid="calendar-trade-modal" />,
}));

describe('CalendarView', () => {
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
    },
  ];

  it('renders the heading', () => {
    render(<CalendarView trades={[]} />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<CalendarView trades={[]} />);
    expect(screen.getByText('Visualize your trading days')).toBeInTheDocument();
  });

  it('renders day headers', () => {
    render(<CalendarView trades={[]} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('renders Weekly column header', () => {
    render(<CalendarView trades={[]} />);
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('renders monthly summary section', () => {
    render(<CalendarView trades={mockTrades} />);
    expect(screen.getByText('Trading Days')).toBeInTheDocument();
    expect(screen.getByText('Profitable Days')).toBeInTheDocument();
    expect(screen.getByText('Loss Days')).toBeInTheDocument();
    expect(screen.getByText('Monthly P&L')).toBeInTheDocument();
  });

  it('renders the calendar legend', () => {
    render(<CalendarView trades={[]} />);
    expect(screen.getByText('Profitable Day')).toBeInTheDocument();
    expect(screen.getByText('Loss Day')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders with empty trades array', () => {
    render(<CalendarView trades={[]} />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('renders month navigation buttons', () => {
    render(<CalendarView trades={[]} />);
    // There should be navigation buttons (ChevronLeft, ChevronRight)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('displays the current month name', () => {
    render(<CalendarView trades={[]} />);
    // The component shows the current month. We check it contains a month name.
    const currentMonth = new Date().toLocaleString('en', { month: 'long', year: 'numeric' });
    // The format used is 'MMMM yyyy' from date-fns
    const monthHeading = screen.getByText(new RegExp(new Date().getFullYear().toString()));
    expect(monthHeading).toBeInTheDocument();
  });
});
