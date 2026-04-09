import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceChart } from '../PerformanceChart';
import type { Trade } from '@/types/trade';

// Mock recharts - it doesn't render in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

describe('PerformanceChart', () => {
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

  it('renders without crashing', () => {
    render(<PerformanceChart trades={mockTrades} />);
    expect(screen.getByText('Equity Curve')).toBeInTheDocument();
  });

  it('displays the heading', () => {
    render(<PerformanceChart trades={mockTrades} />);
    expect(screen.getByText('Equity Curve')).toBeInTheDocument();
  });

  it('displays the subtitle', () => {
    render(<PerformanceChart trades={mockTrades} />);
    expect(screen.getByText('Cumulative P&L over time')).toBeInTheDocument();
  });

  it('renders the chart container when trades are provided', () => {
    render(<PerformanceChart trades={mockTrades} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('shows empty state when no trades are provided', () => {
    render(<PerformanceChart trades={[]} />);
    expect(screen.getByText('No trades in selected period')).toBeInTheDocument();
  });

  it('shows empty state when trades prop is undefined', () => {
    render(<PerformanceChart />);
    expect(screen.getByText('No trades in selected period')).toBeInTheDocument();
  });

  it('does not show empty state when trades are present', () => {
    render(<PerformanceChart trades={mockTrades} />);
    expect(screen.queryByText('No trades in selected period')).not.toBeInTheDocument();
  });
});
