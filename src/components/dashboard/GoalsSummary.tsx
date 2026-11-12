import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Meter } from '@/components/stats/Meter';
import { formatMoney, formatPercent } from '@/lib/format';
import type { WeekGoal } from '@/lib/dashboard';
import type { WeekGoalsState } from './useWeekGoals';

function figure(g: WeekGoal, currency?: string): string {
  switch (g.type) {
    case 'profit':
      return `${formatMoney(g.current, currency, { decimals: 2 })} of ${formatMoney(g.target, currency, { decimals: 2 })}`;
    case 'winRate':
      return `${formatPercent(g.current)} of ${formatPercent(g.target, 0)}`;
    case 'maxDrawdown':
      return `${formatPercent(g.current)} of ${formatPercent(g.target)}`;
    case 'tradeCount':
      return `${g.current} of ${g.target}`;
  }
}

/** Goals this week as tracks. Money figures are only shown for one currency (a profit goal has no meaning across two). */
export function GoalsSummary({ week, currency, mixed }: { week: WeekGoalsState; currency?: string; mixed: boolean }) {
  const goals = week.goals.filter((g) => !(g.type === 'profit' && mixed));
  return (
    <Panel title="Goals this week" actions={<Link to="/app/goals" className="text-xs text-primary hover:underline">Goals →</Link>}>
      {week.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5" />)}
        </div>
      ) : week.isError ? (
        <p className="text-sm text-muted-foreground">Could not load your goals. They are unchanged.</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No weekly goals set. <Link to="/app/goals" className="text-primary underline underline-offset-2">Set weekly limits →</Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.type} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-3 text-[13px] sm:grid-cols-[5.5rem_minmax(0,1fr)_auto_4.5rem]">
              <span className="text-muted-foreground">{g.label}</span>
              <span className="truncate font-mono tabular-nums">{figure(g, currency)}</span>
              <Meter value={g.current} max={g.target} limit={g.limit} label={`${g.label}: ${figure(g, currency)}`} />
              <span className={g.over ? 'hidden text-right text-xs text-loss sm:block' : 'hidden text-right text-xs text-muted-foreground sm:block'}>{g.statusText}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
