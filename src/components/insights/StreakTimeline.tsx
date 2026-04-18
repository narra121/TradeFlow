import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import type { StreakInfo } from '@/types/insights';

interface StreakTimelineProps {
  streaks: StreakInfo[];
  longestWinStreak: StreakInfo | null;
  longestLossStreak: StreakInfo | null;
  currentStreak: StreakInfo | null;
}

function formatPnl(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(1)}K` : abs.toFixed(0);
  return value < 0 ? `-$${formatted}` : `+$${formatted}`;
}

export function StreakTimeline({
  streaks,
  longestWinStreak,
  longestLossStreak,
  currentStreak,
}: StreakTimelineProps) {
  if (streaks.length === 0) return null;

  const maxLength = Math.max(...streaks.map((s) => s.length));
  const displayStreaks = streaks.slice(0, 10);

  return (
    <Card className="ai-glow-card border-0 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Win/Loss Streaks</CardTitle>
          </div>
          {currentStreak && (
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5',
                currentStreak.type === 'win'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {currentStreak.type === 'win' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              Current: {currentStreak.length}{' '}
              {currentStreak.type === 'win' ? 'wins' : 'losses'} in a row
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak bars */}
        <div className="space-y-1.5">
          {displayStreaks.map((streak, i) => {
            const widthPct = Math.max(15, (streak.length / maxLength) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] text-muted-foreground">
                  {streak.startDate.slice(5)}
                </span>
                <div
                  className={cn(
                    'h-5 rounded-sm flex items-center px-1.5 overflow-hidden',
                    streak.type === 'win' ? 'bg-success' : 'bg-destructive'
                  )}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="text-[10px] font-mono text-white whitespace-nowrap">
                    {streak.length}x ({formatPnl(streak.totalPnl)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Best Win Streak</p>
            <p className="text-2xl font-bold font-mono text-success">
              {longestWinStreak?.length ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Worst Loss Streak</p>
            <p className="text-2xl font-bold font-mono text-destructive">
              {longestLossStreak?.length ?? 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
