import { Stage } from './kit/stage';
import { Meter } from './kit/parts/Meter';
import { formatMoney, formatPercent } from '@/lib/format';
import {
  SAMPLE_DAYS,
  SAMPLE_INDIA_TRADES,
  SAMPLE_MONTH,
  dayTintStep,
  equitySeries,
  inr,
  money,
  monthCells,
  percent,
  plural,
  sampleStats,
} from './sampleJournal';
import './showcase.css';
import './look.css';
import './segment-stills.css';

const W = 340;
const H = 290;

/** One Indian F&O trade from a Zerodha tradebook: gross, each estimated charge, net (a still). */
export function IndiaChargesStill() {
  const t = SAMPLE_INDIA_TRADES[0];
  return (
    <Stage width={W} height={H} theme="dark" className="tq-look sg-demo">
      {() => (
        <div className="tq-frame sg-frame">
          <div className="tq-frame__main">
            <div className="tq-frame__title">
              <span>{t.symbol}</span>
              <span className="sg-sub">Zerodha · 10 Nov</span>
            </div>
            <div className="sg-list">
              <div className="sg-li">
                <span>Gross P&amp;L</span>
                <span className="tq-num">{inr(t.gross)}</span>
              </div>
              {t.charges.map((c) => (
                <div key={c.label} className="sg-li sg-li--charge">
                  <span className="tq-muted">{c.label}</span>
                  <span className="tq-num tq-muted">{inr(-c.value)}</span>
                </div>
              ))}
              <div className="sg-li sg-li--total">
                <span>Net P&amp;L</span>
                <span className={`tq-num ${t.net < 0 ? 'tq-neg' : 'tq-pos'}`}>{inr(t.net)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Stage>
  );
}

/** Starting balance of the sample account, for drawdown as a percent. */
const SAMPLE_BALANCE = 10_000;
const WEEK = [9, 10, 11, 12, 13];
const TRADE_LIMIT = 15;
const DRAWDOWN_LIMIT = 3;

/** Goals & rules for a prop-firm challenge: a weekly trade-count limit and a monthly drawdown limit (a still). */
export function PropLimitsStill() {
  const weekTrades = SAMPLE_DAYS.filter((d) => WEEK.includes(d.day)).reduce((a, d) => a + d.trades, 0);
  const drawdown = (Math.max(...equitySeries().map((p) => p.peak - p.value)) / SAMPLE_BALANCE) * 100;
  return (
    <Stage width={W} height={H} theme="dark" className="tq-look sg-demo">
      {() => (
        <div className="tq-frame sg-frame">
          <div className="tq-frame__main">
            <div className="tq-frame__title">
              <span>Goals &amp; rules</span>
            </div>
            <div className="sg-goal">
              <div className="sg-goal__top">
                <span>Trades · 9 – 13 Nov</span>
                <span className="tq-num">
                  {weekTrades} <span className="tq-muted">of {TRADE_LIMIT}</span>
                </span>
              </div>
              <Meter value={weekTrades / TRADE_LIMIT} tone="ink" />
              <span className="sg-goal__status">{TRADE_LIMIT - weekTrades} left</span>
            </div>
            <div className="sg-goal">
              <div className="sg-goal__top">
                <span>Drawdown · Nov</span>
                <span className="tq-num">
                  {formatPercent(drawdown)} <span className="tq-muted">of {formatPercent(DRAWDOWN_LIMIT)}</span>
                </span>
              </div>
              <Meter value={drawdown / DRAWDOWN_LIMIT} tone="ink" />
              <span className="sg-goal__status">Within</span>
            </div>
          </div>
        </div>
      )}
    </Stage>
  );
}

/** Accounts in three currencies, each total kept in its own currency (a still). */
export function AccountsStill() {
  const s = sampleStats();
  const fno = Math.round(SAMPLE_INDIA_TRADES.reduce((a, t) => a + t.net, 0) * 100) / 100;
  const rows = [
    { name: 'Sample account', currency: 'USD', trades: s.trades, value: money(s.net), neg: s.net < 0 },
    { name: 'F&O', currency: 'INR', trades: SAMPLE_INDIA_TRADES.length, value: inr(fno), neg: fno < 0 },
    { name: 'Challenge', currency: 'EUR', trades: 3, value: formatMoney(-48, 'EUR', { sign: true }), neg: true },
  ];
  return (
    <Stage width={W} height={H} theme="dark" className="tq-look sg-demo">
      {() => (
        <div className="tq-frame sg-frame">
          <div className="tq-frame__main">
            <div className="tq-frame__title">
              <span>Accounts</span>
            </div>
            {rows.map((r) => (
              <div key={r.name} className="sg-acct">
                <span>
                  {r.name}
                  <small>
                    {r.currency} · {plural(r.trades, 'trade')}
                  </small>
                </span>
                <span className={`tq-num ${r.neg ? 'tq-neg' : 'tq-pos'}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Stage>
  );
}

/** The dashboard at phone width, in the same window frame as every other still (no device chrome, DESIGN-SHARED S8.5). */
export function PhoneDashboard() {
  const s = sampleStats();
  return (
    <Stage width={420} height={520} compact={{ below: 410, width: 342, height: 520 }} theme="dark" className="tq-look sg-phone">
      {(_s, _rect, layout) => (
        <div className="sg-phone__device" style={{ width: layout === 'compact' ? 310 : 380 }}>
          <div className="sg-app">
            <div className="sg-app__bar">
              <span>Dashboard</span>
              <span className="sg-app__chip">Sample · USD</span>
            </div>
            <div className="sg-app__stats">
              <div>
                <small>Net P&amp;L</small>
                <b className="tq-num tq-pos">{money(s.net)}</b>
              </div>
              <div>
                <small>Win rate</small>
                <b className="tq-num">{percent(s.winRate)}</b>
              </div>
              <div>
                <small>Best day</small>
                <b className="tq-num tq-pos">{money(s.bestDay.pnl)}</b>
              </div>
              <div>
                <small>Broken rules</small>
                <b className="tq-num tq-neg">{money(s.brokenRules)}</b>
              </div>
            </div>
            <div className="sg-app__month">
              <div className="sg-app__month-head">
                <span>{SAMPLE_MONTH.label}</span>
                <span className="tq-num tq-pos">{money(s.net)}</span>
              </div>
              <div className="sg-app__cal">
                {monthCells().map((c, i) =>
                  c ? (
                    <span key={i} className={`tq-num${c.data ? ` tq-tint-${c.data.pnl < 0 ? 'l' : 'p'}${dayTintStep(c.data.pnl)}` : ''}`}>
                      {c.day}
                      {c.broke && <b>!</b>}
                    </span>
                  ) : (
                    <span key={i} className="sg-app__blank" />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Stage>
  );
}
