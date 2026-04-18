import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { HourlyEdge, DayOfWeekEdge } from '@/types/insights';

interface TimeEdgeHeatmapProps {
  hourlyEdges: HourlyEdge[];
  dayOfWeekEdges: DayOfWeekEdge[];
}

function getCellColors(label: 'green_zone' | 'red_zone' | 'neutral'): string {
  switch (label) {
    case 'green_zone':
      return 'bg-success/20 border-success/30 text-success';
    case 'red_zone':
      return 'bg-destructive/20 border-destructive/30 text-destructive';
    case 'neutral':
      return 'bg-secondary/30 border-border/30 text-muted-foreground';
  }
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function TimeEdgeHeatmap({ hourlyEdges, dayOfWeekEdges }: TimeEdgeHeatmapProps) {
  const activeHours = hourlyEdges.filter((h) => h.tradeCount > 0);

  return (
    <Card className="ai-glow-card border-0 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-base font-semibold">Trading Time Edges</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Green = profitable zone (60%+ win rate) | Red = danger zone (40%- win rate or negative
              avg P&L)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hourly section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            By Hour (UTC)
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            {activeHours.map((edge) => (
              <div
                key={edge.hour}
                className={cn('rounded-md border p-2 text-center', getCellColors(edge.label))}
              >
                <div className="text-xs font-mono font-bold">{formatHour(edge.hour)}</div>
                <div className="text-[10px]">{edge.tradeCount} trades</div>
                <div className="text-[10px] font-mono">{Math.round(edge.winRate)}% WR</div>
              </div>
            ))}
          </div>
        </div>

        {/* Day of Week section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            By Day of Week
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {dayOfWeekEdges.map((edge) => (
              <div
                key={edge.day}
                className={cn(
                  'rounded-md border p-2 text-center',
                  edge.tradeCount === 0
                    ? 'bg-secondary/10 text-muted-foreground/40'
                    : getCellColors(edge.label)
                )}
              >
                <div className="text-xs font-medium">{edge.dayName}</div>
                <div className="text-[10px]">{edge.tradeCount} trades</div>
                {edge.tradeCount > 0 && (
                  <div className="text-[10px] font-mono">{Math.round(edge.winRate)}% WR</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
