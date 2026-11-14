import type { ReactNode } from 'react';
import { Check, FileSpreadsheet } from 'lucide-react';
import { Stage } from './kit/stage';
import type { Act } from './kit/act';
import { Collapse } from './kit/motion/Collapse';
import { Button } from './kit/controls/Button';
import { Meter } from './kit/parts/Meter';
import { formatPercent, formatR } from '@/lib/format';
import { SAMPLE_INDIA_TRADES, inr, money, plural } from './sampleJournal';
import { MIN_VERDICT_TRADES, SAMPLE_LABEL_TEXT, sampleBehaviours, sampleEdge } from './sampleAnalysis';
import './look.css';
import './answer-cards.css';

/** Card stages share one geometry (stageshow "pinned, bottom bleed"): 380 × 360, frame inset 20, off the bottom. */
export const CARD_W = 380;
export const CARD_H = 360;
const W = CARD_W;
const H = CARD_H;

type ImportS = { progress: number; rows: number; imported: boolean };
const IMPORT_DONE: ImportS = { progress: 1, rows: 3, imported: true };

async function importScript(a: Act<ImportS>) {
  await a.wait(500);
  await a.set({ progress: 1 });
  await a.wait(900);
  await a.stagger([1, 2, 3], (n) => a.set({ rows: n }), 160);
  await a.wait(900);
  await a.move({ at: 'import', x: 0.8, y: 0.6 });
  await a.click();
  await a.set({ imported: true });
  await a.wait(600);
  await a.move('rest');
}

/** Broker import with its review step: a Zerodha tradebook, estimated charges per trade, net P&L, a duplicate skipped. */
export function ImportReviewDemo({ play = true }: { play?: boolean }) {
  const count = SAMPLE_INDIA_TRADES.length;
  return (
    <Stage
      width={W}
      height={H}
      initial={{ progress: 0, rows: 0, imported: false } as ImportS}
      poster={IMPORT_DONE}
      script={play ? importScript : undefined}
      play="once"
      cursor={{ at: { x: 330, y: 336 } }}
      theme="dark"
      className="tq-look ac-demo"
    >
      {(s) => (
        <>
          <div className="tq-frame ac-frame">
            <div className="tq-frame__main">
              <div className="tq-frame__title">
                <span>Import</span>
              </div>
              <div className="ac-file">
                <FileSpreadsheet aria-hidden="true" />
                <span>
                  tradebook-2026-11.csv
                  <small>Zerodha · 3 rows</small>
                </span>
                <Meter className="ac-file__meter" value={s.progress} />
              </div>
              <div className="ac-row ac-row--head">
                <span>Symbol</span>
                <span className="ac-r">Charges</span>
                <span className="ac-r">Net P&amp;L</span>
              </div>
              {SAMPLE_INDIA_TRADES.map((t, i) => (
                <Collapse key={t.symbol} open={s.rows > i}>
                  <div className="ac-row">
                    <span className="ac-sym">{t.symbol}</span>
                    <span className="ac-r tq-num tq-muted">{inr(t.totalCharges, false)}</span>
                    <span className={`ac-r tq-num ${t.net < 0 ? 'tq-neg' : 'tq-pos'}`}>{inr(t.net)}</span>
                  </div>
                </Collapse>
              ))}
              <Collapse open={s.rows > count}>
                <div className="ac-row ac-row--note">1 duplicate skipped</div>
              </Collapse>
              <div className="ac-actions">
                <Button variant={s.imported ? 'secondary' : 'primary'} size="medium" icon={s.imported ? <Check /> : undefined} data-target="import" data-cursor="hand">
                  {s.imported ? `${count} trades imported` : `Import ${count} trades`}
                </Button>
              </div>
            </div>
          </div>
          <span data-target="rest" style={{ position: 'absolute', left: 330, top: 336 }} />
        </>
      )}
    </Stage>
  );
}

const ANALYTICS_TABS = ['Overview', 'Edge', 'Timing', 'Risk', 'Behaviour'];

