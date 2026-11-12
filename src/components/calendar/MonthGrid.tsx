import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { PencilLine } from 'lucide-react';
import { dayMetric, isoWeek, metricScale, metricTint, type CalendarMetric, type MonthModel, type Tint, type WeekRow } from '@/lib/calendar';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { cellName, compactMoney, metricText } from '@/components/calendar/cellText';
import { plural, winLoss } from '@/components/calendar/dayText';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TINT_CLASS: Record<Tint['tone'], string[]> = {
  profit: ['', 'bg-tint-profit-1', 'bg-tint-profit-2', 'bg-tint-profit-3'],
  loss: ['', 'bg-tint-loss-1', 'bg-tint-loss-2', 'bg-tint-loss-3'],
  neutral: ['', 'bg-foreground-soft/10', 'bg-foreground-soft/20', 'bg-foreground-soft/30'],
};

interface MonthGridProps {
  model: MonthModel;
  metric: CalendarMetric;
  month: Date;
  openKey: string | null;
  openWeek: string | null;
  noteDays: ReadonlySet<string>;
  todayKey: string;
  onOpenDay: (key: string) => void;
  onOpenWeek: (mondayKey: string) => void;
  /** `dom` is the day of the month the cursor was on, so focus can come back to it in the new month. */
  onPageMonth: (delta: -1 | 1, dom: number) => void;
}

