import { useState, useMemo, useEffect, useCallback } from 'react';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarTradeModal } from '@/components/trade/CalendarTradeModal';
import { useIsMobile } from '@/hooks/use-mobile';

interface CalendarViewProps {
  trades: Trade[];
}

export function CalendarView({ trades }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get all weeks that overlap with this month
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  // Get trades for a specific day
  const getTradesForDay = (date: Date) => {
    return trades.filter(trade => {
      if (!trade.exitDate) return false;
      return isSameDay(trade.exitDate, date);
    });
  };

  // Calculate P&L for each day
  const getDayStats = (date: Date) => {
    const dayTrades = getTradesForDay(date);

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
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
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

  // Get all trading days for navigation
  const tradingDays = useMemo(() => {
    const days: Date[] = [];
    trades.forEach(trade => {
      if (trade.exitDate) {
        const exitDate = new Date(trade.exitDate);
        const exists = days.some(d => isSameDay(d, exitDate));
        if (!exists) {
          days.push(exitDate);
        }
      }
    });
    return days.sort((a, b) => a.getTime() - b.getTime());
  }, [trades]);

  const handleDayClick = (date: Date) => {
    const dayTrades = getTradesForDay(date);
    if (dayTrades.length > 0) {
      setSelectedDate(date);
      setIsModalOpen(true);
    }
  };

  const getCurrentDayIndex = () => {
    if (!selectedDate) return undefined;
    return tradingDays.findIndex(d => isSameDay(d, selectedDate));
  };

  const handlePreviousDay = () => {
    const currentIndex = getCurrentDayIndex();
    if (currentIndex !== undefined && currentIndex > 0) {
      setSelectedDate(tradingDays[currentIndex - 1]);
    }
  };

  const handleNextDay = () => {
    const currentIndex = getCurrentDayIndex();
    if (currentIndex !== undefined && currentIndex < tradingDays.length - 1) {
      setSelectedDate(tradingDays[currentIndex + 1]);
    }
  };

  return (
    <div className={cn(
      isExpanded
        ? "fixed inset-0 z-50 bg-background flex flex-col p-4 sm:p-6 animate-scale-in"
        : "space-y-6"
    )}>
      {/* Header — hidden in expanded mode */}
      {!isExpanded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Visualize your trading days</p>
          </div>
        </div>
      )}

      {/* Calendar Card */}
      <div className={cn(
        isExpanded
          ? "flex-1 flex flex-col min-h-0"
          : "glass-card p-3 sm:p-6 overflow-x-auto"
      )}>
        {/* Month Navigation */}
        <div className={cn(
          "flex items-center justify-between shrink-0",
          isExpanded ? "mb-3" : "mb-4 sm:mb-6"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className={cn(
            "font-semibold text-foreground",
            isExpanded ? "text-lg" : "text-xl"
          )}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpanded}
              className="text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Day Headers */}
        <div className={cn(
          "grid grid-cols-8 gap-1 sm:gap-2 mb-2 shrink-0",
          !isExpanded && "min-w-[560px]"
        )}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
              {day}
            </div>
          ))}
          <div className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
            Weekly
          </div>
        </div>

        {/* Calendar Grid with Weekly Summaries */}
        <div className={cn(isExpanded && "flex-1 flex flex-col gap-1 sm:gap-2 min-h-0")}>
          {weeks.map((weekStart, weekIndex) => {
            const weekDays = eachDayOfInterval({
              start: weekStart,
              end: endOfWeek(weekStart, { weekStartsOn: 1 }),
            });
            const weekStats = getWeekStats(weekStart);

            return (
              <div
                key={weekStart.toISOString()}
                className={cn(
                  "grid grid-cols-8 gap-1 sm:gap-2",
                  isExpanded ? "flex-1 min-h-0" : "mb-1 sm:mb-2 min-w-[560px]"
                )}
              >
                {/* Days of the week */}
                {weekDays.map((day, dayIndex) => {
                  const stats = getDayStats(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "p-2 rounded-xl transition-all animate-fade-in",
                        !isExpanded && "aspect-square",
                        stats ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : "cursor-default",
                        "hover:bg-secondary/50",
                        !isCurrentMonth && "opacity-30",
                        isToday && "ring-2 ring-primary",
                        stats && (stats.pnl >= 0 ? "bg-success/10" : "bg-destructive/10")
                      )}
                      style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 0.01}s` }}
                    >
                      <div className="h-full flex flex-col">
                        <span className={cn(
                          isExpanded ? "text-sm sm:text-base" : "text-sm",
                          isToday ? "text-primary font-semibold" : "text-muted-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>

                        {stats && (
                          <div className="flex-1 flex flex-col justify-end">
                            {isMobile && !isExpanded ? (
                              <span className={cn(
                                "text-[10px] font-mono font-semibold",
                                stats.pnl >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toFixed(0)}
                              </span>
                            ) : (
                              <>
                                <span className={cn(
                                  "font-semibold font-mono",
                                  isExpanded ? "text-sm sm:text-base" : "text-xs",
                                  stats.pnl >= 0 ? "text-success" : "text-destructive"
                                )}>
                                  {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toFixed(0)}
                                </span>
                                <span className={cn(
                                  "text-muted-foreground",
                                  isExpanded ? "text-xs sm:text-sm" : "text-xs"
                                )}>
                                  {stats.trades} trade{stats.trades !== 1 ? 's' : ''}
                                </span>
                              </>
                            )}
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
                        <span className={cn("text-muted-foreground", isExpanded ? "text-xs sm:text-sm" : "text-xs")}>W{weekIndex + 1}</span>
                        <span className={cn(
                          "font-semibold font-mono",
                          isExpanded ? "text-xs sm:text-sm" : "text-xs",
                          weekStats.pnl >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {weekStats.pnl >= 0 ? '+' : ''}${weekStats.pnl.toFixed(0)}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div className={cn("flex justify-between", isExpanded ? "text-xs sm:text-sm" : "text-xs")}>
                          <span className="text-muted-foreground">Trades</span>
                          <span className="font-mono">{weekStats.trades}</span>
                        </div>
                        <div className={cn("flex justify-between", isExpanded ? "text-xs sm:text-sm" : "text-xs")}>
                          <span className="text-muted-foreground">Win%</span>
                          <span className="font-mono">{weekStats.winRate.toFixed(0)}%</span>
                        </div>
                        <div className={cn("flex gap-1", isExpanded ? "text-xs sm:text-sm" : "text-xs")}>
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
        </div>

        {/* Monthly Summary + Legend — hidden in expanded mode */}
        {!isExpanded && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {(() => {
                const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const tradingDaysCount = monthDays.filter(d => getDayStats(d)).length;
                const profitableDays = monthDays.filter(d => { const s = getDayStats(d); return s && s.pnl > 0; }).length;
                const lossDays = monthDays.filter(d => { const s = getDayStats(d); return s && s.pnl < 0; }).length;
                const monthlyPnl = monthDays.reduce((sum, d) => { const s = getDayStats(d); return sum + (s?.pnl ?? 0); }, 0);
                return [
                  { label: 'Trading Days', value: String(tradingDaysCount) },
                  { label: 'Profitable Days', value: String(profitableDays) },
                  { label: 'Loss Days', value: String(lossDays) },
                  { label: 'Monthly P&L', value: `$${monthlyPnl.toFixed(2)}`, isPnl: true, pnl: monthlyPnl },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-secondary/30 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    <p className={cn(
                      "text-lg sm:text-2xl font-semibold font-mono mt-1 truncate",
                      stat.isPnl
                        ? (stat.pnl ?? 0) >= 0 ? "text-success" : "text-destructive"
                        : "text-foreground"
                    )}>{stat.value}</p>
                  </div>
                ));
              })()}
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-success/20" />
                <span className="text-xs sm:text-sm text-muted-foreground">Profitable Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-destructive/20" />
                <span className="text-xs sm:text-sm text-muted-foreground">Loss Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded ring-2 ring-primary" />
                <span className="text-xs sm:text-sm text-muted-foreground">Today</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Trade Modal */}
      {selectedDate && (
        <CalendarTradeModal
          trades={getTradesForDay(selectedDate)}
          selectedDate={selectedDate}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDate(null);
          }}
          onPreviousDay={handlePreviousDay}
          onNextDay={handleNextDay}
          hasPreviousDay={(getCurrentDayIndex() ?? 0) > 0}
          hasNextDay={(getCurrentDayIndex() ?? tradingDays.length) < tradingDays.length - 1}
          currentDayIndex={getCurrentDayIndex()}
          totalDays={tradingDays.length}
        />
      )}
    </div>
  );
}