function AnalyticsFrame({ tab, children }: { tab: string; children: ReactNode }) {
  return (
    <div className="tq-frame ac-frame">
      <div className="tq-frame__main">
        <div className="tq-frame__title">
          <span>Analytics</span>
        </div>
        <div className="ac-tabs">
          {ANALYTICS_TABS.map((t) => (
            <span key={t} data-active={t === tab || undefined}>
              {t}
            </span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

const pct = (fraction: number) => formatPercent(fraction * 100);

const EDGE = sampleEdge();
const BEHAVIOURS = sampleBehaviours().slice(0, 3);
const evidenceWords = (trades: number) => (trades < MIN_VERDICT_TRADES ? 'too early to tell' : 'pattern to watch');

export const EDGE_ALT = `Sample data: Analytics, Overview tab, on ${plural(EDGE.trades, 'trade')}, labelled ${SAMPLE_LABEL_TEXT[EDGE.label].toLowerCase()}. Win rate ${pct(EDGE.winRate)} with a range of ${pct(EDGE.winRateRange.lo)} to ${pct(EDGE.winRateRange.hi)}, break-even win rate ${pct(EDGE.breakEvenWinRate)}, and expectancy ${formatR(EDGE.expectancyR)} per trade with a range of ${formatR(EDGE.expectancyRRange.lo)} to ${formatR(EDGE.expectancyRRange.hi)}${EDGE.tradesNeeded === null ? '' : ', not proven yet'}.`;
export const BEHAVIOUR_ALT = `Sample data: Analytics, Behaviour tab, listing ${BEHAVIOURS.map((b) => `${b.title.toLowerCase()}, ${plural(b.trades, 'trade')}, ${money(b.net)}`).join('; ')}; each is marked ${evidenceWords(BEHAVIOURS[0].trades)}.`;

/** Analytics › Overview, "Do I have an edge?": win rate against break-even and expectancy in R, each with its range (a still). */
export function EdgeCard() {
  const e = EDGE;
  return (
    <Stage width={W} height={H} theme="dark" className="tq-look ac-demo">
      {() => (
        <AnalyticsFrame tab="Overview">
          <div className="ac-panel-title ac-panel-title--stack">
            <span>Do I have an edge?</span>
            <small>
              {SAMPLE_LABEL_TEXT[e.label]} · {plural(e.trades, 'trade')}
            </small>
          </div>
          <div className="ac-facts">
            <div className="ac-fact">
              <span className="ac-fact__label">Win rate</span>
              <span className="ac-fact__value tq-num">{pct(e.winRate)}</span>
              <span className="ac-fact__note">
                Range {pct(e.winRateRange.lo)}–{pct(e.winRateRange.hi)}
              </span>
            </div>
            <div className="ac-fact">
              <span className="ac-fact__label">Break-even win rate</span>
              <span className="ac-fact__value tq-num">{pct(e.breakEvenWinRate)}</span>
              <span className="ac-fact__note">At a payoff of {e.payoff.toFixed(2)}</span>
            </div>
            <div className="ac-fact ac-fact--lead">
              <span className="ac-fact__label">Expectancy per trade</span>
              <span className="ac-fact__line">
                <span className={`ac-fact__value tq-num ${e.expectancyR < 0 ? 'tq-neg' : 'tq-pos'}`}>{formatR(e.expectancyR)}</span>
                <span className="ac-fact__note">
                  Range {formatR(e.expectancyRRange.lo)} to {formatR(e.expectancyRRange.hi)}
                </span>
              </span>
              <span className="ac-fact__say">
                {e.tradesNeeded === null
                  ? 'The whole range is on one side of zero.'
                  : `Not proven yet: about ${e.tradesNeeded} trades with a stop would be needed at this spread; you have ${e.trades}.`}
              </span>
            </div>
          </div>
        </AnalyticsFrame>
      )}
    </Stage>
  );
}

/** Analytics › Behaviour, "What do I do that costs money?": the behaviour checks with count, money and R against normal (a still). */
export function BehaviourBoardCard() {
  return (
    <Stage width={W} height={H} theme="dark" className="tq-look ac-demo">
      {() => (
        <AnalyticsFrame tab="Behaviour">
          <div className="ac-panel-title ac-panel-title--stack">
            <span>What do I do that costs money?</span>
            <small>Checked on every trade; most need no tagging</small>
          </div>
          {BEHAVIOURS.map((b) => (
            <div key={b.id} className="ac-beh">
              <span className="ac-beh__name">{b.title}</span>
              <span className="ac-r tq-num">{money(b.net)}</span>
              <span className="ac-beh__note">
                {plural(b.trades, 'trade')} · {evidenceWords(b.trades)}
              </span>
              <span className="ac-r ac-beh__note tq-num">
                {formatR(b.avgR)} vs {formatR(b.normalAvgR)}
              </span>
            </div>
          ))}
          {[104, 132].map((w) => (
            <div key={w} className="ac-filler">
              <i style={{ width: w }} />
              <i style={{ width: 54 }} />
            </div>
          ))}
        </AnalyticsFrame>
      )}
    </Stage>
  );
}
