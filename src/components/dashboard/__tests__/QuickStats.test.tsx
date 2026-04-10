import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStats } from '../QuickStats';
import type { PortfolioStats } from '@/types/trade';

describe('QuickStats', () => {
  const baseStats: PortfolioStats = {
    totalTrades: 50,
    winRate: 62,
    totalPnl: 3500,
    avgWin: 150,
    avgLoss: -75,
    profitFactor: 2.1,
    maxDrawdown: 5.25,
    bestTrade: 800,
    worstTrade: -350,
    avgRiskReward: 1.85,
    consecutiveWins: 7,
    consecutiveLosses: 3,
  };

  it('renders without crashing', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
  });

  it('displays the heading', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
  });

  it('displays profit factor value', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('2.10')).toBeInTheDocument();
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
  });

  it('displays average risk/reward', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('1.85')).toBeInTheDocument();
    expect(screen.getByText('Avg R:R')).toBeInTheDocument();
  });

  it('displays best trade with positive sign', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('+$800')).toBeInTheDocument();
    expect(screen.getByText('Best Trade')).toBeInTheDocument();
  });

  it('displays worst trade with negative sign', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('-$350')).toBeInTheDocument();
    expect(screen.getByText('Worst Trade')).toBeInTheDocument();
  });

  it('displays win streak', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Win Streak')).toBeInTheDocument();
  });

  it('displays max drawdown with percentage', () => {
    render(<QuickStats stats={baseStats} />);
    expect(screen.getByText('5.25%')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
  });

  it('displays infinity symbol when profit factor is Infinity', () => {
    const infinityStats: PortfolioStats = {
      ...baseStats,
      profitFactor: Infinity,
    };
    render(<QuickStats stats={infinityStats} />);
    // The component renders the unicode infinity symbol
    expect(screen.getByText('\u221E')).toBeInTheDocument();
  });

  it('renders all six stat items', () => {
    render(<QuickStats stats={baseStats} />);
    const labels = [
      'Profit Factor',
      'Avg R:R',
      'Best Trade',
      'Worst Trade',
      'Win Streak',
      'Max Drawdown',
    ];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders SVG icons for each stat', () => {
    const { container } = render(<QuickStats stats={baseStats} />);
    const svgs = container.querySelectorAll('svg');
    // 6 stat items -> 6 icons
    expect(svgs.length).toBe(6);
  });

  it('handles zero values gracefully', () => {
    const zeroStats: PortfolioStats = {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgRiskReward: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };
    render(<QuickStats stats={zeroStats} />);
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    expect(screen.getByText('0.00%')).toBeInTheDocument(); // max drawdown
  });
});

describe('QuickStats – extended coverage', () => {
  const baseStats: PortfolioStats = {
    totalTrades: 50,
    winRate: 62,
    totalPnl: 3500,
    avgWin: 150,
    avgLoss: -75,
    profitFactor: 2.1,
    maxDrawdown: 5.25,
    bestTrade: 800,
    worstTrade: -350,
    avgRiskReward: 1.85,
    consecutiveWins: 7,
    consecutiveLosses: 3,
  };

  it('handles zero values for all stats and renders all six labels', () => {
    const zeroStats: PortfolioStats = {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgRiskReward: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };
    render(<QuickStats stats={zeroStats} />);

    // All six stat labels should still be rendered
    const labels = [
      'Profit Factor',
      'Avg R:R',
      'Best Trade',
      'Worst Trade',
      'Win Streak',
      'Max Drawdown',
    ];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    // profitFactor 0 => '0.00', avgRiskReward 0 => '0.00' — both render '0.00'
    expect(screen.getAllByText('0.00').length).toBeGreaterThanOrEqual(1);
    // bestTrade 0 => '+$0', worstTrade 0 => '+$0' (both >= 0)
    expect(screen.getAllByText('+$0').length).toBeGreaterThanOrEqual(1);
  });

  it('handles negative avgWin by rendering stats without crashing', () => {
    const negativeAvgWinStats: PortfolioStats = {
      ...baseStats,
      avgWin: -25,
    };
    render(<QuickStats stats={negativeAvgWinStats} />);
    // avgWin is not directly displayed in QuickStats, but the component should still render
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    // Other stats should still be rendered correctly
    expect(screen.getByText('2.10')).toBeInTheDocument(); // profitFactor
    expect(screen.getByText('+$800')).toBeInTheDocument(); // bestTrade
  });

  it('handles Infinity profitFactor by displaying infinity symbol', () => {
    const infinityStats: PortfolioStats = {
      ...baseStats,
      profitFactor: Infinity,
    };
    render(<QuickStats stats={infinityStats} />);
    expect(screen.getByText('\u221E')).toBeInTheDocument();
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
  });

  it('handles NaN values gracefully without crashing', () => {
    const nanStats: PortfolioStats = {
      ...baseStats,
      profitFactor: NaN,
      avgRiskReward: NaN,
      maxDrawdown: NaN,
    };
    // The component calls .toFixed(2) on NaN which returns 'NaN' string
    render(<QuickStats stats={nanStats} />);
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    // All labels should still be present
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
    expect(screen.getByText('Avg R:R')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
  });
});
