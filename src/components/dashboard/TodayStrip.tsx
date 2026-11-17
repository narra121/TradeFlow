import { Link } from 'react-router-dom';
import { format } from 'date-fns/format';
import { Money } from '@/components/ui/money';
import { Skeleton } from '@/components/ui/skeleton';
import { Meter } from '@/components/stats/Meter';
import { appToday } from '@/lib/appTimeZone';
import { formatMoney, formatPercent, formatDayText } from '@/lib/format';
import type { TodaySummary, WeekGoal } from '@/lib/dashboard';
import type { WeekGoalsState } from './useWeekGoals';
import { BeforeSession } from './BeforeSession';

interface TodayStripProps {
  today: TodaySummary;
  todayLoading: boolean;
  /** Today's trades failed to load: the count is unknown, never "No trades yet". */
  todayError?: boolean;
  week: WeekGoalsState;
  /** `YYYY-MM-DD` of today, for the Trades link. */
  todayKey: string;
  now?: Date;
}

const SEGMENT = 'flex min-h-11 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[13px] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

function GoalSegment({ goal, label }: { goal: WeekGoal; label: string }) {
  const text = goal.type === 'maxDrawdown' ? `${formatPercent(goal.current)} of ${formatPercent(goal.target)}` : `${goal.current} of ${goal.target} ${goal.target === 1 ? 'trade' : 'trades'}`;
  return (
    <Link to="/app/goals" className={SEGMENT}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{text}</span>
      <Meter value={goal.current} max={goal.target} limit label={`${label}: ${text}`} />
      {goal.over && <span className="text-xs text-loss">Over the limit</span>}
    </Link>
  );
}

/**
 * The "may I keep trading?" line: today's result and this week's limits. It always shows today and this week,
 * whatever the period control says (E-021). Each segment links to where its figure comes from. Under it, the
 * before-the-session facts, which follow the page's scope.
 */
export function TodayStrip({ today, todayLoading, todayError = false, week, todayKey, now = appToday() }: TodayStripProps) {
  const tradesGoal = week.goals.find((g) => g.type === 'tradeCount');
  const drawdownGoal = week.goals.find((g) => g.type === 'maxDrawdown');
  const limitsSet = !!tradesGoal || !!drawdownGoal;

  return (
    <section aria-labelledby="today-h" className="overflow-hidden rounded-lg border border-border bg-card">
      <h2 id="today-h" className="sr-only">Today</h2>
      <div className="flex flex-wrap divide-border sm:divide-x [&>*]:flex-1 [&>*]:basis-48">
        <Link to={`/app/tradelog?on=${todayKey}&src=dashboard`} className={SEGMENT}>
          <span className="font-medium">Today · {format(now, 'EEE')} {formatDayText(now)}</span>
          {todayLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : todayError ? (
            <span className="text-muted-foreground">—</span>
          ) : today.count === 0 ? (
            <span className="text-muted-foreground">No trades yet</span>
          ) : (
            <span>
              {today.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} className="mr-2" aria-label={formatMoney(c.net, c.currency, { sign: true })} />)}
              <span className="text-muted-foreground">· {today.count} {today.count === 1 ? 'trade' : 'trades'}</span>
            </span>
          )}
        </Link>
        {week.isLoading ? (
          <div className={SEGMENT}><Skeleton className="h-4 w-40" /></div>
        ) : limitsSet ? (
          <>
            {tradesGoal && <GoalSegment goal={tradesGoal} label="Week" />}
            {drawdownGoal && <GoalSegment goal={drawdownGoal} label="Drawdown" />}
          </>
        ) : (
          <Link to="/app/goals" className={SEGMENT}><span className="text-primary">Set weekly limits →</span></Link>
        )}
        {!week.isLoading && week.hasRules && (
          <Link to="/app/goals" className={SEGMENT}>
            {week.brokenRules === 0 ? (
              <span className="text-muted-foreground">No rules broken this week</span>
            ) : (
              <span>{week.brokenRules} {week.brokenRules === 1 ? 'rule' : 'rules'} broken this week <span aria-hidden="true">→</span></span>
            )}
          </Link>
        )}
      </div>
      <BeforeSession />
    </section>
  );
}
