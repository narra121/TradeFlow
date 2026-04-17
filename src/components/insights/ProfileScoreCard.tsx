import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import type { TraderProfile } from '@/types/insights';

interface ProfileScoreCardProps {
  profile: TraderProfile;
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'text-success';
  if (score <= 5) return 'text-blue-400';
  if (score <= 7) return 'text-yellow-400';
  return 'text-destructive';
}

function getScoreRingColor(score: number): string {
  if (score <= 3) return 'stroke-success';
  if (score <= 5) return 'stroke-blue-400';
  if (score <= 7) return 'stroke-yellow-400';
  return 'stroke-destructive';
}

function getScoreGlowColor(score: number): string {
  if (score <= 3) return 'hsl(160 84% 39% / 0.5)';
  if (score <= 5) return 'hsl(200 95% 50% / 0.5)';
  if (score <= 7) return 'hsl(45 93% 47% / 0.5)';
  return 'hsl(0 72% 51% / 0.5)';
}

function getScoreBgColor(score: number): string {
  if (score <= 3) return 'bg-success/10';
  if (score <= 5) return 'bg-blue-400/10';
  if (score <= 7) return 'bg-yellow-400/10';
  return 'bg-destructive/10';
}

function TrendIndicator({ trend }: { trend: string | null }) {
  if (!trend) return null;

  const trendLower = trend.toLowerCase();
  if (trendLower === 'up' || trendLower === 'increasing') {
    return (
      <div className="flex items-center gap-1 text-xs text-success">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>Trending up</span>
      </div>
    );
  }
  if (trendLower === 'down' || trendLower === 'decreasing') {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <TrendingDown className="w-3.5 h-3.5" />
        <span>Trending down</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="w-3.5 h-3.5" />
      <span>Stable</span>
    </div>
  );
}

export function ProfileScoreCard({ profile }: ProfileScoreCardProps) {
  const { typeLabel, aggressivenessScore, aggressivenessLabel, trend, summary } = profile;
  const animatedScore = useAnimatedCounter(aggressivenessScore, 1200);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (aggressivenessScore / 10) * circumference;
  const glowColor = getScoreGlowColor(aggressivenessScore);

  return (
    <Card className="ai-glow-card border-0 animate-fade-in">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Score Ring */}
          <div className="flex flex-col items-center gap-2 shrink-0 self-center sm:self-start">
            <div className={cn('relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center', getScoreBgColor(aggressivenessScore))}>
              {/* Glow ring behind SVG */}
              <div
                className="absolute inset-1 rounded-full animate-glow-breathe"
                style={{ boxShadow: `0 0 20px ${glowColor}, inset 0 0 12px ${glowColor}` }}
              />
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
                style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-secondary/50"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  className={cn('transition-all duration-1000 ease-out', getScoreRingColor(aggressivenessScore))}
                />
              </svg>
              <div className="flex flex-col items-center z-10">
                <span className={cn('text-2xl sm:text-3xl font-bold font-mono', getScoreColor(aggressivenessScore))}>
                  {animatedScore}
                </span>
                <span className="text-[10px] text-muted-foreground">/10</span>
              </div>
            </div>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getScoreBgColor(aggressivenessScore), getScoreColor(aggressivenessScore))}>
              {aggressivenessLabel}
            </span>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">Trader Profile</h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/20">
                  {typeLabel}
                </span>
              </div>
              <TrendIndicator trend={trend} />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
