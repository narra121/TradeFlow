import { memo } from 'react';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, BookOpen } from 'lucide-react';
import { format } from 'date-fns/format';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TradeListProps {
  trades: Trade[];
  limit?: number;
}

export const TradeList = memo(function TradeList({ trades, limit }: TradeListProps) {
  const displayTrades = limit ? trades.slice(0, limit) : trades;

  const isTradeUnmapped = (trade: Trade) => {
    // A trade is unmapped if it has no accountId or accountId is -1
    // Note: The mapping function converts '-1' and -1 to undefined
    return !trade.accountId || trade.accountId === '-1' || trade.accountId === "-1";
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground text-sm sm:text-base">Recent Trades</h3>
      </div>
      <div className="divide-y divide-border/30">
        {displayTrades.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No recent trades</h3>
            <p className="text-muted-foreground max-w-md">
              Your recent trades will appear here once you start logging.
            </p>
          </div>
        )}
        {displayTrades.map((trade, index) => (
          <div
            key={trade.id}
            className="px-3 sm:px-5 py-3 sm:py-4 hover:bg-secondary/30 transition-colors cursor-pointer group"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                {/* Direction Icon */}
                <div className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
                  trade.direction === 'LONG'
                    ? "bg-success/10"
                    : "bg-destructive/10"
                )}>
                  {trade.direction === 'LONG' ? (
                    <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                  )}
                </div>

                {/* Trade Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm sm:text-base truncate">{trade.symbol}</span>
                    {isTradeUnmapped(trade) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="w-2 h-2 rounded-full bg-warning animate-pulse shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" sideOffset={6}>
                            <p>
                              This trade is not mapped to any account id and will not be considered in any stats calculation.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <span className={cn(
                      "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium shrink-0",
                      trade.direction === 'LONG'
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {trade.direction}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                    <span className="text-xs sm:text-sm text-muted-foreground truncate">
                      {format(new Date(trade.entryDate), 'MMM d, HH:mm')}
                    </span>
                    <span className="text-muted-foreground/50 shrink-0">•</span>
                    <span className="text-xs sm:text-sm text-muted-foreground font-mono shrink-0">
                      {trade.size} lot{trade.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* P&L and Outcome */}
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
                  <CheckCircle2 className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:block",
                    (trade.pnl || 0) >= 0 ? "text-success" : "text-destructive"
                  )} />
                  {trade.pnl !== undefined && (
                    <span className={cn(
                      "font-semibold font-mono text-sm sm:text-base",
                      trade.pnl >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {trade.pnl >= 0 ? '+' : ''}{(trade.pnl ?? 0).toFixed(2)}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium",
                  trade.outcome === 'TP' ? "bg-success/10 text-success" :
                  trade.outcome === 'PARTIAL' ? "bg-primary/10 text-primary" :
                  trade.outcome === 'BREAKEVEN' ? "bg-muted text-muted-foreground" :
                  "bg-destructive/10 text-destructive"
                )}>
                  {trade.outcome}
                </span>
              </div>
            </div>

            {/* Tags */}
            {trade.tags && trade.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3 ml-10 sm:ml-14">
                {trade.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md bg-secondary text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
