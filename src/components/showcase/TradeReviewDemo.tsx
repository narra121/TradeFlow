import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, ChevronDown, FileUp, LayoutDashboard, LineChart, ListOrdered, Target, Wallet, X } from 'lucide-react';
import { Stage } from './kit/stage';
import type { Act } from './kit/act';
import { Count } from './kit/motion/Count';
import { Roll } from './kit/motion/Roll';
import { Swap } from './kit/motion/Swap';
import { Popover } from './kit/motion/Popover';
import { Menu } from './kit/parts/Menu';
import { formatR } from '@/lib/format';
import { SAMPLE_RECENT, dayLabel, money, plural, sampleStats } from './sampleJournal';
import './look.css';
import './trade-review.css';

/** The trade the story marks: 16 Nov 09:15 GBPUSD Short −$21.80 −0.50R (SAMPLE_RECENT[1]). */
const MARKED = SAMPLE_RECENT[1];
const RULES = ['Trade with the 1-hour trend', 'Max 2 trades per session', 'Stop loss on every trade'];
const BEFORE = sampleStats();
const AFTER = sampleStats([{ pnl: MARKED.pnl, day: MARKED.day }]);

type S = { selected: boolean; menu: boolean; hover: number; broken: boolean; counted: boolean; satOut: boolean };
const initial: S = { selected: false, menu: false, hover: -1, broken: false, counted: false, satOut: false };
const POSTER: S = { ...initial, selected: true, broken: true, counted: true };
const REST = { wide: { x: 236, y: 438 }, compact: { x: 120, y: 430 } };

async function script(a: Act<S>) {
  await a.wait(900);
  await a.move('row-1');
  await a.wait(200);
  await a.click();
  await a.set({ selected: true });
  await a.wait(1100);
  await a.move({ at: 'rules-field', x: 0.88, y: 0.5 });
  await a.wait(150);
  await a.click();
  await a.set({ menu: true });
  await a.wait(450);
  await a.move({ at: 'rule-0', x: 0.9, y: 0.5 });
  await a.set({ hover: 0 });
  await a.wait(300);
  await a.click();
  await a.set({ broken: true });
  await a.set({ menu: false, hover: -1 });
  await a.wait(500);
  await a.set({ counted: true });
  await a.move('rest');
  await a.wait(2600);
  await a.key('esc');
  await a.set({ selected: false, satOut: true });
  await a.wait(700);
  await a.snap({ broken: false, counted: false });
  // The hint's Roll finishes out of sight before the card comes back.
  await a.wait(800);
  await a.set({ satOut: false });
  await a.wait(600);
}

function ChartThumb() {
  // A 15-minute chart as a trader would screenshot it: price rises into resistance, then the short and the stop-out.
  const candles = [
    [30, 22, 34, 18], [24, 18, 27, 15], [19, 21, 23, 16], [21, 16, 22, 13], [16, 13, 18, 10], [13, 15, 17, 11],
    [15, 11, 16, 9], [11, 13, 15, 8], [13, 10, 14, 8], [10, 12, 14, 7], [12, 9, 13, 6], [9, 11, 12, 6],
  ];
  return (
    <svg className="tr-thumb" viewBox="0 0 120 40" aria-hidden="true">
      <line className="tr-thumb__level" x1="0" x2="120" y1="9" y2="9" />
      {candles.map(([o, c, lo, hi], i) => {
        const x = 6 + i * 9.4;
        const up = c < o;
        return (
          <g key={i} className={up ? 'tr-thumb__up' : 'tr-thumb__down'}>
            <line x1={x} x2={x} y1={hi} y2={lo} />
            <rect x={x - 2.6} width="5.2" y={Math.min(o, c)} height={Math.max(1, Math.abs(o - c))} />
          </g>
        );
      })}
    </svg>
  );
}

const RAIL = [LayoutDashboard, ListOrdered, CalendarDays, BarChart3, Target, Wallet, FileUp];

/**
 * Hero cursor demo: in Trades, open the losing GBPUSD short, mark the rule it broke, and the month's broken-rules cost
 * rolls from −$118.25 to −$140.05. All figures come from the sample fixture. Pass `play={false}` for the still (poster).
 */
