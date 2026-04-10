import { useState, useMemo } from 'react';
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
} from 'recharts';
import { Clock, Timer, PieChart as PieChartIcon } from 'lucide-react';
import { RefreshButton } from '@/components/ui/refresh-button';
import { Button } from '@/components/ui/button';
import { MetricsGridSkeleton, ChartSkeleton } from '@/components/ui/loading-skeleton';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { AccountFilter } from '@/components/account/AccountFilter';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { format } from 'date-fns/format';
import { addDays } from 'date-fns/addDays';
import { isSameDay } from 'date-fns/isSameDay';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { useGetStatsQuery } from '@/store/api';
import { useSavedOptions } from '@/hooks/useSavedOptions';
import { useAccounts } from '@/hooks/useAccounts';
import { formatDuration } from '@/lib/tradeCalculations';

export function AnalyticsView() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.trades.filters);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>(
    { from: startOfWeek(new Date()), to: endOfWeek(new Date()) }
  );

  // Get saved options for sessions
  const { options } = useSavedOptions();

  // Get accounts for balance calculations
  const { selectedAccountId, accounts } = useAccounts();

  // Calculate total capital based on selected accounts
  const totalCapital = useMemo(() => {
    const accountId = selectedAccountId || 'ALL';
    if (accountId === 'ALL') {
      return accounts
        .filter(acc => acc.id && acc.id !== '-1')
        .reduce((sum, acc) => sum + (acc.initialBalance || 0), 0);
    } else {
      const account = accounts.find(acc => acc.id === accountId);
      return account?.initialBalance || 0;
    }
  }, [selectedAccountId, accounts]);

  // Fetch aggregated stats from backend
  const statsQueryParams = useMemo(() => ({
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    totalCapital,
  }), [filters.accountId, filters.startDate, filters.endDate, totalCapital]);

  const { data: statsData, isLoading: statsLoading, isFetching: statsFetching, refetch } = useGetStatsQuery(statsQueryParams);
  const showShimmer = statsLoading || statsFetching;

  const stats = statsData || {
    totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
    avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
    maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
    grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
    totalVolume: 0, minDuration: 0, maxDuration: 0,
    durationBuckets: [], symbolDistribution: {}, strategyDistribution: {},
    sessionDistribution: {}, outcomeDistribution: {}, hourlyStats: [],
    dailyWinRate: [], dailyPnl: [],
  };

  const [datePreset, setDatePreset] = useState<DatePreset>(filters.datePreset || 'thisWeek');

  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset, customRange);
    dispatch(setDateRangeFilter({
      startDate: formatLocalDateOnly(range.from),
      endDate: formatLocalDateOnly(range.to),
      datePreset: preset
    }));
    if (preset === 'custom') {
      setCustomRange(range);
    }
    setDatePreset(preset);
  };

  // Transform symbolDistribution Record into [{name, value}] for pie charts
  const pieData = useMemo(() =>
    Object.entries(stats.symbolDistribution || {}).map(([name, data]) => ({
      name,
      value: data.count,
    })),
    [stats.symbolDistribution]
  );

  // Transform strategyDistribution Record into [{name, value}] for pie charts
  const strategyPieData = useMemo(() =>
    Object.entries(stats.strategyDistribution || {}).map(([name, data]) => ({
      name,
      value: data.count,
    })),
    [stats.strategyDistribution]
  );

  const COLORS = ['hsl(160, 84%, 39%)', 'hsl(265, 89%, 62%)', 'hsl(45, 93%, 47%)', 'hsl(200, 95%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(320, 70%, 50%)'];

  // Use stats.hourlyStats directly
  const localHourlyStats = stats.hourlyStats || [];

  // Use stats.dailyWinRate directly
  const localDailyWinRate = stats.dailyWinRate || [];

  // Duration data from backend
  const durationData = stats.durationBuckets || [];
  const minDuration = stats.minDuration || 0;
  const maxDuration = stats.maxDuration || 0;
  const avgDuration = stats.avgHoldingTime || 0;

  // Transform sessionDistribution using options.sessions for session performance cards
  const sessionPerformance = useMemo(() => {
    const sessionDist = stats.sessionDistribution || {};
    return (options?.sessions || []).map(sessionName => {
      const data = sessionDist[sessionName];
      const trades = data?.count || 0;
      const wins = data?.wins || 0;
      const pnl = data?.pnl || 0;
      const winRate = trades > 0 ? (wins / trades) * 100 : 0;

      return {
        name: sessionName,
        trades,
        winRate,
        pnl,
      };
    });
  }, [options.sessions, stats.sessionDistribution]);

  // Daily P&L for current week - filter stats.dailyPnl to current week
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const dailyPnL = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = addDays(currentWeekStart, i);
      // Find matching entry in stats.dailyPnl
      const match = (stats.dailyPnl || []).find(entry => {
        return isSameDay(new Date(entry.date), dayDate);
      });
      return {
        day: format(dayDate, 'EEE'),
        date: format(dayDate, 'MMM d'),
        pnl: match?.pnl || 0,
      };
    });
  }, [stats.dailyPnl, currentWeekStart]);

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

  if (showShimmer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Identify patterns and optimize your strategy</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Identify patterns and optimize your strategy</p>
          </div>
          <RefreshButton onRefresh={refetch} isFetching={statsFetching} />
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
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

      {/* Empty State - shown when no trade data */}
      {stats.totalTrades === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <PieChartIcon className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No analytics data yet</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Analytics will populate once you have logged trades. Head to the Dashboard to add your first trade.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/app/dashboard')} size="default" className="gap-2">
              Go to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <>
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className="glass-card p-3 sm:p-4 animate-fade-in"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{metric.label}</p>
            <p className={cn(
              "text-base sm:text-xl font-semibold font-mono mt-1 truncate",
              metric.isPositive ? "text-success" : "text-destructive"
            )}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Equity Curve */}
        <PerformanceChart dailyPnl={stats?.dailyPnl} />

        {/* Daily P&L Bar Chart - Current Week */}
        <div className="glass-card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Daily P&L</h3>
            <span className="text-xs text-muted-foreground hidden sm:inline">This Week (Sun - Sat)</span>
          </div>
          <div className="h-[240px] sm:h-[280px]">
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
                  labelStyle={{ background: 'hsla(160, 84%, 39%, 0.1)' }}
                  cursor={{ fill: 'hsla(160, 84%, 39%, 0.05)' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                />
                <Bar 
                  dataKey="pnl" 
                  radius={[4, 4, 0, 0]}
                >
                  {dailyPnL.map((entry, index) => (
                    <Cell 
                      key={`cell-${entry.day}`}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Hourly Win Rate */}
        <div className="glass-card p-3 sm:p-5">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Hourly Win Rate</h3>
          </div>
          <div className="h-[240px] sm:h-[280px]">
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
                  labelStyle={{ background: 'hsla(160, 84%, 39%, 0.1)' }}
                  cursor={{ fill: 'hsla(160, 84%, 39%, 0.05)' }}
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
        <div className="glass-card p-3 sm:p-5">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Daily Win Rate</h3>
          </div>
          <div className="h-[240px] sm:h-[280px]">
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
                  labelStyle={{ background: 'hsla(160, 84%, 39%, 0.1)' }}
                  cursor={{ fill: 'hsla(160, 84%, 39%, 0.05)' }}
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
        <div className="glass-card p-3 sm:p-5">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Trade Duration (Time to TP/SL)</h3>
          </div>
          
          {/* Duration Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Fastest</p>
              <p className="font-mono font-semibold text-success text-xs sm:text-base truncate">{formatDuration(minDuration)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-mono font-semibold text-foreground text-xs sm:text-base truncate">{formatDuration(avgDuration)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Longest</p>
              <p className="font-mono font-semibold text-warning text-xs sm:text-base truncate">{formatDuration(maxDuration)}</p>
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
                  labelStyle={{ background: 'hsla(160, 84%, 39%, 0.1)' }}
                  cursor={{ fill: 'hsla(160, 84%, 39%, 0.05)' }}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Symbol Distribution */}
        <div className="glass-card p-3 sm:p-5">
          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4 sm:mb-6">Symbol Distribution</h3>
          <div className="h-[220px] sm:h-[250px]">
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
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ background: 'hsla(160, 84%, 39%, 0.1)' }}
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
        <div className="glass-card p-3 sm:p-5">
          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4 sm:mb-6">Strategy Distribution</h3>
          <div className="h-[220px] sm:h-[250px]">
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
                    <Cell key={`cell-strat-${strategyPieData[index]?.name || index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ background: 'hsla(160, 84%, 39%, 0.1)' }}
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
        <div className="glass-card p-3 sm:p-5">
          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-4 sm:mb-6">Performance by Session</h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {sessionPerformance.map((session, index) => (
              <div
                key={session.name}
                className="p-3 sm:p-4 bg-secondary/30 rounded-xl animate-fade-in"
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
                    <span className={cn(
                      "font-mono",
                      session.winRate >= 50 ? "text-success" : "text-destructive"
                    )}>
                      {session.trades > 0 ? session.winRate.toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">P&L</span>
                    <span className={cn(
                      "font-mono",
                      session.pnl >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {session.pnl >= 0 ? '+' : ''}{session.pnl > 0 ? `$${session.pnl.toFixed(0)}` : session.pnl < 0 ? `-$${Math.abs(session.pnl).toFixed(0)}` : '$0'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
