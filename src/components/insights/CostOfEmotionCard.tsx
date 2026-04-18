import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Flame, Clock, ShieldX } from 'lucide-react';
import type { CostOfEmotion } from '@/types/insights';

interface CostOfEmotionCardProps {
  costOfEmotion: CostOfEmotion;
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}K` : `$${abs.toFixed(0)}`;
  return value < 0 ? `-${formatted}` : formatted;
}

export function CostOfEmotionCard({ costOfEmotion }: CostOfEmotionCardProps) {
  const { revengeTrading, overtrading, rulesViolations, totalEmotionalCost } = costOfEmotion;

  const isCritical = totalEmotionalCost < -100;

  const rows = [
    {
      icon: Flame,
      label: 'Revenge Trading',
      count: revengeTrading.count,
      pnl: revengeTrading.totalPnl,
    },
    {
      icon: Clock,
      label: 'Overtrading',
      count: overtrading.daysCount,
      pnl: overtrading.excessTradePnl,
    },
    {
      icon: ShieldX,
      label: 'Rules Violations',
      count: rulesViolations.count,
      pnl: rulesViolations.totalPnl,
    },
  ].filter((row) => row.count > 0);

  return (
    <Card
      className={cn(
        'ai-glow-card border-0 animate-fade-in',
        isCritical && 'border-l-2 border-l-destructive'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'w-5 h-5',
                isCritical ? 'text-destructive' : 'text-yellow-400'
              )}
            />
            <CardTitle className="text-base font-semibold">Cost of Emotion</CardTitle>
          </div>
          <span
            className={cn(
              'text-xl font-bold font-mono',
              totalEmotionalCost < 0 ? 'text-destructive' : 'text-success'
            )}
          >
            {formatCurrency(totalEmotionalCost)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {row.label}{' '}
                  <span className="text-xs">({row.count})</span>
                </span>
              </div>
              <span
                className={cn(
                  'text-sm font-mono',
                  row.pnl < 0 ? 'text-destructive' : 'text-success'
                )}
              >
                {formatCurrency(row.pnl)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
