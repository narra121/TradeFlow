import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Money } from '@/components/ui/money';
import { axisRange, layoutDay, lossExits, tradeSpan, type TimelineBlock } from '@/components/calendar/timeline';
import { plural, winLoss } from '@/components/calendar/dayText';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DayCell, WeekRow } from '@/lib/calendar';
import type { TradingAccount } from '@/types/trade';

const PX_PER_MIN = 0.7;
const MIN_BLOCK = 24;
const hhmm = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

interface WeekTimelineProps {
  week: WeekRow;
  accountMap: Map<string, TradingAccount>;
  openKey: string | null;
  todayKey: string;
  isMobile: boolean;
  onOpenDay: (key: string) => void;
  onOpenTrade: (id: string) => void;
}

function blockName(b: TimelineBlock, day: DayCell, currency?: string): string {
  const t = b.trade;
  return [
    `${format(day.date, 'EEEE')} ${hhmm(b.start)} to ${hhmm(b.end)}`,
    `${t.symbol} ${t.direction === 'LONG' ? 'long' : 'short'}`,
    formatMoney(t.pnl, currency, { sign: true }),
    t.brokenRuleIds?.length ? 'rule broken' : null,
    b.afterLoss !== null ? `opened ${plural(b.afterLoss, 'minute')} after a loss` : null,
  ].filter(Boolean).join(', ');
}

/**
 * Week as a day timeline: one column per day against a time-of-day axis, each trade a block from entry to exit.
 * It shows clustering, session habits and trades opened soon after a loss. Weekend columns appear only with trades;
 * on phones one day shows at a time.
 */