/** Month grid: Monday start, button cells with roving focus, a week column, three tint steps by the month's largest day. */
export function MonthGrid({ model, metric, month, openKey, openWeek, noteDays, todayKey, onOpenDay, onOpenWeek, onPageMonth }: MonthGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => model.weeks.flatMap((w) => w.days).filter((d) => d.inMonth), [model]);
  const scale = useMemo(() => metricScale(model, metric), [model, metric]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const tabbable = focusKey && days.some((d) => d.key === focusKey) ? focusKey : days.find((d) => d.key === todayKey)?.key ?? openKey ?? days[0]?.key;

  useEffect(() => {
    if (focusKey && !days.some((d) => d.key === focusKey)) setFocusKey(null);
  }, [days, focusKey]);

  const focusCell = (key: string | undefined) => {
    if (!key) return;
    setFocusKey(key);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${key}"]`)?.focus();
  };

  const onKey = (e: React.KeyboardEvent, key: string) => {
    const i = days.findIndex((d) => d.key === key);
    const go = (n: number) => { e.preventDefault(); focusCell(days[Math.min(days.length - 1, Math.max(0, i + n))]?.key); };
    switch (e.key) {
      case 'ArrowRight': return go(1);
      case 'ArrowLeft': return go(-1);
      case 'ArrowDown': return go(7);
      case 'ArrowUp': return go(-7);
      case 'Home': { const dow = (days[i].date.getDay() + 6) % 7; return go(-dow); }
      case 'End': { const dow = (days[i].date.getDay() + 6) % 7; return go(6 - dow); }
      case 'PageDown': e.preventDefault(); return onPageMonth(1, days[i].date.getDate());
      case 'PageUp': e.preventDefault(); return onPageMonth(-1, days[i].date.getDate());
    }
  };

  const weekCell = (w: WeekRow) => {
    const monday = w.days[0];
    const n = isoWeek(monday.date);
    const open = openWeek === monday.key;
    const net = w.byCurrency.map((c) => compactMoney(c.net, c.currency));
    const name = `Week ${n}, ${plural(w.count, 'trade')}${w.byCurrency.length ? `, net ${w.byCurrency.map((c) => formatMoney(c.net, c.currency, { sign: true })).join(' and ')}` : ''}`;
    return (
      <div role="gridcell" className="border-b border-border max-md:hidden">
        <button
          type="button"
          aria-pressed={open}
          disabled={w.count === 0}
          onClick={() => onOpenWeek(monday.key)}
          className={cn('flex h-full min-h-[88px] w-full flex-col justify-center gap-0.5 px-3 text-right text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:hover:bg-transparent', open && 'bg-secondary')}
        >
          <span className="sr-only">{name}</span>
          <span aria-hidden="true" className="contents">
          <span className="text-2xs text-muted-foreground">W{n}</span>
          {w.count > 0 ? (
            <>
              {net.map((t, i) => <span key={i} className={cn('font-mono text-13 font-medium tabular-nums', w.byCurrency[i].net > 0 ? 'text-profit' : w.byCurrency[i].net < 0 ? 'text-loss' : 'text-foreground-soft')}>{t}</span>)}
              <span className="text-2xs text-muted-foreground">{w.count} · {winLoss(w.wins, w.losses)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div ref={gridRef} role="grid" aria-label={`Calendar, ${format(month, 'MMMM yyyy')}`} aria-rowcount={model.weeks.length + 1} className="overflow-hidden rounded-lg border border-border bg-card">
      <div role="row" className="grid grid-cols-[repeat(7,minmax(0,1fr))_104px] border-b border-border text-xs text-muted-foreground max-md:grid-cols-7">
        {WEEKDAYS.map((w) => <div key={w} role="columnheader" className="px-2 py-1.5 text-center max-md:px-0.5">{w}</div>)}
        <div role="columnheader" className="px-2 py-1.5 text-center max-md:hidden">Week</div>
      </div>
      {model.weeks.map((w, wi) => (
        <div key={wi} role="row" className="grid grid-cols-[repeat(7,minmax(0,1fr))_104px] max-md:grid-cols-7">
          {w.days.map((d) => {
            if (!d.inMonth) {
              return (
                <div key={d.key} role="gridcell" aria-hidden="true" className="min-h-16 border-b border-r border-border p-2 text-xs text-muted-foreground md:min-h-[88px] max-md:p-1">
                  {d.date.getDate()}
                </div>
              );
            }
            const value = dayMetric(d, metric);
            const tint = metricTint(value, metric, scale);
            const text = metricText(d, metric);
            const isToday = d.key === todayKey;
            const hasNote = noteDays.has(d.key);
            const selected = openKey === d.key;
            // On a tint the figure is plain foreground: the sign and the tint carry the direction, and coloured text on the strongest steps fails 4.5:1.
            const tinted = tint.step > 0;
            const toneText = tinted || tint.tone === 'neutral' ? 'text-foreground' : tint.tone === 'profit' ? 'text-profit' : 'text-loss';
            return (
              <button
                key={d.key}
                type="button"
                role="gridcell"
                data-day={d.key}
                tabIndex={d.key === tabbable ? 0 : -1}
                aria-current={isToday ? 'date' : undefined}
                aria-selected={selected}
                onFocus={() => setFocusKey(d.key)}
                onClick={() => onOpenDay(d.key)}
                onKeyDown={(e) => onKey(e, d.key)}
                className={cn(
                  'relative flex min-h-16 flex-col items-stretch gap-0.5 border-b border-r border-border p-2 text-left outline-none hover:brightness-125 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-[88px] max-md:p-1',
                  TINT_CLASS[tint.tone][tint.step],
                  selected && 'ring-2 ring-inset ring-primary',
                )}
              >
                {/* The name is the full text; the printed figures are hidden from it so the visible text never has to match a label. */}
                <span className="sr-only">{cellName(d, hasNote)}</span>
                <span aria-hidden="true" className="contents">
                <span className="flex items-center justify-between gap-1 text-xs">
                  <span className={cn('font-medium', isToday ? 'rounded-full border border-primary px-1.5 text-primary' : 'text-foreground-soft')}>{d.date.getDate()}</span>
                  <span className="flex items-center gap-1 text-warning">
                    {hasNote && <PencilLine className="h-3 w-3 text-foreground-soft" aria-hidden="true" />}
                    {d.ruleBreaks > 0 && <span className="font-semibold" aria-hidden="true">!</span>}
                  </span>
                </span>
                {d.trades.length > 0 && (
                  <>
                    {metric === 'pnl' && d.byCurrency.length > 1 ? (
                      d.byCurrency.map((c) => <span key={c.currency} className={cn('truncate font-mono text-2xs font-medium tabular-nums md:text-xs', tinted ? 'text-foreground' : c.net > 0 ? 'text-profit' : c.net < 0 ? 'text-loss' : 'text-foreground-soft')}>{compactMoney(c.net, c.currency)}</span>)
                    ) : (
                      <span className={cn('truncate font-mono text-2xs font-medium tabular-nums md:text-13', toneText)}>{text ?? '—'}</span>
                    )}
                    <span className="flex flex-col text-2xs leading-4 text-foreground-soft max-md:hidden">
                      <span className="truncate">{d.trades.length} {d.trades.length === 1 ? 'trade' : 'trades'}</span>
                      <span className="truncate">{winLoss(d.wins, d.losses)}</span>
                    </span>
                  </>
                )}
                </span>
              </button>
            );
          })}
          {weekCell(w)}
        </div>
      ))}
    </div>
  );
}
