import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  date: string;
  pnl: number;
  cumulative: number;
}

const mockChartData: ChartDataPoint[] = [
  { date: 'Nov 25', pnl: 250, cumulative: 250 },
  { date: 'Nov 26', pnl: -100, cumulative: 150 },
  { date: 'Nov 27', pnl: 400, cumulative: 550 },
  { date: 'Nov 28', pnl: 150, cumulative: 700 },
  { date: 'Nov 29', pnl: -200, cumulative: 500 },
  { date: 'Nov 30', pnl: 350, cumulative: 850 },
  { date: 'Dec 01', pnl: 862, cumulative: 1712 },
  { date: 'Dec 02', pnl: -225, cumulative: 1487 },
  { date: 'Dec 03', pnl: 450, cumulative: 1937 },
  { date: 'Dec 04', pnl: 700, cumulative: 2637 },
];

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

export function PerformanceChart() {
  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Equity Curve</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Cumulative P&L over time</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-sm px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">
            10D
          </button>
          <button className="text-sm px-3 py-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
            30D
          </button>
          <button className="text-sm px-3 py-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
            90D
          </button>
        </div>
      </div>
      
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
      </div>
    </div>
  );
}
