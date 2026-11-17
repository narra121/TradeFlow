import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { useGetFocusRuleQuery } from '@/store/api/analysisApi';
import { useSetFocusMutation } from '@/store/api/insightsApi';
import { readApiError } from '@/lib/apiError';
import { trueMinus } from '@/lib/ai/insightFormat';
import { NOTE_SIDE, MEASURE_LABEL, PROCESS_WORD, RESULT_WORD, checkAgainText, historyText, measureValue, pct, processFacts, rText } from '@/lib/ai/reviewFormat';
import { plural } from '@/lib/evidence';
import { formatDayText } from '@/lib/format';
import { cn } from '@/lib/utils';
import { openTrialExpired } from '@/components/billing/readOnly';
import { useEntitlements } from '@/hooks/useEntitlements';
import type { FindingKey, Insight, Review, ReviewFinding } from '@/types/insights';
import { useFindingFeedback, type FindingAnswer } from './useFindingFeedback';

interface WeeklyReviewProps {
  insight: Insight;
  review: Review;
  /** 7-day period: history and "last week" wording apply */
  isWeek: boolean;
  onOpenTrades: (ids: string[]) => void;
}

type Feedback = ReturnType<typeof useFindingFeedback>;

const tradesButton = (ids: string[], onOpen: (ids: string[]) => void, label?: string) =>
  ids.length > 0 ? (
    <Button type="button" size="sm" variant="outline" onClick={() => onOpen(ids)}>
      {label ?? `View ${plural(ids.length, 'trade')}`}
    </Button>
  ) : null;

function Block({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-2 border-t border-border pt-4">
      <h3 id={id} className="text-xs font-semibold text-foreground-soft">
        {title}
        {sub && <span className="font-normal text-muted-foreground">{` · ${sub}`}</span>}
      </h3>
      {children}
    </section>
  );
}

/** Useful / Not useful for one finding; Not useful hides it (see useFindingFeedback). */
function FeedbackButtons({ title, value, onAnswer }: { title: string; value: FindingAnswer | null; onAnswer: (useful: boolean) => void }) {
  const useful = value?.useful === true;
  return (
    <div role="group" aria-label={`Was “${title}” useful?`} className="ml-auto flex items-center gap-1 text-xs">
      <button
        type="button"
        aria-pressed={useful}
        disabled={value?.phase === 'sending'}
        onClick={() => onAnswer(true)}
        className={cn('inline-flex h-7 items-center rounded px-2 underline-offset-2 hover:underline [@media(pointer:coarse)]:h-11', useful ? 'font-medium text-foreground' : 'text-muted-foreground')}
      >
        {useful ? 'Useful ✓' : 'Useful'}
      </button>
      <span aria-hidden="true" className="text-muted-foreground">·</span>
      <button
        type="button"
        disabled={value?.phase === 'sending'}
        onClick={() => onAnswer(false)}
        className="inline-flex h-7 items-center rounded px-2 text-muted-foreground underline-offset-2 hover:underline [@media(pointer:coarse)]:h-11"
      >
        Not useful
      </button>
    </div>
  );
}

/** A finding marked Not useful: one line in its place, with Undo while unsent and Show again after. */
function HiddenRow({ title, value, onUndo }: { title: string; value: FindingAnswer; onUndo: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1 text-xs text-muted-foreground">
      <span>
        Hidden: {title}. {value.phase === 'pending' ? 'It will be left out of your reviews for 30 days.' : 'Left out of your reviews for 30 days.'}
      </span>
      <button type="button" onClick={onUndo} disabled={value.phase === 'sending'} className="inline-flex h-7 items-center text-primary underline-offset-2 hover:underline [@media(pointer:coarse)]:h-11">
        {value.phase === 'pending' ? 'Undo' : 'Show again'}
      </button>
    </div>
  );
}

/**
 * Wraps one finding: hidden when marked Not useful, else the finding with Useful / Not useful under it. The error of a
 * failed answer is shown at the finding it belongs to.
 */
