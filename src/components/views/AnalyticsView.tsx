import { useState, useMemo, useEffect } from 'react';
import { Trade, PortfolioStats } from '@/types/trade';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { Clock, Timer } from 'lucide-react';
import { MetricsGridSkeleton, ChartSkeleton } from '@/components/ui/loading-skeleton';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { AccountFilter } from '@/components/account/AccountFilter';
import { subDays, isWithinInterval, startOfWeek, endOfWeek, format, addDays, isSameDay } from 'date-fns';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { useGetTradesQuery } from '@/store/api';
import {
  calculateTradeStats,
  calculateSymbolDistribution,
  calculateStrategyDistribution,
  calculateHourlyStats,
  calculateDailyWinRate,
  calculateTradeDurations,
  groupDurationsByRange,
  formatDuration,
  getEligibleTrades,
} from '@/lib/tradeCalculations';

export function AnalyticsView() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.trades.filters);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>(
    { from: startOfWeek(new Date()), to: endOfWeek(new Date()) }
  );
  
  // Prepare query params
  const queryParams = useMemo(() => ({
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }), [filters.accountId, filters.startDate, filters.endDate]);
  
  const { data: trades = [], isLoading: tradesLoading } = useGetTradesQuery(queryParams);
  
  const [datePreset, setDatePreset] = useState<DatePreset>(filters.datePreset || 'thisWeek');
  
  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset, customRange);
    dispatch(setDateRangeFilter({
      startDate: range.from.toISOString().split('T')[0],
      endDate: range.to.toISOString().split('T')[0],
      datePreset: preset
    }));
    if (preset === 'custom') {
      setCustomRange(range);
    }
    setDatePreset(preset);
  };

  const eligibleTrades = useMemo(() => getEligibleTrades(trades), [trades]);
  
  // Calculate all analytics using centralized functions
  const stats = useMemo(() => calculateTradeStats(eligibleTrades), [eligibleTrades]);
  
  // Symbol distribution (computed locally from filtered trades)
  const localSymbolDistribution = useMemo(() => 
    calculateSymbolDistribution(eligibleTrades), [eligibleTrades]
  );

  const pieData = Object.entries(localSymbolDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // Strategy distribution (computed locally from filtered trades)
  const localStrategyDistribution = useMemo(() => 
    calculateStrategyDistribution(eligibleTrades), [eligibleTrades]
  );

  const strategyPieData = Object.entries(localStrategyDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['hsl(160, 84%, 39%)', 'hsl(265, 89%, 62%)', 'hsl(45, 93%, 47%)', 'hsl(200, 95%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(320, 70%, 50%)'];

  // Hourly win rate calculation (all 24 hours) - computed locally from filtered trades
  const localHourlyStats = useMemo(() => 
    calculateHourlyStats(eligibleTrades), [eligibleTrades]
  );

  // Daily win rate calculation (by day of week) - computed locally from filtered trades
  const localDailyWinRate = useMemo(() => 
    calculateDailyWinRate(eligibleTrades), [eligibleTrades]
  );

  // Trade duration calculation using centralized functions
  const durationStats = useMemo(() => 
    calculateTradeDurations(eligibleTrades), [eligibleTrades]
  );
  
  const tradeDurations = durationStats.durations;

  // Group durations for bar chart
  const durationData = useMemo(() => 
    groupDurationsByRange(eligibleTrades), [eligibleTrades]
  );

  // Max/Min/Avg duration stats
  const { maxDuration, minDuration, avgDuration } = durationStats;

  // Daily P&L for current week (Sunday to Saturday)
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
  const dailyPnL = Array.from({ length: 7 }, (_, i) => {
    const dayDate = addDays(currentWeekStart, i);
    const dayTrades = eligibleTrades.filter(trade => {
      const tradeDate = new Date(trade.exitDate || trade.entryDate);
      return isSameDay(tradeDate, dayDate);
    });
    const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    return {
      day: format(dayDate, 'EEE'),
      date: format(dayDate, 'MMM d'),
      pnl,
    };
  });

  // Performance metrics using calculated stats
  const metrics = [
    { label: 'Total P&L', value: `$${stats.totalPnl.toFixed(2)}`, isPositive: stats.totalPnl >= 0 },
    { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, isPositive: stats.winRate >= 50 },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), isPositive: stats.profitFactor >= 1 },
    { label: 'Average Win', value: `$${stats.avgWin.toFixed(2)}`, isPositive: true },
    { label: 'Average Loss', value: `$${stats.avgLoss.toFixed(2)}`, isPositive: false },
    { label: 'Max Drawdown', value: `${stats.maxDrawdown.toFixed(1)}%`, isPositive: false },
    { label: 'Best Trade', value: `$${stats.bestTrade.toFixed(2)}`, isPositive: true },
    { label: 'Worst Trade', value: `$${stats.worstTrade.toFixed(2)}`, isPositive: false },
    { label: 'Avg R:R', value: stats.avgRiskReward.toFixed(2), isPositive: stats.avgRiskReward >= 1.5 },
    { label: 'Total Trades', value: stats.totalTrades.toString(), isPositive: true },
    { label: 'Win Streak', value: stats.consecutiveWins.toString(), isPositive: true },
    { label: 'Loss Streak', value: stats.consecutiveLosses.toString(), isPositive: false },
  ];

  if (tradesLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Deep dive into your trading performance</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <AccountFilter />
            <DateRangeFilter
              selectedPreset={datePreset}
              onPresetChange={handleDatePresetChange}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              showCustomPicker
            />
          </div>
        </div>
        <MetricsGridSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height="h-[280px]" />
          <ChartSkeleton height="h-[280px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height="h-[280px]" />
          <ChartSkeleton height="h-[280px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your trading performance</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <AccountFilter />
          <DateRangeFilter
            selectedPreset={datePreset}
            onPresetChange={handleDatePresetChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            showCustomPicker
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <div 
            key={metric.label}
            className="glass-card p-4 animate-fade-in"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className={cn(
              "text-xl font-semibold font-mono mt-1",
              metric.isPositive ? "text-success" : "text-destructive"
            )}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <PerformanceChart trades={eligibleTrades} />

        {/* Daily P&L Bar Chart - Current Week */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Daily P&L</h3>
            <span className="text-xs text-muted-foreground">This Week (Sun - Sat)</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnL} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                />
                <Bar 
                  dataKey="pnl" 
                  radius={[4, 4, 0, 0]}
                >
                  {dailyPnL.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.pnl >= 0 ? 'hsl(160, 84%, 39%)' : 'hsl(0, 72%, 51%)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Win Rate & Trade Duration Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Win Rate */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Hourly Win Rate</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localHourlyStats} margin={{ top: 10, right: 5, left: 0, bottom: 0 }} barCategoryGap="8%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 9 }}
                  interval={0}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'winRate') return [`${value.toFixed(1)}%`, 'Win Rate'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `${label}:00`}
                />
                <Bar 
                  dataKey="winRate" 
                  radius={[2, 2, 0, 0]}
                  fill="hsl(var(--primary))"
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Win Rate - Horizontal Bar */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Daily Win Rate</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localDailyWinRate} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" horizontal={false} />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <YAxis 
                  type="category"
                  dataKey="day"
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar 
                  dataKey="winRate" 
                  radius={[0, 4, 4, 0]}
                  fill="hsl(var(--accent))"
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trade Duration Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-6">
            <Timer className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Trade Duration (Time to TP/SL)</h3>
          </div>
          
          {/* Duration Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Fastest</p>
              <p className="font-mono font-semibold text-success">{formatDuration(minDuration)}</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-mono font-semibold text-foreground">{formatDuration(avgDuration)}</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Longest</p>
              <p className="font-mono font-semibold text-warning">{formatDuration(maxDuration)}</p>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" vertical={false} />
                <XAxis 
                  dataKey="range" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="wins" stackId="a" fill="hsl(160, 84%, 39%)" radius={[0, 0, 0, 0]} name="Wins" />
                <Bar dataKey="losses" stackId="a" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Wins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Losses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Symbol Distribution */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-6">Symbol Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Distribution */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-6">Strategy Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={strategyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {strategyPieData.map((_, index) => (
                    <Cell key={`cell-strat-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {strategyPieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Distribution by Time */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-6">Performance by Session</h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              { name: 'Asian', trades: 8, winRate: 62.5, pnl: 420 },
              { name: 'London', trades: 15, winRate: 73.3, pnl: 1250 },
              { name: 'New York', trades: 12, winRate: 58.3, pnl: 780 },
            ].map((session, index) => (
              <div 
                key={session.name}
                className="p-4 bg-secondary/30 rounded-xl animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h4 className="font-medium text-foreground mb-3">{session.name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trades</span>
                    <span className="font-mono text-foreground">{session.trades}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-mono text-success">{session.winRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">P&L</span>
                    <span className="font-mono text-success">+${session.pnl}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}