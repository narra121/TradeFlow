import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Calendar } from 'lucide-react';
import type { TradeSpotlight as TradeSpotlightType } from '@/types/insights';

interface TradeSpotlightProps {
  spotlight: TradeSpotlightType;
}

export function TradeSpotlight({ spotlight }: TradeSpotlightProps) {
  const navigate = useNavigate();
  const { tradeId, symbol, date, pnl, reason } = spotlight;
  const isPositive = pnl >= 0;

  const handleClick = () => {
    // Navigate to trade log with the trade highlighted
    navigate(`/app/tradelog?tradeId=${tradeId}`);
  };

  return (
    <div
      className="glass-card p-3 sm:p-4 cursor-pointer hover:bg-secondary/20 transition-all duration-200 animate-fade-in group"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* P&L Badge */}
        <div
          className={cn(
            'shrink-0 px-2 py-1 rounded-md text-xs font-mono font-semibold',
            isPositive
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {isPositive ? '+' : ''}${Math.abs(pnl).toFixed(2)}
        </div>

        {/* Trade Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{symbol}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{date}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {reason}
          </p>
        </div>

        {/* Hover indicator */}
        <div className="shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
