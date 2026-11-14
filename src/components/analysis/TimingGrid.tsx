import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { tintClass, tintStep } from '@/lib/calendar';
import { formatCompactMoney, formatMoney, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TimingGrid as Grid } from '@/lib/analyticsRows';
import { MIN_VERDICT_TRADES } from '@/lib/evidence';
import { tradesHref } from './drill';

/**
 * Weekday × hour: net printed in each cell, trade count and win rate in the accessible name; arrow keys move between
 * cells. Cells under 30 trades are greyed, never tinted (report §3.3 rule 4: two-way grids are for exploring only).
 */
export function TimingGrid({ grid, currency, zone }: { grid: Grid; currency?: string; zone: string }) {
  const refs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [active, setActive] = useState<[number, number]>([0, 0]);
  const maxAbs = Math.max(0, ...grid.rows.flatMap((r) => Object.values(r.cells).filter((c) => (c?.trades ?? 0) >= MIN_VERDICT_TRADES).map((c) => Math.abs(c?.net ?? 0))));
  const cells = grid.rows.flatMap((r) => Object.values(r.cells)).filter(Boolean).length;
  const small = grid.rows.flatMap((r) => Object.values(r.cells)).filter((c) => c && c.trades < MIN_VERDICT_TRADES).length;

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
                const grey = cell.trades < MIN_VERDICT_TRADES;
                const shown = formatCompactMoney(cell.net, { currency, symbol: false });
                const name = `${row.day} ${String(h).padStart(2, '0')}:00, net ${formatMoney(cell.net, currency, { sign: true })}, ${cell.trades} ${cell.trades === 1 ? 'trade' : 'trades'}, win rate ${formatPercent(cell.winRate, 0)}${grey ? ', too few trades to tell' : ''}`;
                return (
                  <td key={h} className="p-0">
                    <Link
                      ref={(el) => {
                        if (el) refs.current.set(`${r}-${c}`, el);
                      }}
                      to={tradesHref('weekday', row.day, { hour: String(h), zone })}
                      tabIndex={active[0] === r && active[1] === c ? 0 : -1}
                      onFocus={() => setActive([r, c])}
                      onKeyDown={(e) => move(e, r, c)}
                      title={name}
                      className={cn('flex h-8 w-11 items-center justify-center rounded-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', grey ? 'bg-muted/50 text-muted-foreground' : cn('text-foreground-soft', tintClass(cell.net, tintStep(cell.net, maxAbs))))}
                    >
                      {/* The name starts with the printed figure (WCAG 2.5.3, label in name); the rest is read out only. */}
                      {shown}
                      <span className="sr-only">, {name}</span>
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Times in {zone}. {small === 0 ? `Every cell has ${MIN_VERDICT_TRADES} or more trades.` : `${small === cells ? `All ${cells}` : `${small} of ${cells}`} cells have under ${MIN_VERDICT_TRADES} trades and are greyed: at that size a cell's result is mostly noise.`}
      </p>
    </div>
  );
}
