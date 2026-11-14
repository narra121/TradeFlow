import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Stage } from './kit/stage';
import type { Act } from './kit/act';
import { Collapse } from './kit/motion/Collapse';
import { Count } from './kit/motion/Count';
import { Roll } from './kit/motion/Roll';
import { Stream } from './kit/motion/Stream';
import { Button } from './kit/controls/Button';
import { Meter } from './kit/parts/Meter';
import { CARD_H, CARD_W } from './AnswerCards';
import { formatMoney, formatR } from '@/lib/format';
import { SAMPLE_CURRENCY, money, plural } from './sampleJournal';
import { SAMPLE_LABEL_TEXT, sampleReplay, sampleReview, sampleSequence } from './sampleAnalysis';
import './look.css';
import './answer-cards.css';

const W = CARD_W;
const H = CARD_H;
const cost = (value: number) => formatMoney(value, SAMPLE_CURRENCY);

const REPLAY = sampleReplay(1);
const REPLAY_DIFF = REPLAY.replayNet - REPLAY.actualNet;
/** The app's replay sentences (TradeFlow src/components/analysis/BehaviourPanels.tsx, `ruleText` and the result line). */
export const REPLAY_RULE = 'Stop for the day after 1 losing trade';
export const REPLAY_RESULT = `Without those ${plural(REPLAY.removed, 'trade')} the period would have ended ${cost(Math.abs(REPLAY_DIFF))} ${REPLAY_DIFF >= 0 ? 'higher' : 'lower'}.`;

export const WHATIF_ALT = `Sample data: Analytics, Behaviour tab. The rule “${REPLAY_RULE}” is replayed over the sample month: actual net ${money(REPLAY.actualNet)}, replayed net ${money(REPLAY.replayNet)}, ${REPLAY.removed} of ${plural(REPLAY.trades, 'trade')} not taken.`;

type WhatIfS = { busy: boolean; shown: boolean; rolled: boolean };
const WHATIF_DONE: WhatIfS = { busy: false, shown: true, rolled: true };

async function whatIfScript(a: Act<WhatIfS>) {
  await a.wait(700);
  await a.move({ at: 'replay', x: 0.7, y: 0.8 });
  await a.wait(200);
  await a.click();
  await a.set({ busy: true });
  await a.wait(600);
  await a.set({ busy: false, shown: true });
  await a.wait(500);
  await a.set({ rolled: true });
  await a.move('rest');
}

/** Analytics › Behaviour, "What if I had followed a rule?": one rule replayed over the sample month. */
export function WhatIfDemo({ play = true }: { play?: boolean }) {
  return (
    <Stage
      width={W}
      height={H}
      initial={{ busy: false, shown: false, rolled: false } as WhatIfS}
      poster={WHATIF_DONE}
      script={play ? whatIfScript : undefined}
      play="once"
      cursor={{ at: { x: 330, y: 338 } }}
      theme="dark"
      className="tq-look ac-demo"
    >
      {(s) => (
        <>
          <div className="tq-frame ac-frame">
            <div className="tq-frame__main">
              <div className="tq-frame__title">
                <span>Analytics</span>
              </div>
              <div className="ac-tabs">
                <span>Overview</span>
                <span>Edge</span>
                <span>Timing</span>
                <span>Risk</span>
                <span data-active="true">Behaviour</span>
              </div>
              <div className="ac-panel-title">
                <span>What if I had followed a rule?</span>
              </div>
              <div className="ac-rule">
                <span className="ac-select">
                  Stop for the day after losing trades
                  <ChevronDown />
                </span>
                <span className="ac-rule__n">
                  <span className="tq-muted">Losing trades</span>
                  <span className="ac-input tq-num">1</span>
                </span>
                <Button variant="primary" size="medium" data-target="replay" data-cursor="hand">
                  {s.busy ? 'Replaying…' : 'Replay'}
                </Button>
              </div>
              <Collapse open={!s.shown}>
                <div className="ac-replay ac-replay--hint">Pick a rule and press Replay.</div>
              </Collapse>
              <Collapse open={s.shown}>
                <div className="ac-replay">
                  <div className="ac-replay__rule">{REPLAY_RULE}</div>
                  <div className="ac-replay__grid">
                    <span className="tq-muted">Actual net</span>
                    <span className="tq-muted">Replayed net</span>
                    <span className="tq-muted">Not taken</span>
                    <span className="ac-replay__v tq-num tq-pos">{money(REPLAY.actualNet)}</span>
                    <Count className={`ac-replay__v tq-num ${REPLAY.replayNet < 0 ? 'tq-neg' : 'tq-pos'}`} value={s.rolled ? REPLAY.replayNet : REPLAY.actualNet} format={money} />
                    <span className="ac-replay__v tq-num">
                      {REPLAY.removed} <small className="tq-muted">of {REPLAY.trades}</small>
                    </span>
                  </div>
                  <div className="ac-replay__say">{REPLAY_RESULT}</div>
                </div>
              </Collapse>
            </div>
          </div>
          <span data-target="rest" style={{ position: 'absolute', left: 330, top: 338 }} />
        </>
      )}
    </Stage>
  );
}

