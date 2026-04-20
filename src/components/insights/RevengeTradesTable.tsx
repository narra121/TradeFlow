import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import type { RevengeTradeSignal } from '@/types/insights';

interface RevengeTradesTableProps {
  revengeTrades: RevengeTradeSignal[];
  onViewTrade?: (tradeId: string) => void;
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}K` : `$${abs.toFixed(0)}`;
  return value < 0 ? `-${formatted}` : formatted;
}

function totalPnl(trades: RevengeTradeSignal[]): number {
  return trades.reduce((sum, t) => sum + t.revengePnl, 0);
}

export function RevengeTradesTable({ revengeTrades, onViewTrade }: RevengeTradesTableProps) {
  if (revengeTrades.length === 0) return null;

  const displayTrades = revengeTrades.slice(0, 10);
  const total = totalPnl(revengeTrades);

  return (
    <Card className="border-l-2 border-l-destructive ai-glow-card border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-destructive" />
            <CardTitle className="text-base font-semibold">
              Revenge Trades Detected
            </CardTitle>
            <span className="text-xs text-muted-foreground">({revengeTrades.length})</span>
          </div>
          <span
            className={cn(
              'text-sm font-mono font-medium',
              total < 0 ? 'text-destructive' : 'text-success'
            )}
          >
            {formatCurrency(total)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-1.5 px-2 text-xs text-muted-foreground font-medium">Trade</th>
                <th className="text-left py-1.5 px-2 text-xs text-muted-foreground font-medium">After Loss</th>
                <th className="text-left py-1.5 px-2 text-xs text-muted-foreground font-medium">Gap</th>
                <th className="text-right py-1.5 px-2 text-xs text-muted-foreground font-medium">Trigger P&L</th>
                <th className="text-right py-1.5 px-2 text-xs text-muted-foreground font-medium">Revenge P&L</th>
              </tr>
            </thead>
            <tbody>
              {displayTrades.map((trade, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0">
                  <td className="py-1.5 px-2 font-mono">
                    <button
                      type="button"
                      className="text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline"
                      onClick={() => onViewTrade?.(trade.tradeId)}
                    >
                      {trade.tradeId.slice(0, 8)}
                    </button>
                  </td>
                  <td className="py-1.5 px-2 font-mono">
                    <button
                      type="button"
                      className="text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline"
                      onClick={() => onViewTrade?.(trade.triggerTradeId)}
                    >
                      {trade.triggerTradeId.slice(0, 8)}
                    </button>
                  </td>
                  <td className="py-1.5 px-2">{trade.gapMinutes}m</td>
                  <td
                    className={cn(
                      'py-1.5 px-2 text-right font-mono',
                      trade.triggerPnl < 0 ? 'text-destructive' : 'text-success'
                    )}
                  >
                    {formatCurrency(trade.triggerPnl)}
                  </td>
                  <td
                    className={cn(
                      'py-1.5 px-2 text-right font-mono',
                      trade.revengePnl < 0 ? 'text-destructive' : 'text-success'
                    )}
                  >
                    {formatCurrency(trade.revengePnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
