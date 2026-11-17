import { useMemo, useRef } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Stage } from './kit/stage';
import type { Act } from './kit/act';
import { Popover } from './kit/motion/Popover';
import { Count } from './kit/motion/Count';
import { formatCompactMoney, formatMoney } from '@/lib/format';
import { sampleNet } from '@/components/public/tourFixture';
import { SAMPLE_DAYS, SAMPLE_MONTH, SAMPLE_RULE_BREAK_DAYS, SAMPLE_WINS, dayTintStep, money, monthCells, plural, sampleStats } from './sampleJournal';
import { SampleDataChip } from './SampleDataChip';
import './look.css';
import './calendar-stage.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A day's net as the app calendar writes it (components/calendar/cellText.ts compactMoney: whole units under 1,000, compact
 * above). Not imported from there: that module brings the calendar's date code into the landing and auth chunks.
 */
const cellMoney = (pnl: number) =>
  Math.abs(pnl) < 1000 ? formatMoney(pnl, 'USD', { sign: true, decimals: 0 }) : formatCompactMoney(pnl, { sign: true, currency: 'USD' });

/** `filled`: how many trading days are drawn so far (the fill-in intro); absent means the whole month. */
type S = { open: number | null; filled?: number };
const POSTER: S = { open: 10 };
/** The landing page's design size. */
const WIDE = { width: 1000, height: 600 };
const COMPACT = { below: 600, width: 358, height: 430 };

async function script(a: Act<S>) {
  await a.wait(700);
  await a.move({ at: 'day-10', x: 0.7, y: 0.7 });
  await a.set({ open: 10 });
  await a.wait(2600);
  await a.move({ at: 'day-9', x: 0.7, y: 0.7 });
  await a.set({ open: 9 });
  await a.wait(2400);
  await a.move('rest');
  await a.set({ open: null });
  await a.wait(1400);
}

/** The same loop, preceded once by the month filling in day by day. */
function withFillIn(pending: { current: boolean }) {
  return async (a: Act<S>) => {
    if (pending.current) {
      pending.current = false;
      await a.snap({ filled: 0 });
      await a.wait(500);
      for (let n = 1; n <= SAMPLE_DAYS.length; n++) {
        await a.set({ filled: n });
        await a.wait(90);
      }
      await a.snap({ filled: undefined });
    }
    await script(a);
  };
}

/**
 * The loop for a host-driven fill: it waits for the whole month instead of being switched on then. A stage with no
 * script is a still, and a still's transitions are off (kit/stage.css), so the days could not ease in as they fill.
 */
function onceComplete(complete: { current: boolean }) {
  return async (a: Act<S>) => {
    while (!complete.current) await a.wait(150);
    await script(a);
  };
}

function dayFacts(day: number) {
  const i = SAMPLE_DAYS.findIndex((d) => d.day === day);
  const d = SAMPLE_DAYS[i];
  const weekday = WEEKDAYS[(SAMPLE_MONTH.firstWeekday + day - 1) % 7];
  return { d, wins: SAMPLE_WINS[i], weekday };
}

export interface CalendarStageProps {
  play?: boolean;
  className?: string;
  /** Wide design size, for a host narrower than the landing's scene; the frame keeps its 60 px run-off at the bottom. Default 1000 × 600. */
  size?: { width: number; height: number };
  /** Before the first loop only: the month starts empty and its trading days tint in one by one. */
  fillIn?: boolean;
  /**
   * Host-driven fill (the landing's scroll scene): how many trading days are drawn, oldest first. The month total counts
   * only those days and no day opens until all are in. The compact design then prints each day's figure and opens a
   * day beside its cell, because the host may show only the weeks with trades. Absent: the whole month.
   */
  filled?: number;
}

/**
 * The Calendar page for the sample month: each day tinted by its net P&L, `!` on days a rule was broken. The cursor
 * hovers a rule-break day, then the best day, and each opens the day's summary. `play={false}` shows the poster.
 */
