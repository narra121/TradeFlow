import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Money } from '@/components/ui/money';
import { useAnalysis } from '@/components/analysis/useAnalysis';
import { DIMENSION_LABEL } from '@/components/analysis/OverviewPanels';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { useGetFocusRuleQuery } from '@/store/api/analysisApi';
import { formatDateShort, formatR } from '@/lib/format';
import { plural } from '@/lib/evidence';
import type { Analysis } from '@/types/analysis';
import type { Trade } from '@/types/trade';
import { DOT_ITEM, DOT_LINE, DOT_WRAP } from '@/components/calendar/PeriodSummary';

/** The run of wins or losses that the newest trades end on; a break-even trade ends it. */
export function currentStreak(newestFirst: Pick<Trade, 'pnl'>[]): { kind: 'win' | 'loss'; count: number } | null {
  const first = newestFirst[0];
  if (!first || first.pnl === 0) return null;
  const kind = first.pnl > 0 ? 'win' : 'loss';
  let count = 0;
  for (const t of newestFirst) {
    if ((kind === 'win' && t.pnl > 0) || (kind === 'loss' && t.pnl < 0)) count++;
    else break;
  }
  return { kind, count };
}

export interface TodayLeak {
  name: string;
  where: string;
  avgR: number | null;
}

/**
 * Leaks the server judged proven that apply today: behaviours and segments apply every day, a weekday only on that day
 * (in the zone the analysis used).
 */
export function leaksForToday(a: Analysis, now: Date = new Date()): TodayLeak[] {
  let today = '';
  try {
    today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: a.period.timeZone }).format(now);
  } catch {
    today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  }
  const segs = (Object.entries(a.segments) as [keyof Analysis['segments'], Analysis['segments'][keyof Analysis['segments']]][]).flatMap(([dim, list]) =>
    list.filter((s) => s.verdict === 'leak' && (dim !== 'weekday' || s.name === today)).map((s) => ({ name: s.name, where: DIMENSION_LABEL[dim].toLowerCase(), avgR: s.avgR })),
  );
  const behaviours = a.detectors.filter((d) => d.verdict === 'leak').map((d) => ({ name: d.title, where: 'behaviour', avgR: d.avgR }));
  return [...behaviours, ...segs];
}

const SEG = 'flex min-h-9 [@media(pointer:coarse)]:min-h-11 min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-[13px]';

/**
 * Before the session (report §5.5, no model call): drawdown now and the current streak, proven leaks that apply today,
 * and this week's focus rule once the server has one (GET /insights/focus; a 404 means none yet). Same scope as the page.
 */
export function BeforeSession() {
  const state = useAnalysis();
  const { trades, isLoading: tradesLoading } = useScopeTrades();
  const focus = useGetFocusRuleQuery();
  const a = state.data;
  const streak = currentStreak(trades);
  const leaks = a ? leaksForToday(a) : [];

  return (
    <section aria-label="Before the session" className="flex flex-wrap divide-border border-t border-border sm:divide-x [&>*]:flex-1 [&>*]:basis-56">
      <div className={SEG}>
        {/* "·" between the two facts never starts or ends a wrapped line (DOT_* in PeriodSummary). */}
        <div className={DOT_WRAP}>
          <div className={`${DOT_LINE} py-0.5`}>
            <span className={`${DOT_ITEM} inline-flex items-baseline gap-x-2 pl-0.5`}>
              <span className="text-muted-foreground">Drawdown now</span>
              {state.isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : state.mixed ? (
                <span className="text-muted-foreground">pick one account</span>
              ) : !a || state.isError ? (
                <button type="button" className="text-primary hover:underline" onClick={state.refetch}>Couldn't load · Retry</button>
              ) : a.risk.drawdown.current > 0 ? (
                <span>
                  <Money value={-a.risk.drawdown.current} currency={a.currency ?? undefined} />
                  {a.risk.drawdown.since && <span className="text-muted-foreground"> since {formatDateShort(a.risk.drawdown.since).replace(/^0/, '')}</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">none, at the period high</span>
              )}
            </span>
            <span className={`${DOT_ITEM} inline-flex items-baseline gap-x-2`}>
              <span className="text-muted-foreground">Streak</span>
              {tradesLoading ? <Skeleton className="h-4 w-12" /> : <span>{streak ? plural(streak.count, streak.kind === 'win' ? 'win' : 'loss', streak.kind === 'win' ? 'wins' : 'losses') : '—'}</span>}
            </span>
          </div>
        </div>
      </div>
      <Link to="/app/analytics?tab=behaviour" className={`${SEG} hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}>
        <span className="text-muted-foreground">Proven leaks today</span>
        {state.isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : !a ? (
          <span className="text-muted-foreground">—</span>
        ) : leaks.length === 0 ? (
          <span className="text-muted-foreground">none proven yet ({plural(a.tradeCount, 'trade')})</span>
        ) : (
          <span className="min-w-0 truncate">
            {leaks.slice(0, 2).map((l) => `${l.name} (${l.where}, ${formatR(l.avgR)})`).join(' · ')}
            {leaks.length > 2 ? ` · +${leaks.length - 2} more` : ''}
          </span>
        )}
      </Link>
      {focus.data && (
        <Link to="/app/insights" className={`${SEG} hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}>
          <span className="text-muted-foreground">Focus this week</span>
          <span className="min-w-0 truncate font-medium">{focus.data.text}</span>
          {focus.data.progress && focus.data.progress.checked > 0 && (
            <span className="whitespace-nowrap text-muted-foreground">kept {focus.data.progress.kept} of {plural(focus.data.progress.checked, 'trade')}</span>
          )}
        </Link>
      )}
    </section>
  );
}