export function TradeReviewDemo({ play = true, className = '' }: { play?: boolean; className?: string }) {
  return (
    <Stage
      width={760}
      height={480}
      compact={{ below: 560, width: 358, height: 460 }}
      initial={initial}
      poster={POSTER}
      script={play ? script : undefined}
      cursor={{ at: REST }}
      theme="dark"
      className={`tq-look tr-demo ${className}`}
    >
      {(s, _rect, layout) => {
        const compact = layout === 'compact';
        const shown = s.counted ? AFTER : BEFORE;
        return (
          <>
            <div className="tq-frame tr-frame">
              {!compact && (
                <div className="tq-frame__rail">
                  <span className="tq-frame__logo">
                    <LineChart />
                  </span>
                  {RAIL.map((Icon, i) => (
                    <span key={i} data-active={i === 1}>
                      <Icon />
                    </span>
                  ))}
                </div>
              )}
              <div className="tq-frame__main">
                <div className="tq-frame__title">
                  <span>Trades</span>
                </div>
                <div className="tq-frame__scope">
                  <span className="tq-chip-ctl">
                    <Wallet />
                    Sample account · USD
                    <ChevronDown />
                  </span>
                  {!compact && (
                    <span className="tq-chip-ctl">
                      <CalendarDays />
                      November 2026
                      <ChevronDown />
                    </span>
                  )}
                </div>
                <div className="tr-table">
                  <div className="tr-row tr-row--head">
                    {!compact && <span>Closed</span>}
                    <span>Symbol</span>
                    {!compact && <span>Side</span>}
                    <span className="tr-r">Net P&amp;L</span>
                    <span className="tr-r">R</span>
                  </div>
                  {SAMPLE_RECENT.map((t, i) => (
                    <div key={i} className="tr-row" data-target={`row-${i}`} data-cursor="hand" data-selected={(i === 1 && s.selected) || undefined}>
                      {!compact && (
                        <span className="tq-num tq-muted">
                          {dayLabel(t.day)}, {t.time}
                        </span>
                      )}
                      <span className="tr-sym">{t.symbol}</span>
                      {!compact && (
                        <span className="tr-side">
                          {t.direction === 'Long' ? <ArrowUpRight /> : <ArrowDownRight />}
                          {t.direction}
                        </span>
                      )}
                      <span className={`tr-r tq-num ${t.pnl < 0 ? 'tq-neg' : 'tq-pos'}`}>{money(t.pnl)}</span>
                      <span className="tr-r tq-num">{formatR(t.r)}</span>
                    </div>
                  ))}
                  {[0, 1].map((i) => (
                    <div key={`f${i}`} className="tr-row tr-row--filler" aria-hidden="true">
                      <i style={{ width: 64 + i * 10 }} />
                      <i style={{ width: 48 }} />
                    </div>
                  ))}
                </div>

                <div className="tr-pane" data-open={s.selected || undefined}>
                  <div className="tr-pane__head">
                    <span className="tr-pane__sym">{MARKED.symbol}</span>
                    <span className="tr-side">
                      <ArrowDownRight />
                      {MARKED.direction}
                    </span>
                    <span className="tr-pane__close">
                      <X />
                    </span>
                  </div>
                  <div className="tr-pane__body">
                    <div className="tr-pane__result">
                      <span className="tq-num tq-neg tr-pane__pnl">{money(MARKED.pnl)}</span>
                      <span className="tq-num tq-neg">{formatR(MARKED.r)}</span>
                      <span className="tq-muted">
                        {dayLabel(MARKED.day)}, {MARKED.time}
                      </span>
                    </div>
                    <div className="tr-pane__grid">
                      <span className="tq-muted">Entry</span>
                      <span className="tq-num">1.27150</span>
                      <span className="tq-muted">Exit</span>
                      <span className="tq-num">1.27259</span>
                      <span className="tq-muted">Stop loss</span>
                      <span className="tq-num">1.27368</span>
                      <span className="tq-muted">Quantity</span>
                      <span className="tq-num">0.20 lots</span>
                    </div>
                    <div className="tr-field">
                      <span className="tq-muted">Mistakes</span>
                      <span className="tq-tag-loss">Counter-trend</span>
                    </div>
                    <div className="tr-rules">
                      <div className="tr-field" data-target="rules-field" data-cursor="hand" data-open={s.menu || undefined}>
                        <span className="tq-muted">Broken rules</span>
                        <Swap id={s.broken ? 'on' : 'off'}>{s.broken ? <span className="tq-tag-loss">{RULES[0]}</span> : <span className="tq-muted tr-none">None</span>}</Swap>
                      </div>
                      <Popover show={s.menu} className="tr-menu">
                        <Menu items={RULES} value={s.hover} targets={['rule-0', 'rule-1', 'rule-2']} data-cursor="hand" />
                      </Popover>
                    </div>
                    <div className="tr-pane__label">Screenshots</div>
                    <div className="tr-shot">
                      <ChartThumb />
                      <span className="tq-muted">15m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="tq-satellite tr-sat" data-out={s.satOut || undefined}>
              <div className="tr-sat__label">Broken rules · November</div>
              <Count className="tq-num tq-neg tr-sat__value" value={shown.brokenRules} format={money} />
              <div className="tr-sat__hint">
                <Roll>{`${plural(shown.brokenTrades, 'trade')} · ${plural(shown.brokenDays, 'day')}`}</Roll>
              </div>
            </div>
            <span data-target="rest" style={{ position: 'absolute', left: REST[layout].x, top: REST[layout].y }} />
          </>
        );
      }}
    </Stage>
  );
}
