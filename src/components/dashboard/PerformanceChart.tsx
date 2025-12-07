import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { format } from 'date-fns';

interface ChartDataPoint {
  date: string;
  pnl: number;
  cumulative: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 shadow-card border-border/50">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={cn(
          "font-semibold font-mono",
          payload[0].value >= 0 ? "text-success" : "text-destructive"
        )}>
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

interface PerformanceChartProps {
  trades?: Trade[];
}

export function PerformanceChart({ trades = [] }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    if (trades.length === 0) {
      return [];
    }

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
    );

    // Group trades by date and calculate cumulative P&L
    const dailyData: Record<string, number> = {};
    sortedTrades.forEach(trade => {
      const dateKey = format(new Date(trade.exitDate || trade.entryDate), 'MMM dd');
      dailyData[dateKey] = (dailyData[dateKey] || 0) + (trade.pnl || 0);
    });

    // Convert to chart data with cumulative values
    let cumulative = 0;
    return Object.entries(dailyData).map(([date, pnl]) => {
      cumulative += pnl;
      return {
        date,
        pnl,
        cumulative,
      };
    });
  }, [trades]);

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Equity Curve</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Cumulative P&L over time</p>
        </div>
      </div>
      
      <div className="h-[280px]">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No trades in selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(220, 16%, 18%)" 
                vertical={false} 
              />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(160, 84%, 39%)"
                strokeWidth={2}
                fill="url(#colorPnl)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}