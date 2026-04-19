import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { TimeEdgeHeatmap } from '../TimeEdgeHeatmap';
import type { HourlyEdge, DayOfWeekEdge } from '@/types/insights';

describe('TimeEdgeHeatmap', () => {
  const mockHourlyEdges: HourlyEdge[] = [
    { hour: 9, tradeCount: 15, winRate: 73, avgPnl: 120, totalPnl: 1800, label: 'green_zone' },
    { hour: 10, tradeCount: 8, winRate: 35, avgPnl: -50, totalPnl: -400, label: 'red_zone' },
    { hour: 14, tradeCount: 5, winRate: 50, avgPnl: 10, totalPnl: 50, label: 'neutral' },
    { hour: 22, tradeCount: 0, winRate: 0, avgPnl: 0, totalPnl: 0, label: 'neutral' },
  ];

  const mockDayOfWeekEdges: DayOfWeekEdge[] = [
    { day: 0, dayName: 'Sun', tradeCount: 0, winRate: 0, avgPnl: 0, totalPnl: 0, label: 'neutral' },
    { day: 1, dayName: 'Mon', tradeCount: 12, winRate: 65, avgPnl: 80, totalPnl: 960, label: 'green_zone' },
    { day: 2, dayName: 'Tue', tradeCount: 10, winRate: 30, avgPnl: -40, totalPnl: -400, label: 'red_zone' },
    { day: 3, dayName: 'Wed', tradeCount: 8, winRate: 50, avgPnl: 5, totalPnl: 40, label: 'neutral' },
    { day: 4, dayName: 'Thu', tradeCount: 6, winRate: 55, avgPnl: 20, totalPnl: 120, label: 'neutral' },
    { day: 5, dayName: 'Fri', tradeCount: 4, winRate: 75, avgPnl: 100, totalPnl: 400, label: 'green_zone' },
    { day: 6, dayName: 'Sat', tradeCount: 0, winRate: 0, avgPnl: 0, totalPnl: 0, label: 'neutral' },
  ];

  it('renders "Trading Time Edges" heading', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText('Trading Time Edges')).toBeInTheDocument();
  });

  it('renders "By Hour (UTC)" section label', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText('By Hour (UTC)')).toBeInTheDocument();
  });

  it('renders "By Day of Week" section label', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText('By Day of Week')).toBeInTheDocument();
  });

  it('filters out hours with zero trade count', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.queryByText('22:00')).not.toBeInTheDocument();
  });

  it('displays trade count for active hours', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText('15 trades')).toBeInTheDocument();
    // "8 trades" appears in both hourly (10:00) and daily (Wed) sections
    const eightTrades = screen.getAllByText('8 trades');
    expect(eightTrades.length).toBeGreaterThanOrEqual(1);
  });

  it('displays win rate for active hours', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText('73% WR')).toBeInTheDocument();
    expect(screen.getByText('35% WR')).toBeInTheDocument();
  });

  it('renders all day names', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('does not show win rate for days with zero trades', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    // Sun has 0 trades - should show "0 trades" but no WR
    const sunCell = screen.getByText('Sun').closest('div');
    expect(sunCell?.textContent).not.toContain('% WR');
  });

  it('renders description text about green/red zones', () => {
    render(
      <TimeEdgeHeatmap hourlyEdges={mockHourlyEdges} dayOfWeekEdges={mockDayOfWeekEdges} />
    );
    expect(screen.getByText(/Green = profitable zone/)).toBeInTheDocument();
    expect(screen.getByText(/Red = danger zone/)).toBeInTheDocument();
  });
});
