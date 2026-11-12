import { ArrowUp, Check, FileSpreadsheet } from 'lucide-react';
import { Stage } from './kit/stage';
import type { Act } from './kit/act';
import { Collapse } from './kit/motion/Collapse';
import { Stream } from './kit/motion/Stream';
import { Button } from './kit/controls/Button';
import { Meter } from './kit/parts/Meter';
import { FIXED_STARTERS } from '@/lib/ai/chatFormat';
import { SAMPLE_BROKEN_RULES, SAMPLE_INDIA_TRADES, SAMPLE_SESSIONS, inr, money, plural, sampleStats } from './sampleJournal';
import './look.css';
import './answer-cards.css';

/** Card stages share one geometry (stageshow "pinned, bottom bleed"): 380 × 340, frame inset 20, off the bottom. */
const W = 380;
const H = 340;

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
      cursor={{ at: { x: 330, y: 320 } }}
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
          <span data-target="rest" style={{ position: 'absolute', left: 330, top: 320 }} />
        </>
      )}
    </Stage>
  );
}

/** Analytics › Behaviour: what each broken rule cost this month (a still). */
export function BehaviourCostCard() {
  const s = sampleStats();
  const worst = Math.max(...SAMPLE_BROKEN_RULES.map((r) => Math.abs(r.pnl)));
  return (
    <Stage width={W} height={H} theme="dark" className="tq-look ac-demo">
      {() => (
        <div className="tq-frame ac-frame">
          <div className="tq-frame__main">
            <div className="tq-frame__title">
              <span>Analytics</span>
            </div>
            <div className="ac-tabs">
              <span>Overview</span>
              <span>Edge</span>
              <span data-active="true">Behaviour</span>
              <span>Timing</span>
            </div>
            <div className="ac-panel-title">
              <span>Broken rules</span>
              <span className="tq-num tq-neg">{money(s.brokenRules)}</span>
            </div>
            {SAMPLE_BROKEN_RULES.map((r) => (
              <div key={r.rule} className="ac-cost">
                <span className="ac-cost__rule">{r.rule}</span>
                <span className="ac-cost__n tq-muted">{plural(r.trades, 'trade')}</span>
                <span className="ac-r tq-num tq-neg">{money(r.pnl)}</span>
                <i className="ac-cost__bar" style={{ width: `${(Math.abs(r.pnl) / worst) * 100}%` }} />
              </div>
            ))}
            <div className="ac-panel-title ac-panel-title--quiet">
              <span>Mistakes</span>
            </div>
            <div className="ac-filler">
              <i style={{ width: 120 }} />
              <i style={{ width: 54 }} />
            </div>
            <div className="ac-filler">
              <i style={{ width: 96 }} />
              <i style={{ width: 54 }} />
            </div>
          </div>
        </div>
      )}
    </Stage>
  );
}

const QUESTION = FIXED_STARTERS[0];
const STARTERS = [FIXED_STARTERS[0], FIXED_STARTERS[3]];
const [ASIA, LONDON, NEW_YORK] = SAMPLE_SESSIONS;
const MONTH = sampleStats();
const ANSWER = `Broken rules: ${plural(MONTH.brokenTrades, 'trade')} that broke a rule lost ${money(MONTH.brokenRules)}. By session, London lost ${money(LONDON.pnl)} over ${LONDON.trades} trades; Asia (${money(ASIA.pnl)}) and New York (${money(NEW_YORK.pnl)}) made money.`;
const ANSWER_WORDS = ANSWER.split(' ').length;

type ChatS = { asked: boolean; thinking: boolean; words: number };
const CHAT_DONE: ChatS = { asked: true, thinking: false, words: ANSWER_WORDS };

async function chatScript(a: Act<ChatS>) {
  await a.wait(700);
  await a.move({ at: 'starter-0', x: 0.85, y: 0.5 });
  await a.wait(200);
  await a.click();
  await a.set({ asked: true, thinking: true });
  await a.wait(900);
  await a.set({ thinking: false });
  for (let n = 1; n <= ANSWER_WORDS; n++) {
    a.put({ words: n });
    await a.wait(55);
  }
  await a.move('rest');
}

/** Insights › Chat: from the empty state's first starter question (the app's own) to a plain answer with its figures. */
export function InsightsAnswerDemo({ play = true }: { play?: boolean }) {
  return (
    <Stage
      width={W}
      height={H}
      initial={{ asked: false, thinking: false, words: 0 } as ChatS}
      poster={CHAT_DONE}
      script={play ? chatScript : undefined}
      play="once"
      cursor={{ at: { x: 330, y: 110 } }}
      theme="dark"
      className="tq-look ac-demo"
    >
      {(s) => (
        <>
          <div className="tq-frame ac-frame">
            <div className="tq-frame__main">
              <div className="tq-frame__title">
                <span>Insights</span>
              </div>
              <div className="ac-tabs">
                <span>Reports</span>
                <span data-active="true">Chat</span>
              </div>
              <div className="ac-conv">
              <div className="ac-chat">
                <Collapse open={!s.asked}>
                  <div className="ac-empty">
                    <div className="ac-empty__title">Ask about your own trades</div>
                    <div className="tq-muted">Answers come from your journal. Pick a question or write your own.</div>
                    <div className="ac-starters">
                      {STARTERS.map((q, i) => (
                        <span key={q} className="ac-starter" data-target={`starter-${i}`} data-cursor="hand">
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                </Collapse>
                <Collapse open={s.asked} reveal="drop" from="below">
                  <div className="ac-q">{QUESTION}</div>
                </Collapse>
                <Collapse open={s.asked}>
                  <div className="ac-a">{s.thinking ? <span className="tq-muted">Thinking…</span> : <Stream text={ANSWER} count={s.words} />}</div>
                </Collapse>
              </div>
              <div className="ac-composer">
                <span className="tq-muted">Ask about your trading…</span>
                <span className="ac-send">
                  <ArrowUp />
                </span>
              </div>
              </div>
            </div>
          </div>
          <span data-target="rest" style={{ position: 'absolute', left: 330, top: 110 }} />
        </>
      )}
    </Stage>
  );
}
