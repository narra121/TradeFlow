import { useState } from 'react';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarViewProps {
  trades: Trade[];
}

export function CalendarView({ trades }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get all weeks that overlap with this month
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 0 }
  );

  // Calculate P&L for each day
  const getDayStats = (date: Date) => {
    const dayTrades = trades.filter(trade => {
      if (trade.status !== 'CLOSED' || !trade.exitDate) return false;
      return isSameDay(trade.exitDate, date);
    });

    if (dayTrades.length === 0) return null;

    const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = dayTrades.filter(t => (t.pnl || 0) > 0).length;

    return {
      trades: dayTrades.length,
      pnl,
      wins,
      losses: dayTrades.length - wins,
    };
  };

  // Calculate weekly stats
  const getWeekStats = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    let totalTrades = 0;
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;

    weekDays.forEach(day => {
      const stats = getDayStats(day);
      if (stats) {
        totalTrades += stats.trades;
        totalPnl += stats.pnl;
        wins += stats.wins;
        losses += stats.losses;
      }
    });

    return {
      trades: totalTrades,
      pnl: totalPnl,
      wins,
      losses,
      winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground mt-1">Visualize your trading days</p>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="glass-card p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-8 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          <div className="text-center text-sm font-medium text-muted-foreground py-2">
            Weekly
          </div>
        </div>

        {/* Calendar Grid with Weekly Summaries */}
        {weeks.map((weekStart, weekIndex) => {
          const weekDays = eachDayOfInterval({
            start: weekStart,
            end: endOfWeek(weekStart, { weekStartsOn: 0 }),
          });
          const weekStats = getWeekStats(weekStart);

          return (
            <div key={weekStart.toISOString()} className="grid grid-cols-8 gap-2 mb-2">
              {/* Days of the week */}
              {weekDays.map((day, dayIndex) => {
                const stats = getDayStats(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "aspect-square p-2 rounded-xl transition-all cursor-pointer animate-fade-in",
                      "hover:bg-secondary/50",
                      !isCurrentMonth && "opacity-30",
                      isToday && "ring-2 ring-primary",
                      stats && (stats.pnl >= 0 ? "bg-success/10" : "bg-destructive/10")
                    )}
                    style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 0.01}s` }}
                  >
                    <div className="h-full flex flex-col">
                      <span className={cn(
                        "text-sm",
                        isToday ? "text-primary font-semibold" : "text-muted-foreground"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      {stats && (
                        <div className="flex-1 flex flex-col justify-end">
                          <span className={cn(
                            "text-xs font-semibold font-mono",
                            stats.pnl >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toFixed(0)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stats.trades} trade{stats.trades !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Weekly Summary */}
              <div
                className={cn(
                  "p-2 rounded-xl transition-all animate-fade-in border border-border/50",
                  weekStats.trades > 0 && (weekStats.pnl >= 0 ? "bg-success/5" : "bg-destructive/5")
                )}
                style={{ animationDelay: `${weekIndex * 0.05}s` }}
              >
                {weekStats.trades > 0 ? (
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">W{weekIndex + 1}</span>
                      <span className={cn(
                        "text-xs font-semibold font-mono",
                        weekStats.pnl >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {weekStats.pnl >= 0 ? '+' : ''}${weekStats.pnl.toFixed(0)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Trades</span>
                        <span className="font-mono">{weekStats.trades}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Win%</span>
                        <span className="font-mono">{weekStats.winRate.toFixed(0)}%</span>
                      </div>
                      <div className="flex gap-1 text-xs">
                        <span className="text-success">{weekStats.wins}W</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-destructive">{weekStats.losses}L</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">—</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success/20" />
            <span className="text-sm text-muted-foreground">Profitable Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/20" />
            <span className="text-sm text-muted-foreground">Loss Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded ring-2 ring-primary" />
            <span className="text-sm text-muted-foreground">Today</span>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Trading Days', value: weeks.flatMap(w => eachDayOfInterval({ start: w, end: endOfWeek(w, { weekStartsOn: 0 }) })).filter(d => getDayStats(d)).length },
          { label: 'Profitable Days', value: weeks.flatMap(w => eachDayOfInterval({ start: w, end: endOfWeek(w, { weekStartsOn: 0 }) })).filter(d => { const s = getDayStats(d); return s && s.pnl > 0; }).length },
          { label: 'Loss Days', value: weeks.flatMap(w => eachDayOfInterval({ start: w, end: endOfWeek(w, { weekStartsOn: 0 }) })).filter(d => { const s = getDayStats(d); return s && s.pnl < 0; }).length },
          { label: 'Monthly P&L', value: `$${weeks.reduce((sum, w) => sum + getWeekStats(w).pnl, 0).toFixed(2)}` },
        ].map((stat, index) => (
          <div 
            key={stat.label}
            className="glass-card p-4 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold text-foreground font-mono mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
