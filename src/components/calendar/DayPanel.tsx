import { forwardRef, useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money, RMultiple } from '@/components/ui/money';
import { Skeleton } from '@/components/ui/skeleton';
import { PaneFrame } from '@/components/calendar/SidePane';
import { DayNote } from '@/components/calendar/DayNote';
import { hoursOpen, netText, plural, winLoss } from '@/components/calendar/dayText';
import { realisedR } from '@/lib/tradeFilters';
import { formatMoney, formatPercent, formatR, formatTime } from '@/lib/format';
import type { DayCell, WeekRow } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import type { DayNote as DayNoteData, DayNotesArgs } from '@/store/api/journalApi';
import type { Trade, TradingAccount } from '@/types/trade';

/** Trades in the order the panel lists them (close time); the pane walks the same order. */
export function sortByTime(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());
}

function Timeline({ trades }: { trades: Trade[] }) {
  const counts = useMemo(() => {
    const c = Array.from({ length: 24 }, () => 0);
    for (const t of trades) for (const h of hoursOpen(t)) c[h] += 1;
    return c;
  }, [trades]);
  const max = Math.max(1, ...counts);
  const busy = counts.map((n, h) => (n ? `${String(h).padStart(2, '0')}:00 (${n})` : null)).filter(Boolean);
  return (
    <figure className="space-y-1 px-3 pt-3">
      <div className="flex h-8 items-end gap-px" role="img" aria-label={busy.length ? `Trades open by hour: ${busy.join(', ')}` : 'No trades by hour'}>
        {counts.map((n, h) => (
          <span key={h} className={cn('flex-1 rounded-sm', n ? 'bg-foreground-soft' : 'bg-border')} style={{ height: n ? `${Math.max(25, (n / max) * 100)}%` : '8%' }} />
        ))}
      </div>
      <figcaption className="flex justify-between text-2xs text-muted-foreground" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24 h</span>
      </figcaption>
    </figure>
  );
}

function TradeRow({ t, currency, onOpen, showDate }: { t: Trade; currency?: string; onOpen: (id: string) => void; showDate?: boolean }) {
  const r = realisedR(t);
  const when = t.exitDate || t.entryDate;
  const broken = (t.brokenRuleIds?.length ?? 0) > 0;
  const shown = showDate ? format(new Date(when), 'd MMM') : formatTime(when);
  // The name starts with the row's visible text, in its order (WCAG 2.5.3), then the weekday.
  const name = [shown, t.symbol, t.direction === 'LONG' ? 'Long' : 'Short', broken ? '! rule broken' : null, formatMoney(t.pnl, currency, { sign: true }), formatR(r)].filter(Boolean).join(' ') + `, ${format(new Date(when), 'EEEE')}`;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(t.id)}
        aria-label={name}
        className="flex min-h-11 w-full items-center gap-2 border-b border-border px-3 text-left text-13 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{shown}</span>
        <span className="min-w-0 truncate font-medium">{t.symbol}</span>
        <span className="shrink-0 text-xs text-foreground-soft">{t.direction === 'LONG' ? '↑ Long' : '↓ Short'}</span>
        {broken && <span className="shrink-0 text-xs text-warning" title="A rule was broken">! rule broken</span>}
        <span className="ml-auto shrink-0 text-right"><Money value={t.pnl} currency={currency} /></span>
        <span className="w-14 shrink-0 text-right"><RMultiple value={r} /></span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}

interface DayPanelProps {
  day: DayCell;
  accountMap: Map<string, TradingAccount>;
  scope: string;
  note?: DayNoteData;
  notesRange?: DayNotesArgs;
  notesSupported: boolean;
  /** The month's notes have arrived; the editor starts from them, so it waits. */
  notesReady: boolean;
  onStepDay: (delta: -1 | 1) => void;
  onClose: () => void;
  onOpenTrade: (id: string) => void;
  onAddTrade: () => void;
  onOpenInTrades: () => void;
}

