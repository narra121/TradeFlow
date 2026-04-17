import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { BehavioralScore } from '@/types/insights';

interface BehavioralScoresProps {
  scores: BehavioralScore[];
}

function getBarColor(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-yellow-400';
  return 'bg-destructive';
}

function getTextColor(value: number): string {
  if (value >= 70) return 'text-success';
  if (value >= 40) return 'text-yellow-400';
  return 'text-destructive';
}

export function BehavioralScores({ scores }: BehavioralScoresProps) {
  if (!scores || scores.length === 0) return null;

  return (
    <Card className="glass-card border-0 animate-fade-in">
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <CardTitle className="text-sm sm:text-base">Behavioral Scores</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scores.map((score, index) => (
            <div
              key={score.dimension}
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground font-medium truncate mr-2">
                  {score.dimension}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-sm font-mono font-semibold', getTextColor(score.value))}>
                    {score.value}%
                  </span>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out',
                    getBarColor(score.value)
                  )}
                  style={{ width: `${Math.min(Math.max(score.value, 0), 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground truncate">{score.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