function Answerable({ k, title, fb, children }: { k: FindingKey; title: string; fb: Feedback; children: (feedback: React.ReactNode) => React.ReactNode }) {
  const value = fb.answerOf(k);
  const err = fb.error?.key === k ? <p role="alert" className="text-xs text-loss">{fb.error.message}</p> : null;
  if (value && !value.useful) return <>{err}<HiddenRow title={title} value={value} onUndo={() => fb.undo(k)} /></>;
  return (
    <>
      {children(<FeedbackButtons title={title} value={value} onAnswer={(u) => fb.answer(k, u)} />)}
      {err}
    </>
  );
}

function FocusAction({ finding }: { finding: ReviewFinding }) {
  const { data: focus } = useGetFocusRuleQuery();
  const [setFocus, { isLoading }] = useSetFocusMutation();
  const { readOnly } = useEntitlements();
  const [failed, setFailed] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  if (!finding.rule) return null;
  const rule = finding.rule;
  const isCurrent = !!focus && focus.text.trim() === finding.ruleText.trim();
  const make = async () => {
    setFailed(null);
    if (readOnly) return openTrialExpired();
    try {
      await setFocus({ rule, text: finding.ruleText, findingKey: finding.key }).unwrap();
      setAnnounce('Focus set');
    } catch (e) {
      setFailed(readApiError(e, 'Couldn’t set the focus. Try again.').message);
    }
  };
  return (
    <div className="space-y-1">
      {isCurrent ? (
        <p className="text-xs text-foreground-soft">
          This is your focus{focus.startedAt ? ` since ${formatDayText(focus.startedAt, true)}` : ''}. Each weekly review checks whether you kept it.
        </p>
      ) : (
        <>
          <Button type="button" size="sm" onClick={() => void make()} disabled={isLoading}>
            {isLoading ? 'Setting focus…' : 'Make this my focus'}
          </Button>
          {focus && <p className="text-xs text-muted-foreground">Replaces your current focus: “{focus.text}”</p>}
        </>
      )}
      {failed && <p role="alert" className="text-xs text-loss">{failed}</p>}
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
    </div>
  );
}

function FindingBody({ f, currency, isWeek, primary, onOpenTrades, feedback }: { f: ReviewFinding; currency?: string; isWeek: boolean; primary: boolean; onOpenTrades: (ids: string[]) => void; feedback: React.ReactNode }) {
  const history = historyText(f.history, isWeek);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <h4 className={cn('font-medium', primary ? 'text-sm' : 'text-13')}>{f.title}</h4>
        <span className="text-13 text-foreground-soft">
          {plural(f.trades, 'trade')} · cost <Money value={f.cost} currency={currency} sign={false} neutral />
          {/* 0R beside a money cost reads as a contradiction (the trades' R can net out); the server's sentence omits it too. */}
          {!!f.costR && <span className="font-mono tabular-nums"> ({rText(f.costR).replace('+', '')})</span>}
        </span>
      </div>
      {history && <p className="text-xs font-medium text-foreground-soft">{history}</p>}
      <p className="max-w-prose text-13 text-foreground-soft">{trueMinus(f.text)}</p>
      {f.basis === 'evidence' && <p className="text-xs text-muted-foreground">Leak over {plural(f.evidenceTrades, 'trade')}, this period and the 90 days before it.</p>}
      {f.overlaps.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Same trades as {f.overlaps.map((o) => `${o.title} (${o.shared})`).join(', ')}: their money is counted here once.
        </p>
      )}
      <p className="max-w-prose border-l-2 border-primary/60 pl-3 text-13">
        <span className="text-xs text-muted-foreground">If-then rule: </span>
        {f.ruleText}
      </p>
      <div className="flex flex-wrap items-start gap-2 pt-0.5">
        {tradesButton(f.tradeIds, onOpenTrades, f.tradeIds.length < f.trades ? `View ${f.tradeIds.length} of ${f.trades} trades` : undefined)}
        {primary && <FocusAction finding={f} />}
        {feedback}
      </div>
    </div>
  );
}