export function CalendarStage({ play = true, className = '', size = WIDE, fillIn = false, filled }: CalendarStageProps) {
  const s0 = sampleStats();
  const introPending = useRef(fillIn);
  const hosted = filled !== undefined;
  const complete = useRef(true);
  complete.current = !hosted || filled >= SAMPLE_DAYS.length;
  const loop = useMemo(() => (hosted ? onceComplete(complete) : fillIn ? withFillIn(introPending) : script), [hosted, fillIn]);
  const rest = { x: size.width - 70, y: size.height - 40 };
  return (
    <Stage
      width={size.width}
      height={size.height}
      compact={COMPACT}
      initial={{ open: null } as S}
      poster={POSTER}
      script={play ? loop : undefined}
      cursor={{ at: { wide: rest, compact: { x: 320, y: 410 } } }}
      theme="dark"
      className={`tq-look cs-demo ${className}`}
    >
      {(s, rect, layout) => {
        const compact = layout === 'compact';
        const count = filled ?? s.filled;
        const openDay = complete.current ? s.open : null;
        const open = openDay !== null ? dayFacts(openDay) : null;
        const anchor = openDay !== null ? rect(`day-${openDay}`) : null;
        const drawn = (day: number) => count === undefined || SAMPLE_DAYS.findIndex((d) => d.day === day) < count;
        const total = filled === undefined ? s0.net : sampleNet(SAMPLE_DAYS.slice(0, filled));
        return (
          <>
            <div className="tq-frame cs-frame" data-hosted={hosted || undefined} style={!compact && size !== WIDE ? { width: size.width, height: size.height + 60 } : undefined}>
              <div className="tq-frame__main">
                <div className="tq-frame__title">
                  <span>Calendar</span>
                  <SampleDataChip />
                </div>
                <div className="tq-frame__scope">
                  <span className="tq-chip-ctl">
                    <Wallet />
                    {compact ? 'USD' : 'Sample account · USD'}
                    <ChevronDown />
                  </span>
                  {!compact && <ChevronLeft className="cs-nav" />}
                  <span className="tq-chip-ctl">
                    <CalendarDays />
                    {SAMPLE_MONTH.label}
                    <ChevronDown />
                  </span>
                  {!compact && <ChevronRight className="cs-nav" />}
                  {filled === undefined ? (
                    <span className={`cs-total tq-num ${total < 0 ? 'tq-neg' : 'tq-pos'}`}>{money(total)}</span>
                  ) : (
                    <Count className={`cs-total tq-num ${total < 0 ? 'tq-neg' : total > 0 ? 'tq-pos' : 'tq-muted'}`} value={total} format={money} duration={500} />
                  )}
                </div>
                <div className="cs-head">
                  {WEEKDAYS.map((d) => (
                    <span key={d}>{compact ? d.slice(0, 2) : d}</span>
                  ))}
                </div>
                <div className="cs-grid">
                  {monthCells().map((cell, i) => {
                    const waiting = !!cell?.data && !drawn(cell.day);
                    // Hosted: a day not yet drawn keeps its figures in place, hidden, so they ease in (data-pending).
                    const c = cell && waiting && !hosted ? { day: cell.day, data: undefined, broke: false } : cell;
                    return c ? (
                      <div
                        key={i}
                        className={`cs-cell${c.data && !waiting ? ` tq-tint-${c.data.pnl < 0 ? 'l' : 'p'}${dayTintStep(c.data.pnl)}` : ''}`}
                        data-target={`day-${c.day}`}
                        data-open={openDay === c.day || undefined}
                        data-pending={(hosted && waiting) || undefined}
                      >
                        <span className="cs-day tq-num">{c.day}</span>
                        {c.broke && <b className="cs-mark">!</b>}
                        {c.data && (!compact || hosted) && (
                          <span className={`cs-pnl tq-num ${c.data.pnl < 0 ? 'tq-neg' : 'tq-pos'}`}>{cellMoney(c.data.pnl)}</span>
                        )}
                        {c.data && !compact && <span className="cs-count">{plural(c.data.trades, 'trade')}</span>}
                      </div>
                    ) : (
                      <div key={i} className="cs-cell cs-cell--blank" />
                    );
                  })}
                </div>
              </div>
            </div>
            <Popover
              show={!!open}
              className="cs-pop"
              origin={compact ? (hosted ? 'bottom left' : 'bottom') : 'top left'}
              style={
                !anchor
                  ? undefined
                  : !compact
                    ? { left: anchor.x + anchor.width + 8, top: anchor.y }
                    : hosted
                      ? { left: anchor.x + anchor.width + 6, bottom: COMPACT.height - anchor.y - anchor.height, width: 196 }
                      : { left: 16, right: 16, bottom: 16 }
              }
            >
              {open && (
                <>
                  <div className="cs-pop__date">
                    {open.weekday} {open.d.day} Nov 2026
                  </div>
                  <div className={`cs-pop__pnl tq-num ${open.d.pnl < 0 ? 'tq-neg' : 'tq-pos'}`}>{money(open.d.pnl)}</div>
                  <div className="cs-pop__meta">
                    {plural(open.d.trades, 'trade')} · {plural(open.wins, 'win')}
                  </div>
                  {SAMPLE_RULE_BREAK_DAYS.includes(open.d.day) && (
                    <div className="cs-pop__rule">
                      <b>!</b> {open.d.trades} broke a rule
                    </div>
                  )}
                </>
              )}
            </Popover>
            <span data-target="rest" style={{ position: 'absolute', left: compact ? 320 : rest.x, top: compact ? 410 : rest.y }} />
          </>
        );
      }}
    </Stage>
  );
}
