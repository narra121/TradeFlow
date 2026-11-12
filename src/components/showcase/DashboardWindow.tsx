import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { formatR } from '@/lib/format';
import { SAMPLE_MONTH, SAMPLE_RECENT, dayLabel, dayTintStep, equitySeries, money, monthCells, percent, plural, sampleStats } from './sampleJournal';
import './showcase.css';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const TICKS = [0, 100, 200, 300, 400];
const AXIS_MAX = 400;
/** Plot geometry in SVG units (viewBox 100 × 100, stretched): the line lives in 0–LINE_BOTTOM, the daily bars around BAR_ZERO. */
const LINE_BOTTOM = 68;
const BAR_ZERO = 86;
const BAR_SCALE = 12 / 140;

export interface DashboardWindowProps {
  className?: string;
  /** Dims every part but this one (the landing story's steps); omitted, nothing is dimmed. */
  focus?: 'net' | 'rules' | 'month' | 'trades';
}

/**
 * The sample dashboard as a still picture (DESIGN-SHARED S8c): title row, scope row, stat strip, equity, month and recent
 * trades, all computed from the sample fixture. It reflows by its own width (container queries) and is never cropped
 * sideways. Nothing inside is focusable and there are no headings; the caller wraps it in a figure with role="img"
 * and `dashboardAlt()` as its label.
 */