export function WeekTimeline({ week, accountMap, openKey, todayKey, isMobile, onOpenDay, onOpenTrade }: WeekTimelineProps) {
  const weekTrades = useMemo(() => week.days.flatMap((d) => d.trades), [week]);
  const range = useMemo(() => axisRange(weekTrades), [weekTrades]);
  const losses = useMemo(() => lossExits(weekTrades), [weekTrades]);
  const shown = useMemo(() => week.days.filter((d, i) => i < 5 || d.trades.length > 0), [week]);
  const [picked, setPicked] = useState<string | null>(null);
  const fallback = shown.find((d) => d.key === todayKey) ?? shown.find((d) => d.trades.length > 0) ?? shown[0];
  const active = shown.find((d) => d.key === picked) ?? fallback;
  const columns = useMemo(() => (isMobile ? [active] : shown), [isMobile, active, shown]);
  const height = (range.to - range.from) * PX_PER_MIN;
  // The axis can span a night (a trade carried over from the previous day), so the box scrolls and opens at the first trade of the visible days.
  const scroller = useRef<HTMLDivElement>(null);
  const firstStart = useMemo(() => Math.min(...columns.flatMap((d) => d.trades).map((t) => tradeSpan(t)?.start ?? range.to), range.to), [columns, range.to]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, (firstStart - range.from) * PX_PER_MIN - 32);
  }, [firstStart, range.from]);
  const hours = Array.from({ length: (range.to - range.from) / 60 + 1 }, (_, i) => range.from + i * 60);

  return (
    <div className="space-y-2">
      {isMobile && (
        <ul className="flex gap-1" aria-label="Days of the week">
          {shown.map((d) => (
            <li key={d.key} className="flex-1">
              <button
                type="button"
                onClick={() => setPicked(d.key)}
                aria-pressed={d.key === active.key}
                aria-label={format(d.date, 'EEEE d MMMM')}
                className={cn('flex h-11 w-full flex-col items-center justify-center rounded-md border border-border text-xs', d.key === active.key ? 'bg-secondary text-foreground' : 'text-muted-foreground')}
              >
                <span>{format(d.date, 'EEEEE')}</span>
                <span className="font-mono">{d.date.getDate()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={scroller} className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-card">
        <div className="grid min-w-[320px]" style={{ gridTemplateColumns: `44px repeat(${columns.length}, minmax(0, 1fr))` }}>
          <div className="sticky top-0 z-10 border-b border-border bg-card" />
          {columns.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => onOpenDay(d.key)}
              aria-current={d.key === todayKey ? 'date' : undefined}
              className={cn('sticky top-0 z-10 h-8 border-b border-l border-border bg-card text-center text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', openKey === d.key && 'bg-secondary', d.key === todayKey ? 'text-primary' : 'text-foreground-soft')}
            >
              {format(d.date, 'EEE d')}
            </button>
          ))}

          <div className="relative border-t border-border" style={{ height }} aria-hidden="true">
            {hours.map((m) => (
              <span key={m} className="absolute right-1.5 -translate-y-1/2 font-mono text-2xs text-muted-foreground" style={{ top: (m - range.from) * PX_PER_MIN }}>
                {hhmm(m).slice(0, 2)}
              </span>
            ))}
          </div>
          {columns.map((d) => {
            const blocks = layoutDay(d.trades, losses, d.key);
            return (
              <div key={d.key} role="group" aria-label={`${format(d.date, 'EEEE d MMMM')}, ${plural(d.trades.length, 'trade')}`} className="relative border-l border-t border-border" style={{ height }}>
                {hours.map((m) => <span key={m} aria-hidden="true" className="absolute inset-x-0 border-t border-border/50" style={{ top: (m - range.from) * PX_PER_MIN }} />)}
                {blocks.map((b) => {
                  const currency = b.trade.accountId ? accountMap.get(b.trade.accountId)?.currency : undefined;
                  const h = Math.max(MIN_BLOCK, (b.end - b.start) * PX_PER_MIN);
                  return (
                    <button
                      key={b.trade.id}
                      type="button"
                      onClick={() => onOpenTrade(b.trade.id)}
                      aria-label={blockName(b, d, currency)}
                      className={cn(
                        'absolute overflow-hidden rounded-sm border-l-2 px-1 text-left text-2xs leading-4 text-foreground hover:brightness-125 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        b.trade.pnl > 0 ? 'border-profit bg-tint-profit-2' : b.trade.pnl < 0 ? 'border-loss bg-tint-loss-2' : 'border-border-strong bg-secondary',
                      )}
                      style={{ top: (b.start - range.from) * PX_PER_MIN, height: h - 1, left: `calc(${(b.lane / b.lanes) * 100}% + 1px)`, width: `calc(${100 / b.lanes}% - 2px)` }}
                    >
                      <span className="flex items-center gap-1 truncate">
                        <span className="truncate font-medium">{b.trade.symbol}</span>
                        <span aria-hidden="true">{b.trade.direction === 'LONG' ? '↑' : '↓'}</span>
                        {b.trade.brokenRuleIds?.length ? <span className="font-semibold text-warning" aria-hidden="true">!</span> : null}
                      </span>
                      {h >= 40 && <span className="block truncate font-mono">{formatMoney(b.trade.pnl, currency, { sign: true })}</span>}
                      {b.afterLoss !== null && h >= 56 && <span className="block truncate text-muted-foreground">↻ {b.afterLoss} min after a loss</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="flex items-center justify-end border-t border-border pr-1.5 text-2xs text-muted-foreground">Net</div>
          {columns.map((d) => (
            <div key={d.key} className="flex min-h-8 flex-col items-center justify-center border-l border-t border-border py-1 text-xs">
              {d.byCurrency.length ? d.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />) : <span className="text-muted-foreground">—</span>}
            </div>
          ))}
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span>Week</span>
        {week.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />)}
        <span>· {week.count} · {winLoss(week.wins, week.losses)}</span>
        <span>· Block height is the time the trade was open. <span className="font-semibold text-warning">!</span> a rule was broken. ↻ opened within 15 minutes of a losing close.</span>
      </p>
    </div>
  );
}
