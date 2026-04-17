import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import type { BehavioralScore } from '@/types/insights';

interface BehavioralScoresProps {
  scores: BehavioralScore[];
}

function getBarColor(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-yellow-400';
  return 'bg-destructive';
}

function getBarGlow(value: number): string {
  if (value >= 70) return '0 0 8px hsl(160 84% 39% / 0.5)';
  if (value >= 40) return '0 0 8px hsl(45 93% 47% / 0.5)';
  return '0 0 8px hsl(0 72% 51% / 0.5)';
}

function getTextColor(value: number): string {
  if (value >= 70) return 'text-success';
  if (value >= 40) return 'text-yellow-400';
  return 'text-destructive';
}

function AnimatedScoreValue({ value }: { value: number }) {
  const animatedValue = useAnimatedCounter(value, 900);
  return <>{animatedValue}%</>;
}

export function BehavioralScores({ scores }: BehavioralScoresProps) {
  if (!scores || scores.length === 0) return null;

  return (
    <Card className="ai-glow-card border-0 animate-fade-in">
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <CardTitle className="text-sm sm:text-base ai-shimmer-text">Behavioral Scores</CardTitle>
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
                    <AnimatedScoreValue value={score.value} />
                  </span>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out relative',
                    getBarColor(score.value)
                  )}
                  style={{
                    width: `${Math.min(Math.max(score.value, 0), 100)}%`,
                    boxShadow: getBarGlow(score.value),
                  }}
                >
                  {/* Shimmer sweep on the bar */}
                  <div
                    className="absolute inset-0 overflow-hidden rounded-full"
                    style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                        animation: 'shimmer-sweep 1.2s ease-out forwards',
                        animationDelay: `${0.8 + index * 0.1}s`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">{score.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