const REVIEW = sampleReview();
const weekLabel = (w: { from: number; to: number }) => `${w.from} – ${w.to} Nov`;
const weekFacts = (w: { trades: number; net: number }) => `${plural(w.trades, 'trade')} · ${money(w.net)}`;

export const REVIEW_ALT = `Sample data: the weekly review of ${weekLabel(REVIEW.first)} names ${REVIEW.first.theOne.title.toLowerCase()} as the one thing, with the rule “${REVIEW.focus.text}” Taken as the focus, the review of ${weekLabel(REVIEW.second)} reports it kept on ${REVIEW.focus.kept} of ${plural(REVIEW.focus.checked, 'trade')} and broken on ${REVIEW.focus.broken}, which cost ${cost(REVIEW.focus.cost)}.`;

type ReviewS = { focused: boolean; next: boolean };
const REVIEW_DONE: ReviewS = { focused: true, next: true };

async function reviewScript(a: Act<ReviewS>) {
  await a.wait(900);
  await a.move({ at: 'focus', x: 0.85, y: 0.85 });
  await a.wait(200);
  await a.click();
  await a.set({ focused: true });
  await a.wait(1300);
  await a.move('next-week');
  await a.wait(150);
  await a.click();
  await a.set({ next: true });
  await a.move('rest');
}

/**
 * Insights › Reports: the weekly review names one behaviour as an if-then rule; taken as the focus, the next week's review
 * counts how often it was kept. The poster is that second week.
 */
export function WeeklyReviewDemo({ play = true }: { play?: boolean }) {
  return (
    <Stage
      width={W}
      height={H}
      initial={{ focused: false, next: false } as ReviewS}
      poster={REVIEW_DONE}
      script={play ? reviewScript : undefined}
      play="once"
      cursor={{ at: { x: 320, y: 340 } }}
      theme="dark"
      className="tq-look ac-demo"
    >
      {(s) => {
        const week = s.next ? REVIEW.second : REVIEW.first;
        return (
          <>
            <div className="tq-frame ac-frame">
              <div className="tq-frame__main">
                <div className="tq-frame__title">
                  <span>Insights</span>
                </div>
                <div className="ac-week">
                  <span className="ac-week__label">
                    Weekly review · <Roll>{weekLabel(week)}</Roll>
                  </span>
                  <span className="ac-week__nav">
                    <i>
                      <ChevronLeft />
                    </i>
                    <i data-target="next-week" data-cursor="hand">
                      <ChevronRight />
                    </i>
                  </span>
                </div>
                <div className="ac-verdict">
                  <span>{week.headline}</span>
                  <small className="tq-num">
                    <Roll>{weekFacts(week)}</Roll>
                  </small>
                </div>
                <Collapse open={s.next}>
                  <div className="ac-block">
                    <div className="ac-block__label">Last week’s focus</div>
                    <div className="ac-block__rule">“{REVIEW.focus.text}”</div>
                    <div className="ac-kept">
                      <span>
                        Kept on {REVIEW.focus.kept} of {plural(REVIEW.focus.checked, 'trade')}
                      </span>
                      <Meter className="ac-kept__meter" value={s.next ? REVIEW.focus.kept / REVIEW.focus.checked : 0} tone="ink" />
                    </div>
                    <div className="ac-block__note">
                      Broken on {REVIEW.focus.broken}, which cost {cost(REVIEW.focus.cost)}
                    </div>
                  </div>
                </Collapse>
                <div className="ac-block">
                  <div className="ac-block__label">The one thing</div>
                  <div className="ac-one">
                    <span className="ac-one__name">
                      <Roll>{week.theOne.title}</Roll>
                    </span>
                    <span className="ac-one__cost tq-num">
                      <Roll>{`${plural(week.theOne.trades, 'trade')} · ${money(-week.theOne.cost)}`}</Roll>
                    </span>
                  </div>
                  <Collapse open={!s.next}>
                    <div className="ac-block__rule">“{REVIEW.focus.text}”</div>
                    <div className="ac-block__action">
                      <Button variant={s.focused ? 'secondary' : 'primary'} size="medium" icon={s.focused ? <Check /> : undefined} data-target="focus" data-cursor="hand">
                        {s.focused ? 'Your focus' : 'Make this my focus'}
                      </Button>
                    </div>
                  </Collapse>
                </div>
              </div>
            </div>
            <span data-target="rest" style={{ position: 'absolute', left: 320, top: 340 }} />
          </>
        );
      }}
    </Stage>
  );
}