/** The weekly review of report §5.2, in its fixed order. Every figure is the server's; the texts are checked there. */
export function WeeklyReview({ insight, review: r, isWeek, onOpenTrades }: WeeklyReviewProps) {
  const fb = useFindingFeedback(insight);
  const currency = r.currency ?? undefined;
  const v = r.verdict;
  const findings = [r.theOne, ...r.more].filter((f): f is ReviewFinding => f !== null);

  return (
    <div className="space-y-4">
      <section aria-labelledby="review-verdict" className="space-y-2">
        <h3 id="review-verdict" className="text-xs font-semibold text-foreground-soft">Verdict</h3>
        <p className="max-w-prose text-base font-semibold">{trueMinus(v.headline)}</p>
        {/* The server falls back to the headline when the model's wording is rejected: never print it twice. */}
        {v.text.trim().replace(/[.!]+$/, '') !== v.headline.trim().replace(/[.!]+$/, '') && <p className="max-w-prose text-sm text-foreground-soft">{trueMinus(v.text)}</p>}
        <dl className="grid gap-x-6 gap-y-2 pt-1 text-13 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Result</dt>
            <dd>
              <span className="font-medium">{RESULT_WORD[v.result]}</span> · <Money value={v.net} currency={currency} />
              {v.netR !== null && <> · <span className="font-mono tabular-nums">{rText(v.netR)}</span> over {plural(v.tradesWithR, 'trade')} with a stop</>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Process</dt>
            <dd>
              <span className="font-medium">{PROCESS_WORD[v.process]}</span> · {processFacts(v, insight.tradeCount).join(' · ')}
            </dd>
          </div>
        </dl>
      </section>

      <Block title="The one thing">
        {findings.length === 0 ? (
          <p className="text-13 text-foreground-soft">No behaviour cost money this period.</p>
        ) : (
          <ul className="space-y-4">
            {findings.map((f, i) => (
              <li key={f.key} className={cn(i > 0 && 'border-t border-dashed border-border pt-3')}>
                {i === 1 && <p className="pb-1 text-xs font-semibold text-foreground-soft">Also costly</p>}
                <Answerable k={f.key} title={f.title} fb={fb}>
                  {(feedback) => <FindingBody f={f} currency={currency} isWeek={isWeek} primary={i === 0} onOpenTrades={onOpenTrades} feedback={feedback} />}
                </Answerable>
              </li>
            ))}
          </ul>
        )}
        {r.resolved.length > 0 && (
          <p className="text-xs text-foreground-soft">
            Resolved since last week: {r.resolved.map((x) => `${x.title} (${plural(x.lastWeekCount, 'trade')} last week, none this week)`).join('; ')}.
          </p>
        )}
      </Block>

      {r.lastFocus && (
        <Block title={isWeek ? 'Last week’s focus' : 'Your focus'}>
          <p className="max-w-prose text-13">
            “{r.lastFocus.ruleText}” <span className="text-xs text-muted-foreground">since {formatDayText(r.lastFocus.startedAt, true)}</span>
          </p>
          {r.lastFocus.checked === 0 ? (
            <p className="text-13 text-foreground-soft">No trade in this period could be checked against it.</p>
          ) : (
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-13">
              <div className="flex gap-1.5"><dt className="text-muted-foreground">Kept</dt><dd className="font-mono tabular-nums">{r.lastFocus.kept} of {r.lastFocus.checked}</dd></div>
              <div className="flex gap-1.5"><dt className="text-muted-foreground">Broken</dt><dd className="font-mono tabular-nums">{r.lastFocus.broken}</dd></div>
              {/* Breaks that lost nothing (a winning re-entry, say) have no cost to show; the server sentence leaves it out too. */}
              {r.lastFocus.cost > 0 && <div className="flex gap-1.5"><dt className="text-muted-foreground">The breaks cost</dt><dd><Money value={r.lastFocus.cost} currency={currency} sign={false} neutral /></dd></div>}
            </dl>
          )}
          <p className="max-w-prose text-13 text-foreground-soft">{trueMinus(r.lastFocus.text)}</p>
          {r.lastFocus.broken > 0 && tradesButton(r.lastFocus.brokenTradeIds, onOpenTrades, `View the ${plural(r.lastFocus.brokenTradeIds.length, 'trade')} that broke it`)}
        </Block>
      )}

      {r.keepDoing && (
        <Block title="Keep doing">
          <Answerable k={r.keepDoing.key} title={r.keepDoing.title} fb={fb}>
            {(feedback) => {
              const k = r.keepDoing!;
              return (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <h4 className="text-sm font-medium">{k.title}</h4>
                    <span className="text-13 text-foreground-soft">
                      {plural(k.trades, 'trade')} · win rate {pct(k.winRate)} · avg <span className="font-mono tabular-nums">{rText(k.avgR)}</span>
                    </span>
                  </div>
                  <p className="max-w-prose text-13 text-foreground-soft">{trueMinus(k.text)}</p>
                  <p className="text-xs text-muted-foreground">
                    Edge over {plural(k.trades, 'trade')} ({k.periodTrades} this period){k.avgRRange ? `; average R likely between ${rText(k.avgRRange.lo)} and ${rText(k.avgRRange.hi)}` : ''}.
                  </p>
                  <div className="flex">{feedback}</div>
                </div>
              );
            }}
          </Answerable>
        </Block>
      )}

      {r.different.length > 0 && (
        <Block title="Different from your normal" sub="against your last 12 weeks">
          <ul className="space-y-3">
            {r.different.map((d) => (
              <li key={d.key}>
                <Answerable k={d.key} title={MEASURE_LABEL[d.measure]} fb={fb}>
                  {(feedback) => (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-13">
                        <h4 className="font-medium">{MEASURE_LABEL[d.measure]}</h4>
                        <span className="text-foreground-soft">
                          <span className="font-mono tabular-nums text-foreground">{measureValue(d.measure, d.value, currency)}</span>, {d.direction} your usual{' '}
                          <span className="font-mono tabular-nums">{measureValue(d.measure, d.normalLo, currency)}–{measureValue(d.measure, d.normalHi, currency)}</span>
                        </span>
                      </div>
                      <p className="max-w-prose text-13 text-foreground-soft">{trueMinus(d.text)}</p>
                      <div className="flex">{feedback}</div>
                    </div>
                  )}
                </Answerable>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {r.fromNotes && (
        <Block title="From your notes">
          {r.fromNotes.length === 0 ? (
            <p className="text-13 text-foreground-soft">Your notes in this period showed no clear theme.</p>
          ) : (
            <ul className="space-y-3">
              {r.fromNotes.map((n, i) => (
                <li key={i} className="space-y-1">
                  <h4 className="text-13 font-medium">{n.theme}</h4>
                  <p className="text-xs text-muted-foreground">{NOTE_SIDE[n.side]}</p>
                  {n.quotes.map((q, qi) => (
                    <blockquote key={qi} className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-border pl-3 text-13 italic text-foreground-soft">
                      “{q.quote}”
                      <button type="button" onClick={() => onOpenTrades([q.tradeId])} className="not-italic text-xs text-primary underline-offset-2 hover:underline">
                        Open trade
                      </button>
                    </blockquote>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Block>
      )}

      {r.watch.length > 0 && (
        <Block title="Patterns to watch" sub="not enough trades to call">
          <ul className="space-y-3">
            {r.watch.map((w) => (
              <li key={w.key}>
                <Answerable k={w.key} title={w.title} fb={fb}>
                  {(feedback) => (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                        <h4 className="text-13 font-medium">{w.title}</h4>
                        <span className="text-13 text-foreground-soft">
                          {plural(w.trades, 'trade')}, {w.wins} won · <Money value={w.net} currency={currency} />
                          {w.avgR !== null && <> · <span className="font-mono tabular-nums">{rText(w.avgR)}</span> a trade</>}
                        </span>
                      </div>
                      <p className="max-w-prose text-13 text-foreground-soft">{trueMinus(w.text)}</p>
                      {w.paidSoFar && !/not evidence/i.test(w.text) && <p className="text-xs text-foreground-soft">It has paid so far, which is not evidence that it works.</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">{checkAgainText(w.evidenceTrades)}.</span>
                        {tradesButton(w.tradeIds, onOpenTrades)}
                        {feedback}
                      </div>
                    </div>
                  )}
                </Answerable>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {r.muted.length > 0 && (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          {r.muted.length === 1 ? '1 finding you marked not useful is' : `${r.muted.length} findings you marked not useful are`} left out of this review. A finding marked not useful stays out for 30 days.
        </p>
      )}
    </div>
  );
}
