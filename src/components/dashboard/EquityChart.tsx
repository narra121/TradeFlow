import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { calendarHref, chartSeries, type ChartPoint, type EquityPoint } from '@/lib/dashboard';
import { formatCompactMoney, formatDateShort, formatMoney, parseLocalDate } from '@/lib/format';

interface EquityChartProps {
  points: EquityPoint[];
  currency?: string;
  title?: string;
  /** Grow to the height of the parent (a grid cell next to taller panels) instead of a fixed 200 / 280 px. */
  fill?: boolean;
}

const AXIS = { fontSize: 11, fill: 'hsl(var(--chart-axis))' } as const;

function ChartTooltip({ active, payload, currency, bucket }: { active?: boolean; payload?: { payload: ChartPoint }[]; currency?: string; bucket: 'day' | 'week' }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-overlay">
      <p className="mb-1 text-muted-foreground">{bucket === 'week' ? `Week of ${p.label}` : p.label}</p>
      <p>{bucket === 'week' ? 'Week' : 'Day'} <span className="font-mono">{formatMoney(p.day, currency, { sign: true })}</span></p>
      <p>Total <span className="font-mono">{formatMoney(p.cumulative, currency, { sign: true })}</span></p>
    </div>
  );
}

/** Axis ticks in round steps (1, 2, 2.5 or 5 × 10ⁿ) that cover the values and zero; recharts' own ticks keep zero by stretching the step (550). */
export function equityTicks(values: number[], steps = 4): number[] {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  if (lo === hi) return [0];
  const raw = (hi - lo) / steps;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw - 1e-9) as number;
  const ticks: number[] = [];
  for (let i = Math.floor(lo / step); i <= Math.ceil(hi / step); i++) ticks.push(Number((i * step).toPrecision(12)));
  return ticks;
}

/**
 * Cumulative net P&L with the drawdown shaded below its running peak and the daily (weekly beyond 92 days) net as
 * bars on the same x axis. Line colour follows the sign of the last value. Arrow keys move a cursor, Enter opens
 * that day in Calendar, `View as table` is the text alternative.
 */
export function EquityChart({ points: raw, currency, title = 'Equity', fill = false }: EquityChartProps) {
  const navigate = useNavigate();
  const [asTable, setAsTable] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);

  const longRange = raw.length > 1 && parseLocalDate(raw[0].date).getFullYear() !== parseLocalDate(raw[raw.length - 1].date).getFullYear();
  const labelOf = useMemo(() => (d: string) => (longRange ? `${formatDateShort(d)} ${d.slice(2, 4)}` : formatDateShort(d)), [longRange]);
  const { points, bucket } = useMemo(() => chartSeries(raw.map((p) => ({ ...p, label: labelOf(p.date) })), labelOf), [raw, labelOf]);
  const labels = useMemo(() => new Map(points.map((p) => [p.date, p.label])), [points]);
  const ticks = useMemo(() => equityTicks(points.flatMap((p) => [p.cumulative, p.peak])), [points]);

  const last = points[points.length - 1]?.cumulative ?? 0;
  const lineColor = last >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))';
  const active = cursor !== null ? points[cursor] : null;
  const unit = bucket === 'week' ? 'week' : 'day';

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (points.length === 0) return;
    if (e.key === 'ArrowRight') setCursor((c) => (c === null ? points.length - 1 : Math.min(points.length - 1, c + 1)));
    else if (e.key === 'ArrowLeft') setCursor((c) => (c === null ? points.length - 1 : Math.max(0, c - 1)));
    else if (e.key === 'Home') setCursor(0);
    else if (e.key === 'End') setCursor(points.length - 1);
    else if (e.key === 'Escape') setCursor(null);
    else if (e.key === 'Enter' && active) navigate(calendarHref(active.date));
    else return;
    e.preventDefault();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'View as chart' : 'View as table'}
        </Button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <table className="w-full text-[13px]">
            <caption className="sr-only">{bucket === 'week' ? 'Weekly' : 'Daily'} net and cumulative net P&amp;L</caption>
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="h-8 px-3">{bucket === 'week' ? 'Week of' : 'Date'}</th>
                <th scope="col" className="px-3 text-right">{bucket === 'week' ? 'Week net' : 'Day net'}</th>
                <th scope="col" className="px-3 text-right">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-border/60">
                  <td className="h-9 px-3 font-mono tabular-nums">{p.date}</td>
                  <td className="px-3 text-right font-mono tabular-nums">{formatMoney(p.day, currency, { sign: true })}</td>
                  <td className="px-3 text-right font-mono tabular-nums">{formatMoney(p.cumulative, currency, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : points.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No closed trades in this period.</p>
      ) : (
        <div
          tabIndex={0}
          role="group"
          aria-label={`${title} chart. Left and right arrow keys move through the ${unit}s, Enter opens the ${unit} in Calendar.`}
          onKeyDown={onKeyDown}
          onBlur={() => setCursor(null)}
          className="flex flex-1 flex-col rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex flex-1 flex-col" role="img" aria-label={`${title}: ${points.length} ${unit}s, ending at ${formatMoney(last, currency, { sign: true })}. Open View as table for every value.`}>
            <div className={fill ? 'min-h-[200px] flex-1 md:min-h-[280px]' : 'h-[200px] md:h-[280px]'}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} ticks={ticks} domain={[ticks[0], ticks[ticks.length - 1]]} interval={0} tickFormatter={(v: number) => formatCompactMoney(v, { currency })} />
                  <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
                  <Area dataKey={(p: ChartPoint) => [p.cumulative, p.peak]} stroke="none" fill="hsl(var(--loss))" fillOpacity={0.16} isAnimationActive={false} activeDot={false} legendType="none" tooltipType="none" />
                  <Line type="monotone" dataKey="cumulative" stroke={lineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
                  {active && <ReferenceLine x={active.date} stroke="hsl(var(--foreground-soft))" strokeDasharray="3 3" />}
                  <Tooltip content={<ChartTooltip currency={currency} bucket={bucket} />} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[72px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 0, right: 12, bottom: 0, left: 4 }}>
                  <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} tickFormatter={(d: string) => labels.get(d) ?? d} />
                  <YAxis hide width={52} />
                  <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
                  <Bar dataKey="day" isAnimationActive={false} cursor="pointer" onClick={(d: { date?: string }) => d.date && navigate(calendarHref(d.date))}>
                    {points.map((p) => (
                      <Cell key={p.date} fill={p.day >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'} />
                    ))}
                  </Bar>
                  {active && <ReferenceLine x={active.date} stroke="hsl(var(--foreground-soft))" strokeDasharray="3 3" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p aria-live="polite" className="mt-1 min-h-4 px-1 text-xs text-muted-foreground">
            {active ? (
              <>
                {bucket === 'week' ? 'Week of ' : ''}{active.label} · {unit} <span className="font-mono">{formatMoney(active.day, currency, { sign: true })}</span> · total <span className="font-mono">{formatMoney(active.cumulative, currency, { sign: true })}</span>
              </>
            ) : null}
          </p>
        </div>
      )}
    </div>
  );
}
