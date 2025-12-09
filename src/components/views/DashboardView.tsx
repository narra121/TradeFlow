import { useState, useMemo } from 'react';
import { PortfolioStats } from '@/types/trade';
import { StatCard } from '@/components/dashboard/StatCard';
import { TradeList } from '@/components/dashboard/TradeList';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { WinRateRing } from '@/components/dashboard/WinRateRing';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { AccountFilter } from '@/components/account/AccountFilter';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Plus, Upload, DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { 
  DashboardStatsSkeleton, 
  ChartSkeleton, 
  WinRateRingSkeleton, 
  RecentTradesListSkeleton, 
  QuickStatsSkeleton 
} from '@/components/ui/loading-skeleton';

interface DashboardViewProps {
  onAddTrade: () => void;
  onImportTrades: () => void;
}

export function DashboardView({ onAddTrade, onImportTrades }: DashboardViewProps) {
  const dispatch = useAppDispatch();
  const { trades = [], loading: tradesLoading, filters } = useAppSelector((state) => state.trades);
  
  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset);
    dispatch(setDateRangeFilter({
      startDate: range.from.toISOString(),
      endDate: range.to.toISOString(),
      datePreset: preset
    }));
  };

  const filteredTrades = trades; // No need to filter - backend already filtered

  const filteredStats = useMemo(() => {
    const closedTrades = filteredTrades; // All trades are closed now
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0;
    const grossProfit = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgRiskReward = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    // Calculate consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    closedTrades.forEach(trade => {
      if ((trade.pnl || 0) > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else if ((trade.pnl || 0) < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    });
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningPnl = 0;
    closedTrades.forEach(trade => {
      runningPnl += (trade.pnl || 0);
      if (runningPnl > peak) peak = runningPnl;
      const drawdown = peak > 0 ? ((peak - runningPnl) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    return {
      totalPnl,
      winRate,
      totalTrades: closedTrades.length,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0,
      worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0,
      maxDrawdown,
      avgRiskReward,
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
    };
  }, [filteredTrades]);

  // All trades are closed - no open trades section needed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your trading performance</p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-4">
          <DateRangeFilter
            selectedPreset={filters.datePreset}
            onPresetChange={handleDatePresetChange}
          />
          <AccountFilter />
        </div>
      </div>

      {/* Stats Grid */}
      {tradesLoading ? (
        <DashboardStatsSkeleton />
      ) : (
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
            title="Breakeven Trades"
            value={filteredTrades.filter(t => t.outcome === 'BREAKEVEN').length}
            icon={BarChart3}
            variant="accent"
            className="stagger-4"
          />
        </div>
      )}

      {/* Main Content Grid */}
      {tradesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton height="h-[280px]" />
          </div>
          <WinRateRingSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart - spans 2 columns */}
          <div className="lg:col-span-2">
            <PerformanceChart trades={filteredTrades} />
          </div>

          {/* Win Rate Ring */}
          <div>
            <WinRateRing 
              winRate={filteredStats.winRate}
              wins={filteredTrades.filter(t => (t.pnl || 0) > 0).length}
              losses={filteredTrades.filter(t => (t.pnl || 0) < 0).length}
            />
          </div>
        </div>
      )}

      {/* Bottom Grid */}
      {tradesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentTradesListSkeleton />
          </div>
          <QuickStatsSkeleton />
        </div>
      ) : (
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
      )}
    </div>
  );
}
