import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { Money } from '@/components/ui/money';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { buildMonth, gridRange, monthKey, tintStep, type DayCell } from '@/lib/calendar';
import { formatCompactMoney, formatMoney, parseLocalDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TradingAccount } from '@/types/trade';

interface MonthHeatProps {
  accountId?: string;
  accounts: Map<string, TradingAccount>;
  /** The month containing this date (the end of the period shown, never after today). */
  anchor: Date;
}

const DAY_HEAD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const TINT = {
  profit: ['bg-[hsl(var(--tint-profit-1))]', 'bg-[hsl(var(--tint-profit-2))]', 'bg-[hsl(var(--tint-profit-3))]'],
  loss: ['bg-[hsl(var(--tint-loss-1))]', 'bg-[hsl(var(--tint-loss-2))]', 'bg-[hsl(var(--tint-loss-3))]'],
} as const;

function tintClass(net: number, step: 0 | 1 | 2 | 3): string {
  if (step === 0) return 'bg-muted/40';
  return TINT[net >= 0 ? 'profit' : 'loss'][step - 1];
}

function cellName(day: DayCell, currency: string | undefined): string {
  const date = format(day.date, 'EEEE d MMMM');
  if (day.trades.length === 0) return `${date}, no trades`;
  const nets = day.byCurrency.map((c) => formatMoney(c.net, c.currency, { sign: true })).join(' and ');
  return `${date}, net ${nets || formatMoney(0, currency)}, ${day.trades.length} ${day.trades.length === 1 ? 'trade' : 'trades'}`;
}

/** The month at a glance: a day cell per day, tinted by net P&L, each a link to that day in Calendar (F-130). */
export function MonthHeat({ accountId, accounts, anchor }: MonthHeatProps) {
  const month = useMemo(() => startOfMonth(anchor), [anchor]);
  const { trades, isLoading, isError } = useScopeTrades({ accountId, ...gridRange(month) });
  const model = useMemo(() => buildMonth(trades, month, accounts), [trades, month, accounts]);
  const maxAbs = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of model.weeks) for (const d of w.days) if (d.inMonth) for (const c of d.byCurrency) m.set(c.currency, Math.max(m.get(c.currency) ?? 0, Math.abs(c.net)));
    return m;
  }, [model]);

  return (
    <Panel
      title={format(month, 'MMMM')}
      actions={
        <span className="flex items-center gap-3 text-xs">
          {!isLoading && !isError && model.byCurrency.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />)}
        </span>
      }
    >
      {isError ? (
        <p className="text-sm text-muted-foreground">Could not load this month.</p>
      ) : isLoading ? (
        <Skeleton className="h-28" aria-busy="true" />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden="true">
            {DAY_HEAD.map((d) => <span key={d}>{d}</span>)}
          </div>
          <ul className="mt-1 grid grid-cols-7 gap-1">
            {model.weeks.flatMap((w) => w.days).map((day) => {
              if (!day.inMonth) return <li key={day.key} aria-hidden="true" />;
              const single = day.byCurrency.length === 1 ? day.byCurrency[0] : undefined;
              const net = single?.net ?? 0;
              const step = single ? tintStep(net, maxAbs.get(single.currency) ?? 0) : day.trades.length ? 1 : 0;
              const compact = day.byCurrency.length === 1 ? formatCompactMoney(net) : String(day.trades.length);
              return (
                <li key={day.key}>
                  <Link
                    to={`/app/calendar?month=${monthKey(month)}&day=${day.key}`}
                    aria-label={cellName(day, undefined)}
                    title={cellName(day, undefined)}
                    className={cn(
                      'group flex h-8 items-center justify-center rounded-sm font-mono text-xs tabular-nums text-foreground-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      single || day.trades.length === 0 ? tintClass(net, step) : 'bg-muted',
                    )}
                  >
                    <span className={day.trades.length ? 'group-hover:hidden group-focus-visible:hidden' : ''}>{parseLocalDate(day.key).getDate()}</span>
                    {day.trades.length > 0 && <span className="hidden group-hover:inline group-focus-visible:inline">{compact}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link to={`/app/calendar?month=${monthKey(month)}`} className="mt-3 inline-block text-xs text-primary hover:underline">Open calendar →</Link>
        </>
      )}
    </Panel>
  );
}
