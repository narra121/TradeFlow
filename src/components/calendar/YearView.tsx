import { useMemo } from 'react';
import { format } from 'date-fns';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { Money } from '@/components/ui/money';
import { Skeleton } from '@/components/ui/skeleton';
import { cellName, compactMoney } from '@/components/calendar/cellText';
import { dayMetric, metricScale, metricTint, type CalendarMetric, type MonthModel, type Tint } from '@/lib/calendar';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface YearMonth {
  key: string;
  date: Date;
  model: MonthModel;
}

const TINT: Record<Tint['tone'], string[]> = {
  profit: ['', 'bg-tint-profit-1', 'bg-tint-profit-2', 'bg-tint-profit-3'],
  loss: ['', 'bg-tint-loss-1', 'bg-tint-loss-2', 'bg-tint-loss-3'],
  neutral: ['', 'bg-foreground-soft/10', 'bg-foreground-soft/20', 'bg-foreground-soft/30'],
};

interface YearViewProps {
  months: YearMonth[];
  year: number;
  metric: CalendarMetric;
  loading: boolean;
  capped: boolean;
  onOpenMonth: (key: string) => void;
  onOpenDay: (key: string) => void;
}

function MiniMonth({ m, metric, scale, onOpenMonth, onOpenDay }: { m: YearMonth; metric: CalendarMetric; scale: number; onOpenMonth: (key: string) => void; onOpenDay: (key: string) => void }) {
  const days = useMemo(() => m.model.weeks.flatMap((w) => w.days).filter((d) => d.inMonth), [m.model]);
  const offset = (days[0].date.getDay() + 6) % 7;
  const name = format(m.date, 'MMMM yyyy');
  return (
    <section aria-label={name} className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <button type="button" onClick={() => onOpenMonth(m.key)} className="text-13 font-medium hover:underline focus-visible:underline focus-visible:outline-none" aria-label={`${name}, ${m.model.tradeCount} trades. Open the month`}>
          {format(m.date, 'MMMM')}
        </button>
        <span className="flex gap-1.5 font-mono text-2xs tabular-nums">
          {m.model.byCurrency.map((c) => <span key={c.currency} className={c.net > 0 ? 'text-profit' : c.net < 0 ? 'text-loss' : 'text-foreground-soft'}>{compactMoney(c.net, c.currency)}</span>)}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(7,18px)] gap-1" role="group" aria-label={`Days of ${name}`}>
        {Array.from({ length: offset }, (_, i) => <span key={`s${i}`} aria-hidden="true" />)}
        {days.map((d) => {
          const tint = metricTint(dayMetric(d, metric), metric, scale);
          return (
            <button
              key={d.key}
              type="button"
              tabIndex={-1}
              onClick={() => onOpenDay(d.key)}
              aria-label={cellName(d, false)}
              title={cellName(d, false)}
              className={cn('h-[18px] w-[18px] rounded-sm border border-border/60 hover:brightness-150', d.trades.length ? TINT[tint.tone][tint.step] || 'bg-secondary' : 'bg-transparent')}
            />
          );
        })}
      </div>
    </section>
  );
}

/**
 * Year view: twelve mini months as a heat map, and a table with the exact figures next to them (a heat map needs printed
 * values). A month is one tab stop; a day square opens that day.
 */
export function YearView({ months, year, metric, loading, capped, onOpenMonth, onOpenDay }: YearViewProps) {
  const scale = useMemo(() => Math.max(0, ...months.map((m) => metricScale(m.model, metric))), [months, metric]);
  if (loading) return <Skeleton className="h-64 w-full" aria-busy="true" />;

  const columns: DataColumn<YearMonth>[] = [
    { id: 'month', header: 'Month', cell: (m) => <button type="button" onClick={() => onOpenMonth(m.key)} className="hover:underline focus-visible:underline focus-visible:outline-none">{format(m.date, 'MMMM')}</button> },
    { id: 'net', header: 'Net', align: 'right', cell: (m) => (m.model.byCurrency.length ? <span className="flex flex-col items-end">{m.model.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />)}</span> : <span className="text-muted-foreground">—</span>) },
    { id: 'days', header: 'Days', align: 'right', hideBelow: 'sm', cell: (m) => <span className="font-mono tabular-nums">{m.model.tradingDays || '—'}</span> },
    {
      id: 'green',
      header: 'Green',
      align: 'right',
      hideBelow: 'sm',
      cell: (m) => (m.model.tradingDays ? <span className="font-mono tabular-nums">{m.model.greenDays} · {formatPercent((m.model.greenDays / m.model.tradingDays) * 100, 0)}</span> : <span className="text-muted-foreground">—</span>),
    },
    { id: 'best', header: 'Best', align: 'right', hideBelow: 'md', cell: (m) => (m.model.best && m.model.best.net > 0 ? <Money value={m.model.best.net} currency={m.model.byCurrency[0]?.currency} /> : <span className="text-muted-foreground">—</span>) },
    { id: 'worst', header: 'Worst', align: 'right', hideBelow: 'md', cell: (m) => (m.model.worst && m.model.worst.net < 0 ? <Money value={m.model.worst.net} currency={m.model.byCurrency[0]?.currency} /> : <span className="text-muted-foreground">—</span>) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={`Months of ${year}`}>
        {months.map((m) => <MiniMonth key={m.key} m={m} metric={metric} scale={scale} onOpenMonth={onOpenMonth} onOpenDay={onOpenDay} />)}
      </div>
      <DataTable caption={`Months of ${year}`} rows={months} columns={columns} getRowId={(m) => m.key} onRowOpen={(m) => onOpenMonth(m.key)} />
      {capped && <p className="text-xs text-muted-foreground">Showing the newest 5,000 trades. Narrow the account to see older ones.</p>}
    </div>
  );
}