/** One of the app's own starter questions (src/lib/ai/chatFormat.ts FIXED_STARTERS); a test keeps the two in step. */
export const CHAT_QUESTION = 'How do I perform after a losing trade?';
const OTHER_STARTER = 'Which setup has made me the most money?';
const SEQUENCE = sampleSequence();
const [AFTER_LOSS] = SEQUENCE.rows;
export const CHAT_ANSWER = `After a loss the same day: ${plural(AFTER_LOSS.trades, 'trade')}, ${AFTER_LOSS.wins} won, net ${money(AFTER_LOSS.net)}. Too early to rely on.`;
const ANSWER_WORDS = CHAT_ANSWER.split(' ').length;
/** The chat's line for a `sequence` calculation (src/lib/ai/chatFormat.ts `toolsLine`). */
export const CHAT_WORKING = 'Calculated: trades after a loss or a win';
const TABLE_CAPTION = `Table 1 · ${SAMPLE_LABEL_TEXT[SEQUENCE.label]}`;

export const CHAT_ALT = `Sample data: Insights chat answering “${CHAT_QUESTION}” with a calculated table: ${SEQUENCE.rows.map((r) => `${r.group.toLowerCase()}, ${plural(r.trades, 'trade')}, net ${money(r.net)}`).join('; ')}; captioned “${SAMPLE_LABEL_TEXT[SEQUENCE.label]}”.`;

type ChatS = { asked: boolean; thinking: boolean; words: number; table: boolean };
const CHAT_DONE: ChatS = { asked: true, thinking: false, words: ANSWER_WORDS, table: true };

async function chatScript(a: Act<ChatS>) {
  await a.wait(700);
  await a.move({ at: 'starter-0', x: 0.92, y: 0.8 });
  await a.wait(200);
  await a.click();
  await a.set({ asked: true, thinking: true });
  await a.move('rest');
  await a.wait(500);
  await a.set({ thinking: false });
  await a.wait(450);
  for (let n = 1; n <= ANSWER_WORDS; n++) {
    a.put({ words: n });
    await a.wait(55);
  }
  await a.wait(150);
  await a.set({ table: true });
}

/** Insights › Chat: a starter question is answered by a calculation; the app draws the table, the sentence only reads it out. */
export function ChatAnswerDemo({ play = true }: { play?: boolean }) {
  return (
    <Stage
      width={W}
      height={H}
      initial={{ asked: false, thinking: false, words: 0, table: false } as ChatS}
      poster={CHAT_DONE}
      script={play ? chatScript : undefined}
      play="once"
      cursor={{ at: { x: 336, y: 96 } }}
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
              <div className="ac-chat">
                <Collapse open={!s.asked}>
                  <div className="ac-empty">
                    <div className="ac-empty__title">Ask about your own trades</div>
                    <div className="tq-muted">Answers are calculated from your journal, with the figures in a table. Pick a question or write your own.</div>
                    <div className="ac-starters">
                      {[CHAT_QUESTION, OTHER_STARTER].map((q, i) => (
                        <span key={q} className="ac-starter" data-target={`starter-${i}`} data-cursor="hand">
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                </Collapse>
                <Collapse open={s.asked} reveal="drop" from="below">
                  <div className="ac-q">{CHAT_QUESTION}</div>
                </Collapse>
                <Collapse open={s.asked}>
                  <div className="ac-a">
                    <span className="ac-a__working">
                      <Roll>{s.thinking ? 'Thinking…' : CHAT_WORKING}</Roll>
                    </span>
                    <Stream text={CHAT_ANSWER} count={s.words} />
                  </div>
                </Collapse>
                <Collapse open={s.table}>
                  <div className="ac-table">
                    <div className="ac-table__caption">{TABLE_CAPTION}</div>
                    <div className="ac-table__row ac-table__row--head">
                      <span>Group</span>
                      <span className="ac-r">Trades</span>
                      <span className="ac-r">Net P&amp;L</span>
                      <span className="ac-r">Avg R</span>
                    </div>
                    {SEQUENCE.rows.map((r) => (
                      <div key={r.group} className="ac-table__row">
                        <span className="ac-table__group">{r.group}</span>
                        <span className="ac-r tq-num">{r.trades}</span>
                        <span className="ac-r tq-num">{money(r.net)}</span>
                        <span className="ac-r tq-num">{formatR(r.avgR)}</span>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            </div>
          </div>
          <span data-target="rest" style={{ position: 'absolute', left: 336, top: 96 }} />
        </>
      )}
    </Stage>
  );
}