/** The day level of the pane: figures, a 24 h strip, the day's trades, the day note, and the two next steps. */
export const DayPanel = forwardRef<HTMLHeadingElement, DayPanelProps>(function DayPanel(
  { day, accountMap, scope, note, notesRange, notesSupported, notesReady, onStepDay, onClose, onOpenTrade, onAddTrade, onOpenInTrades },
  headingRef,
) {
  const trades = useMemo(() => sortByTime(day.trades), [day.trades]);
  const winPct = day.trades.length ? (day.wins / day.trades.length) * 100 : null;
  return (
    <PaneFrame
      ref={headingRef}
      title={format(day.date, 'EEE d MMM yyyy')}
      closeLabel="Close day"
      onClose={onClose}
      leading={
        <>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onStepDay(-1)} aria-label="Previous day" className="[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onStepDay(1)} aria-label="Next day" className="[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
        </>
      }
      footer={
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onAddTrade} className="[@media(pointer:coarse)]:h-11"><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Add trade on this day</Button>
          <Button type="button" variant="ghost" onClick={onOpenInTrades} className="[@media(pointer:coarse)]:h-11">Open in Trades</Button>
        </div>
      }
    >
      <div className="px-3 pt-3 text-13" aria-live="polite">
        {day.trades.length ? (
          <p className="flex flex-wrap items-center gap-x-2">
            {day.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />)}
            <span className="text-muted-foreground">· {plural(day.trades.length, 'trade')} · {winLoss(day.wins, day.losses)}{winPct !== null ? ` · ${formatPercent(winPct, 0)}` : ''}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">No trades on this day.</p>
        )}
      </div>
      {day.trades.length > 0 && <Timeline trades={day.trades} />}
      {trades.length > 0 && (
        <ul className="mt-3 border-t border-border" aria-label={`Trades on ${format(day.date, 'd MMMM')}`}>
          {trades.map((t) => <TradeRow key={t.id} t={t} currency={t.accountId ? accountMap.get(t.accountId)?.currency : undefined} onOpen={onOpenTrade} />)}
        </ul>
      )}
      {notesSupported && notesRange && (notesReady ? <DayNote key={`${day.key}-${scope}`} date={day.key} scope={scope} note={note} range={notesRange} /> : <Skeleton className="m-3 h-48" aria-busy="true" />)}
    </PaneFrame>
  );
});

interface WeekPanelProps {
  week: WeekRow;
  weekNumber: number;
  accountMap: Map<string, TradingAccount>;
  onClose: () => void;
  onOpenTrade: (id: string) => void;
  onOpenDay: (key: string) => void;
}

/** The week cell's pane: that week's trades grouped by day. */
export const WeekPanel = forwardRef<HTMLHeadingElement, WeekPanelProps>(function WeekPanel({ week, weekNumber, accountMap, onClose, onOpenTrade, onOpenDay }, headingRef) {
  const first = week.days[0].date;
  const last = addDays(first, 6);
  const days = week.days.filter((d) => d.trades.length > 0);
  const winPct = week.count ? (week.wins / week.count) * 100 : null;
  return (
    <PaneFrame ref={headingRef} title={`Week ${weekNumber} · ${format(first, 'd MMM')} – ${format(last, 'd MMM yyyy')}`} closeLabel="Close week" onClose={onClose}>
      <p className="flex flex-wrap items-center gap-x-2 px-3 pt-3 text-13">
        {week.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />)}
        <span className="text-muted-foreground">· {plural(week.count, 'trade')} · {winLoss(week.wins, week.losses)}{winPct !== null ? ` · ${formatPercent(winPct, 0)}` : ''}</span>
      </p>
      {days.length === 0 && <p className="px-3 pt-3 text-13 text-muted-foreground">No trades this week.</p>}
      {days.map((d) => (
        <section key={d.key} className="mt-3" aria-label={format(d.date, 'EEEE d MMMM')}>
          <div className="flex items-center justify-between bg-muted/40 px-3 py-1 text-xs">
            <button type="button" onClick={() => onOpenDay(d.key)} className="font-medium text-foreground-soft hover:text-foreground hover:underline">{format(d.date, 'EEE d MMM')}</button>
            <span className="font-mono tabular-nums text-muted-foreground">{netText(d.byCurrency)}</span>
          </div>
          <ul>
            {sortByTime(d.trades).map((t) => <TradeRow key={t.id} t={t} currency={t.accountId ? accountMap.get(t.accountId)?.currency : undefined} onOpen={onOpenTrade} />)}
          </ul>
        </section>
      ))}
    </PaneFrame>
  );
});
