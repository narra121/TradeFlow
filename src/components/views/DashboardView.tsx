import { useState, useMemo } from 'react';
import { Trade, PortfolioStats } from '@/types/trade';
import { StatCard } from '@/components/dashboard/StatCard';
import { TradeList } from '@/components/dashboard/TradeList';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { WinRateRing } from '@/components/dashboard/WinRateRing';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { AccountFilter } from '@/components/account/AccountFilter';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Plus, Upload, DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { isWithinInterval } from 'date-fns';

interface DashboardViewProps {
  trades: Trade[];
  stats: PortfolioStats;
  onAddTrade: () => void;
  onImportTrades: () => void;
}

export function DashboardView({ trades, stats, onAddTrade, onImportTrades }: DashboardViewProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>(30);

  const filteredTrades = useMemo(() => {
    const range = getDateRangeFromPreset(datePreset);
    return trades.filter(trade => {
      const tradeDate = trade.exitDate || trade.entryDate;
      return isWithinInterval(tradeDate, { start: range.from, end: range.to });
    });
  }, [trades, datePreset]);

  const filteredStats = useMemo(() => {
    const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0;
    const grossProfit = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    return {
      ...stats,
      totalPnl,
      winRate,
      totalTrades: closedTrades.length,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0,
      worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0,
    };
  }, [filteredTrades, stats]);

  const openTrades = filteredTrades.filter(t => t.status === 'OPEN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your trading performance</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter
            selectedPreset={datePreset}
            onPresetChange={setDatePreset}
          />
          <AccountFilter />
          <Button onClick={onImportTrades} variant="outline" size="lg" className="gap-2">
            <Upload className="w-5 h-5" />
            Import
          </Button>
          <Button onClick={onAddTrade} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            New Trade
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total P&L"
          value={filteredStats.totalPnl.toFixed(2)}
          prefix="$"
          icon={DollarSign}
          variant={filteredStats.totalPnl >= 0 ? 'success' : 'danger'}
          trend={{ value: 12.5, isPositive: filteredStats.totalPnl >= 0 }}
          className="stagger-1"
        />
        <StatCard
          title="Win Rate"
          value={filteredStats.winRate.toFixed(1)}
          suffix="%"
          icon={TrendingUp}
          variant="success"
          className="stagger-2"
        />
        <StatCard
          title="Total Trades"
          value={filteredStats.totalTrades}
          icon={Activity}
          variant="default"
          className="stagger-3"
        />
        <StatCard
          title="Open Positions"
          value={openTrades.length}
          icon={BarChart3}
          variant="accent"
          className="stagger-4"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - spans 2 columns */}
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>

        {/* Win Rate Ring */}
        <div>
          <WinRateRing 
            winRate={filteredStats.winRate}
            wins={filteredTrades.filter(t => t.status === 'CLOSED' && (t.pnl || 0) > 0).length}
            losses={filteredTrades.filter(t => t.status === 'CLOSED' && (t.pnl || 0) < 0).length}
          />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades - spans 2 columns */}
        <div className="lg:col-span-2">
          <TradeList trades={filteredTrades} limit={5} />
        </div>

        {/* Quick Stats */}
        <div>
          <QuickStats stats={filteredStats} />
        </div>
      </div>
    </div>
  );
}
