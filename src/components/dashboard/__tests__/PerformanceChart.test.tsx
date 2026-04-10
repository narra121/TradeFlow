import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceChart } from '../PerformanceChart';

// ---------------------------------------------------------------------------
// Mock recharts to avoid SVG rendering issues in jsdom
// ---------------------------------------------------------------------------
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

// ---------------------------------------------------------------------------
// Mock date-fns format to avoid locale issues in test environment
// ---------------------------------------------------------------------------
vi.mock('date-fns', () => ({
  format: (date: Date, _formatStr: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    return `${month} ${day}`;
  },
}));

describe('PerformanceChart', () => {
  it('shows empty state message when dailyPnl is an empty array', () => {
    render(<PerformanceChart dailyPnl={[]} />);
    expect(screen.getByText('No trades in selected period')).toBeInTheDocument();
  });

  it('shows empty state message when dailyPnl is undefined', () => {
    render(<PerformanceChart />);
    expect(screen.getByText('No trades in selected period')).toBeInTheDocument();
  });

  it('renders chart when dailyPnl has data', () => {
    const dailyPnl = [
      { date: '2025-01-06', pnl: 100, cumulativePnl: 100 },
      { date: '2025-01-07', pnl: 50, cumulativePnl: 150 },
      { date: '2025-01-08', pnl: -30, cumulativePnl: 120 },
    ];

    render(<PerformanceChart dailyPnl={dailyPnl} />);

    // Chart container should be rendered (not the empty state)
    expect(screen.queryByText('No trades in selected period')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
  });

  it('displays "Equity Curve" title', () => {
    render(<PerformanceChart dailyPnl={[]} />);
    expect(screen.getByText('Equity Curve')).toBeInTheDocument();
  });

  it('displays subtitle text', () => {
    render(<PerformanceChart dailyPnl={[]} />);
    expect(screen.getByText(/Cumulative P&L over time/)).toBeInTheDocument();
  });

  it('renders chart with single data point', () => {
    const dailyPnl = [{ date: '2025-01-06', pnl: 200, cumulativePnl: 200 }];

    render(<PerformanceChart dailyPnl={dailyPnl} />);

    expect(screen.queryByText('No trades in selected period')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });
});

describe('PerformanceChart – extended coverage', () => {
  it('handles negative-only data without errors', () => {
    const dailyPnl = [
      { date: '2025-02-01', pnl: -50, cumulativePnl: -50 },
      { date: '2025-02-02', pnl: -30, cumulativePnl: -80 },
      { date: '2025-02-03', pnl: -100, cumulativePnl: -180 },
    ];

    render(<PerformanceChart dailyPnl={dailyPnl} />);

    expect(screen.queryByText('No trades in selected period')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
  });

  it('handles large datasets (100+ points)', () => {
    const dailyPnl = Array.from({ length: 120 }, (_, i) => ({
      date: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
      pnl: (i % 3 === 0 ? -10 : 20),
      cumulativePnl: i * 10,
    }));

    render(<PerformanceChart dailyPnl={dailyPnl} />);

    expect(screen.queryByText('No trades in selected period')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('shows "No data" message when no trades (empty array passed explicitly)', () => {
    render(<PerformanceChart dailyPnl={[]} />);

    expect(screen.getByText('No trades in selected period')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
  });

  it('renders chart titles regardless of data', () => {
    const dailyPnl = [
      { date: '2025-03-01', pnl: 500, cumulativePnl: 500 },
    ];

    render(<PerformanceChart dailyPnl={dailyPnl} />);

    expect(screen.getByText('Equity Curve')).toBeInTheDocument();
    expect(screen.getByText(/Cumulative P&L over time/)).toBeInTheDocument();
  });

  it('renders with mixed positive and negative cumulative values', () => {
    const dailyPnl = [
      { date: '2025-04-01', pnl: 100, cumulativePnl: 100 },
      { date: '2025-04-02', pnl: -200, cumulativePnl: -100 },
      { date: '2025-04-03', pnl: 50, cumulativePnl: -50 },
      { date: '2025-04-04', pnl: 300, cumulativePnl: 250 },
    ];

    render(<PerformanceChart dailyPnl={dailyPnl} />);

    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
  });
});
