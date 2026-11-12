import { format } from 'date-fns';
import { Money } from '@/components/ui/money';
import { plural } from '@/components/calendar/dayText';
import type { CalendarMetric, DayCell, DaysSummary } from '@/lib/calendar';

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
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-13" aria-label="Summary">
      <span className="text-muted-foreground">Net</span>
      {summary.byCurrency.length ? summary.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />) : <span>—</span>}
      <span className="text-muted-foreground">
        · {plural(summary.tradingDays, 'trading day')} · {summary.greenDays} green / {summary.redDays} red
        {metric === 'r' && summary.withoutR > 0 ? ` · ${summary.withoutR} without R` : ''}
      </span>
      {best && bestDate && <span className="text-muted-foreground">· Best {format(bestDate, 'EEE d')} <Money value={best.net} currency={currency} /></span>}
      {worst && worstDate && <span className="text-muted-foreground">· Worst {format(worstDate, 'EEE d')} <Money value={worst.net} currency={currency} /></span>}
    </p>
  );
}
