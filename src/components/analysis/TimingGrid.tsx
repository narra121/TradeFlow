import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { tintStep } from '@/lib/calendar';
import { formatCompactMoney, formatMoney, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TimingGrid as Grid } from '@/lib/analyticsRows';
import { tradesHref } from './drill';

const TINT = {
  profit: ['bg-[hsl(var(--tint-profit-1))]', 'bg-[hsl(var(--tint-profit-2))]', 'bg-[hsl(var(--tint-profit-3))]'],
  loss: ['bg-[hsl(var(--tint-loss-1))]', 'bg-[hsl(var(--tint-loss-2))]', 'bg-[hsl(var(--tint-loss-3))]'],
} as const;

function tint(net: number, step: 0 | 1 | 2 | 3): string {
  if (step === 0) return 'bg-muted/40';
  return TINT[net >= 0 ? 'profit' : 'loss'][step - 1];
}

/** Weekday × hour: net printed in each cell, trade count and win rate in the accessible name; arrow keys move between cells. */
export function TimingGrid({ grid, currency, zone }: { grid: Grid; currency?: string; zone: string }) {
  const refs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [active, setActive] = useState<[number, number]>([0, 0]);
  const maxAbs = Math.max(0, ...grid.rows.flatMap((r) => Object.values(r.cells).map((c) => Math.abs(c?.net ?? 0))));

  const move = (e: React.KeyboardEvent, r: number, c: number) => {
    const delta: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const nr = Math.min(grid.rows.length - 1, Math.max(0, r + d[0]));
    const nc = Math.min(grid.hours.length - 1, Math.max(0, c + d[1]));
    setActive([nr, nc]);
    refs.current.get(`${nr}-${nc}`)?.focus();
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-xs" role="grid">
        <caption className="sr-only">Net P&amp;L by weekday and hour, {zone}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-12" />
            {grid.hours.map((h) => <th key={h} scope="col" className="w-11 min-w-11 font-normal text-muted-foreground">{String(h).padStart(2, '0')}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, r) => (
            <tr key={row.day}>
              <th scope="row" className="pr-2 text-left font-normal text-muted-foreground">{row.day.slice(0, 3)}</th>
              {grid.hours.map((h, c) => {
                const cell = row.cells[h];
                if (!cell) return <td key={h} className="h-8 rounded-sm bg-muted/20" aria-label={`${row.day} ${h}:00, no trades`} />;
                const name = `${row.day} ${String(h).padStart(2, '0')}:00, net ${formatMoney(cell.net, currency, { sign: true })}, ${cell.trades} ${cell.trades === 1 ? 'trade' : 'trades'}, win rate ${formatPercent(cell.winRate, 0)}`;
                return (
                  <td key={h} className="p-0">
                    <Link
                      ref={(el) => {
                        if (el) refs.current.set(`${r}-${c}`, el);
                      }}
                      to={tradesHref('weekday', row.day, { hour: String(h) })}
                      tabIndex={active[0] === r && active[1] === c ? 0 : -1}
                      onFocus={() => setActive([r, c])}
                      onKeyDown={(e) => move(e, r, c)}
                      aria-label={name}
                      title={name}
                      className={cn('flex h-8 w-11 items-center justify-center rounded-sm font-mono tabular-nums text-foreground-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', tint(cell.net, tintStep(cell.net, maxAbs)))}
                    >
                      {formatCompactMoney(cell.net)}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Times in {zone}</p>
    </div>
  );
}