export function DashboardWindow({ className = '', focus }: DashboardWindowProps) {
  const s = sampleStats();
  const series = equitySeries();
  const x = (i: number) => (series.length === 1 ? 50 : 2 + (i / (series.length - 1)) * 96);
  const y = (v: number) => LINE_BOTTOM - (v / AXIS_MAX) * LINE_BOTTOM;
  const line = series.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const drawdown = [...series.map((p, i) => `${x(i)},${y(p.peak)}`), ...[...series].reverse().map((p, i) => `${x(series.length - 1 - i)},${y(p.value)}`)].join(' ');
  const stats = [
    { label: 'Net P&L', value: money(s.net), tone: s.net < 0 ? 'neg' : 'pos', hint: `${plural(s.trades, 'trade')} · ${plural(s.days, 'day')}` },
    { label: 'Win rate', value: percent(s.winRate), tone: '', hint: `${s.wins} W · ${s.losses} L` },
    { label: 'Best day', value: money(s.bestDay.pnl), tone: 'pos', hint: dayLabel(s.bestDay.day) },
    { label: 'Broken rules', value: money(s.brokenRules), tone: s.brokenRules < 0 ? 'neg' : 'pos', hint: `${plural(s.brokenTrades, 'trade')} · ${plural(s.brokenDays, 'day')}` },
  ];

  return (
    <div className={`tq-dash ${className}`} data-focus={focus}>
      <div className="tq-dash__bar">
        <span className="tq-dash__title">Dashboard</span>
      </div>
      <div className="tq-dash__scope">
        <span className="tq-ctl">
          <Wallet className="tq-ico" aria-hidden="true" />
          Sample account · USD
          <ChevronDown className="tq-ico" aria-hidden="true" />
        </span>
        <span className="tq-ctl tq-ctl--ghost tq-ctl--nav">
          <ChevronLeft className="tq-ico" aria-hidden="true" />
        </span>
        <span className="tq-ctl tq-ctl--period">
          <CalendarDays className="tq-ico" aria-hidden="true" />
          {SAMPLE_MONTH.label}
          <ChevronDown className="tq-ico" aria-hidden="true" />
        </span>
        <span className="tq-ctl tq-ctl--ghost tq-ctl--nav">
          <ChevronRight className="tq-ico" aria-hidden="true" />
        </span>
      </div>

      <div className="tq-dash__body">
        <div className="tq-stats">
          {stats.map((st) => (
            <div key={st.label} className="tq-stat" data-part={st.label === 'Broken rules' ? 'rules' : st.label === 'Net P&L' ? 'net' : 'stat'}>
              <div className="tq-stat__label">{st.label}</div>
              <div className={`tq-stat__value tq-num ${st.tone && `tq-${st.tone}`}`}>{st.value}</div>
              <div className="tq-stat__hint">{st.hint}</div>
            </div>
          ))}
        </div>

        <div className="tq-dash__grid" data-part="month">
          <div className="tq-panel">
            <div className="tq-panel__head">
              <span className="tq-panel__title">Equity</span>
              <span className="tq-panel__note">Net P&amp;L, cumulative and by day</span>
            </div>
            <div className="tq-panel__body">
              <div className="tq-eq">
                {TICKS.map((t) => (
                  <span key={t} className="tq-eq__y" style={{ top: `${y(t)}%` }}>
                    {t}
                  </span>
                ))}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {TICKS.map((t) => (
                    <line key={t} className="tq-eq__grid" x1="0" x2="100" y1={y(t)} y2={y(t)} />
                  ))}
                  <polygon className="tq-eq__dd" points={drawdown} />
                  <polyline className="tq-eq__line" points={line} />
                  <line className="tq-eq__zero" x1="0" x2="100" y1={BAR_ZERO} y2={BAR_ZERO} />
                  {series.map((p, i) => {
                    const h = Math.abs(p.pnl) * BAR_SCALE;
                    return (
                      <rect
                        key={p.day}
                        className={p.pnl < 0 ? 'tq-eq__bar-neg' : 'tq-eq__bar-pos'}
                        x={x(i) - 1.4}
                        width="2.8"
                        y={p.pnl < 0 ? BAR_ZERO : BAR_ZERO - h}
                        height={h}
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="tq-eq__x">
                <span>2 Nov</span>
                <span>6 Nov</span>
                <span>11 Nov</span>
                <span>16 Nov</span>
              </div>
            </div>
          </div>

          <div className="tq-panel">
            <div className="tq-panel__head">
              <span className="tq-panel__title">{SAMPLE_MONTH.label}</span>
              <span className={`tq-panel__total tq-num ${s.net < 0 ? 'tq-neg' : 'tq-pos'}`}>{money(s.net)}</span>
            </div>
            <div className="tq-panel__body">
              <div className="tq-cal tq-cal--head">
                {WEEKDAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="tq-cal">
                {monthCells().map((c, i) =>
                  c ? (
                    <span key={i} className={`tq-cal__cell tq-num${c.data ? ` tq-tint-${c.data.pnl < 0 ? 'l' : 'p'}${dayTintStep(c.data.pnl)}` : ''}`}>
                      {c.day}
                      {c.broke && <b>!</b>}
                    </span>
                  ) : (
                    <span key={i} className="tq-cal__cell tq-cal__cell--blank" />
                  ),
                )}
              </div>
              <div className="tq-cal__note">
                <b>!</b> a trade broke a rule
              </div>
            </div>
          </div>
        </div>

        <div className="tq-panel" data-part="trades">
          <div className="tq-panel__head">
            <span className="tq-panel__title">Recent trades</span>
          </div>
          <table className="tq-tbl">
            <thead>
              <tr>
                <th className="tq-tbl__closed">Closed</th>
                <th>Symbol</th>
                <th className="tq-tbl__side">Side</th>
                <th className="tq-r">Net P&amp;L</th>
                <th className="tq-r">R</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_RECENT.map((t) => (
                <tr key={`${t.day}-${t.time}`}>
                  <td className="tq-tbl__closed tq-num">
                    {dayLabel(t.day)}, {t.time}
                  </td>
                  <td className="tq-tbl__sym">{t.symbol}</td>
                  <td className="tq-tbl__side">
                    <span className="tq-side">
                      {t.direction === 'Long' ? <ArrowUpRight className="tq-ico" aria-hidden="true" /> : <ArrowDownRight className="tq-ico" aria-hidden="true" />}
                      {t.direction}
                    </span>
                  </td>
                  <td className={`tq-r tq-num ${t.pnl < 0 ? 'tq-neg' : 'tq-pos'}`}>{money(t.pnl)}</td>
                  <td className="tq-r tq-num">{formatR(t.r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
