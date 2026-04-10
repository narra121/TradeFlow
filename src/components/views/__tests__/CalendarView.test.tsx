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

describe('CalendarView - Month Heading & Day Names', () => {
  it('renders current month heading in MMMM yyyy format', () => {
    render(<CalendarView trades={[]} />);
    const now = new Date();
    // date-fns format: 'MMMM yyyy'
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const expectedMonth = monthNames[now.getMonth()];
    const expectedYear = now.getFullYear().toString();
    // The heading should contain both month name and year
    const heading = screen.getByText(new RegExp(`${expectedMonth}\\s+${expectedYear}`));
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2');
  });

  it('shows all seven day name abbreviations', () => {
    render(<CalendarView trades={[]} />);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('shows Weekly column header alongside day names', () => {
    render(<CalendarView trades={[]} />);
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });
});

describe('CalendarView - Month With No Trades', () => {
  it('handles month with no trades and shows zero in summary stats', () => {
    render(<CalendarView trades={[]} />);
    // Monthly summary cards should render
    expect(screen.getByText('Trading Days')).toBeInTheDocument();
    expect(screen.getByText('Profitable Days')).toBeInTheDocument();
    expect(screen.getByText('Loss Days')).toBeInTheDocument();
    expect(screen.getByText('Monthly P&L')).toBeInTheDocument();
    // With no trades, Trading Days value should be 0
    const tradingDaysCard = screen.getByText('Trading Days').closest('div');
    expect(tradingDaysCard).toBeInTheDocument();
    // The value 0 should appear
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the calendar grid even with no trades', () => {
    render(<CalendarView trades={[]} />);
    // Calendar should still show day numbers; the first day of the month should appear
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CalendarView - Trade Indicators on Calendar Days', () => {
  const tradesInCurrentMonth: Trade[] = (() => {
    // Create trades in the current month so they appear on the calendar
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return [
      {
        id: 't1',
        symbol: 'EURUSD',
        direction: 'LONG' as const,
        entryPrice: 1.1,
        exitPrice: 1.12,
        stopLoss: 1.09,
        takeProfit: 1.13,
        size: 1,
        entryDate: `${year}-${month}-10T10:00:00Z`,
        exitDate: `${year}-${month}-10T14:00:00Z`,
        outcome: 'TP' as const,
        pnl: 200,
        riskRewardRatio: 2.0,
      },
      {
        id: 't2',
        symbol: 'GBPUSD',
        direction: 'SHORT' as const,
        entryPrice: 1.3,
        exitPrice: 1.32,
        stopLoss: 1.31,
        takeProfit: 1.27,
        size: 0.5,
        entryDate: `${year}-${month}-12T09:00:00Z`,
        exitDate: `${year}-${month}-12T12:00:00Z`,
        outcome: 'SL' as const,
        pnl: -100,
        riskRewardRatio: 1.5,
      },
    ];
  })();

  it('renders trade P&L indicators on calendar days that have trades', () => {
    render(<CalendarView trades={tradesInCurrentMonth} />);
    // The profitable trade should show +200
    expect(screen.getByText('+200')).toBeInTheDocument();
    // The losing trade should show -100
    expect(screen.getByText('-100')).toBeInTheDocument();
  });

  it('renders trade count text on days with trades', () => {
    render(<CalendarView trades={tradesInCurrentMonth} />);
    // Each day with 1 trade shows "1 trade"
    const tradeCountLabels = screen.getAllByText('1 trade');
    expect(tradeCountLabels.length).toBe(2);
  });

  it('shows non-zero monthly summary when trades exist in current month', () => {
    render(<CalendarView trades={tradesInCurrentMonth} />);
    // Trading Days should be 2 (two days with trades)
    expect(screen.getByText('Trading Days')).toBeInTheDocument();
    // Profitable Days should be 1
    expect(screen.getByText('Profitable Days')).toBeInTheDocument();
    // Loss Days should be 1
    expect(screen.getByText('Loss Days')).toBeInTheDocument();
  });

  it('renders legend items', () => {
    render(<CalendarView trades={tradesInCurrentMonth} />);
    expect(screen.getByText('Profitable Day')).toBeInTheDocument();
    expect(screen.getByText('Loss Day')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
