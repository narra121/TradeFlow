import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface TradeListProps {
  trades: Trade[];
  limit?: number;
}

export function TradeList({ trades, limit }: TradeListProps) {
  const displayTrades = limit ? trades.slice(0, limit) : trades;

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground">Recent Trades</h3>
      </div>
      <div className="divide-y divide-border/30">
        {displayTrades.map((trade, index) => (
          <div 
            key={trade.id}
            className="px-5 py-4 hover:bg-secondary/30 transition-colors cursor-pointer group"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Direction Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                  trade.direction === 'LONG' 
                    ? "bg-success/10" 
                    : "bg-destructive/10"
                )}>
                  {trade.direction === 'LONG' ? (
                    <ArrowUpRight className="w-5 h-5 text-success" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-destructive" />
                  )}
                </div>

                {/* Trade Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{trade.symbol}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      trade.direction === 'LONG'
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {trade.direction}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-muted-foreground">
                      {format(trade.entryDate, 'MMM d, HH:mm')}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {trade.size} lot{trade.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* P&L and Status */}
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  {trade.status === 'OPEN' ? (
                    <Clock className="w-4 h-4 text-warning" />
                  ) : (
                    <CheckCircle2 className={cn(
                      "w-4 h-4",
                      (trade.pnl || 0) >= 0 ? "text-success" : "text-destructive"
                    )} />
                  )}
                  {trade.status === 'CLOSED' && trade.pnl !== undefined && (
                    <span className={cn(
                      "font-semibold font-mono",
                      trade.pnl >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                    </span>
                  )}
                  {trade.status === 'OPEN' && (
                    <span className="text-warning font-medium">Active</span>
                  )}
                </div>
                {trade.pnlPercent !== undefined && trade.status === 'CLOSED' && (
                  <span className={cn(
                    "text-sm font-mono",
                    trade.pnlPercent >= 0 ? "text-success/70" : "text-destructive/70"
                  )}>
                    {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            {/* Tags */}
            {trade.tags && trade.tags.length > 0 && (
              <div className="flex gap-1.5 mt-3 ml-14">
                {trade.tags.slice(0, 3).map(tag => (
                  <span 
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground"
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
}
