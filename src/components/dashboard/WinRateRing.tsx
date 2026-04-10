import { cn } from '@/lib/utils';

interface WinRateRingProps {
  winRate: number;
  wins: number;
  losses: number;
}

export function WinRateRing({ winRate, wins, losses }: WinRateRingProps) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (winRate / 100) * circumference;

  return (
    <div className="glass-card p-3 sm:p-5 animate-fade-in">
      <h3 className="font-semibold text-foreground mb-4 sm:mb-6 text-sm sm:text-base">Win Rate</h3>

      <div className="flex items-center justify-center">
        <div className="relative w-[100px] h-[100px] sm:w-[140px] sm:h-[140px]">
          <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="70"
              cy="70"
              r="45"
              stroke="hsl(220, 16%, 18%)"
              strokeWidth="10"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="70"
              cy="70"
              r="45"
              stroke="url(#winRateGradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="winRateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(160, 84%, 39%)" />
                <stop offset="100%" stopColor="hsl(170, 80%, 45%)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
              {winRate.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 sm:gap-8 mt-4 sm:mt-6">
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-semibold text-success font-mono">{wins}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Wins</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-semibold text-destructive font-mono">{losses}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Losses</p>
        </div>
      </div>
    </div>
  );
}
