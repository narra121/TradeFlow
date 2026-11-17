import { format } from 'date-fns';
import { Money } from '@/components/ui/money';
import { plural } from '@/components/calendar/dayText';
import type { CalendarMetric, DayCell, DaysSummary } from '@/lib/calendar';

/** Items split by "·" that never start or end a wrapped line with it: each dot sits in a 1 rem strip before its item, and a
 * line-start dot falls in the strip the clipping wrapper hides. `DOT_WRAP` wrapper › `DOT_LINE` line › `DOT_ITEM` items. */
export const DOT_WRAP = 'overflow-hidden';
export const DOT_LINE = '-ml-4 flex flex-wrap items-baseline gap-y-1';
export const DOT_ITEM = "whitespace-nowrap before:inline-block before:w-4 before:text-center before:text-muted-foreground before:content-['·']";

interface PeriodSummaryProps {
  summary: DaysSummary;
  days: DayCell[];
  metric: CalendarMetric;
}

/** One line for what is on screen. Best and Worst only name a day when there are two to compare and the day really was a gain or a loss. */
export function PeriodSummary({ summary, days, metric }: PeriodSummaryProps) {
  const currency = summary.byCurrency[0]?.currency;
  const comparable = summary.tradingDays >= 2;
  const best = comparable && summary.best && summary.best.net > 0 ? summary.best : null;
  const worst = comparable && summary.worst && summary.worst.net < 0 ? summary.worst : null;
  const dayOf = (key: string) => days.find((d) => d.key === key)?.date;
  const bestDate = best ? dayOf(best.key) : undefined;
  const worstDate = worst ? dayOf(worst.key) : undefined;
  // A year (or any span of trading days over several months) names the month too: "Tue 10" alone is ambiguous there.
  const traded = days.filter((d) => d.trades.length);
  const dayFormat = new Set(traded.map((d) => d.key.slice(0, 7))).size > 1 ? 'EEE d MMM' : 'EEE d';
  // Coloured by R, a day counts by the sign of its R, as its tint does; otherwise by net (or outcomes when currencies mix).
  const byR = metric === 'r';
  const green = byR ? traded.filter((d) => d.sumR !== null && d.sumR > 0).length : summary.greenDays;
  const red = byR ? traded.filter((d) => d.sumR !== null && d.sumR < 0).length : summary.redDays;
  // Flat days, and mixed-currency days with as many wins as losses, are neither green nor red; naming them keeps the counts adding up.
  const even = byR ? traded.filter((d) => d.sumR === 0).length : summary.tradingDays - green - red;
  return (
    <div className={DOT_WRAP}>
      <p role="group" className={`${DOT_LINE} text-13`} aria-label="Summary">
        <span className={`${DOT_ITEM} flex items-baseline gap-x-2`}>
          <span className="text-muted-foreground">Net</span>
          {summary.byCurrency.length ? summary.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />) : <span>—</span>}
        </span>
        <span className={`${DOT_ITEM} text-muted-foreground`}>{plural(summary.tradingDays, 'trading day')}</span>
        <span className={`${DOT_ITEM} text-muted-foreground`}>
          {green} green / {red} red{even > 0 ? ` / ${even} even` : ''}
        </span>
        {byR && summary.withoutR > 0 && <span className={`${DOT_ITEM} text-muted-foreground`}>{summary.withoutR} without R</span>}
        {best && bestDate && <span className={`${DOT_ITEM} text-muted-foreground`}>Best {format(bestDate, dayFormat)} <Money value={best.net} currency={currency} /></span>}
        {worst && worstDate && <span className={`${DOT_ITEM} text-muted-foreground`}>Worst {format(worstDate, dayFormat)} <Money value={worst.net} currency={currency} /></span>}
      </p>
    </div>
  );
}
