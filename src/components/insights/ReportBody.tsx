import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { KIND_LABEL, orderSections, ruleTextFrom, trueMinus } from '@/lib/ai/insightFormat';
import { isWeekPeriod } from '@/lib/ai/reviewFormat';
import { ACCOUNT_SAMPLE_TEXT, sampleLabel } from '@/lib/evidence';
import { formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Insight, InsightSection } from '@/types/insights';
import { WeeklyReview } from './WeeklyReview';

interface ReportBodyProps {
  insight: Insight;
  title: string;
  currency?: string;
  onOpenTrades: (ids: string[]) => void;
  onMakeRule: (text: string) => void;
  onCopy: () => void;
  chat: React.ReactNode;
  /** the report was made for accounts in more than one currency: its money figures add them together */
  mixedCurrency?: boolean;
  /** the trader's Use my notes setting as it is now */
  useNotes: boolean;
}

const KIND_TONE: Record<InsightSection['kind'], string> = {
  leak: 'text-loss',
  strength: 'text-profit',
  pattern: 'text-foreground-soft',
  action: 'text-foreground-soft',
};

function Figure({ section, currency }: { section: InsightSection; currency?: string }) {
  const m = section.metric;
  if (!m) return null;
  return (
    <span className="text-right text-13 text-foreground-soft">
      {m.label}:{' '}
      {m.unit === 'currency' && currency && m.value !== null ? <Money value={m.value} currency={currency} /> : <span className="font-mono tabular-nums">{trueMinus(m.display)}</span>}
    </span>
  );
}

/** What is sent with a report: a report that used the notes says so; otherwise the sentence follows the setting. */
function notesSentence(insight: Insight, useNotes: boolean): string {
  if (insight.review?.fromNotes) return 'This report used your notes: the notes and key lessons of its trades were sent too.';
  return useNotes
    ? 'Use my notes is on: new reports also send the notes and key lessons of their trades.'
    : 'Your notes and key lessons are sent only if you switch on Use my notes.';
}

/**
 * One report: basis line and then either the weekly review (insights that carry `review`) or, for older reports, the
 * summary and findings ordered by money impact.
 */
export function ReportBody({ insight, title, currency, onOpenTrades, onMakeRule, onCopy, chat, mixedCurrency, useNotes }: ReportBodyProps) {
  const review = insight.review;
  const sections = review ? [] : orderSections(insight.sections);
  const label = sampleLabel(insight.tradeCount);
  return (
    <article aria-label="Report" className="max-w-3xl space-y-4">
      <header className="space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            {chat}
            <Button type="button" size="sm" variant="outline" onClick={onCopy}>Copy summary</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {insight.tradeCount} trades{review && label !== 'established' ? ` (${ACCOUNT_SAMPLE_TEXT[label].charAt(0).toLowerCase()}${ACCOUNT_SAMPLE_TEXT[label].slice(1)})` : ''}
          {review && <> · net <Money value={review.verdict.net} currency={currency} /></>} · {formatDateShort(insight.period.from, true)} – {formatDateShort(insight.period.to, true)} · generated {formatDateShort(insight.createdAt, true)}
        </p>
        {insight.truncated && <p className="text-xs text-warning">Based on the oldest {insight.tradeCount} trades of the period. The period held more than could be analysed.</p>}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none underline-offset-2 hover:underline">How this is calculated</summary>
          <p className="mt-1 max-w-prose">
            {review
              ? 'TradeQut calculates every figure from your trades: the verdict, what each behaviour cost in money and R, whether a focus rule was kept, and which patterns have enough trades to judge, against your previous 90 days.'
              : 'TradeQut calculates counts, win rate, net P&L, fees, expectancy, drawdown, streaks and rule-based findings from your trades.'}{' '}
            Those figures, not individual trades, screenshots, names or email, are sent through OpenRouter to OpenAI, which writes the wording. {notesSentence(insight, useNotes)} Every
            number shown comes from the calculation.
          </p>
        </details>
      </header>
      {mixedCurrency && (
        <p role="note" className="max-w-prose border-l-2 border-warning pl-3 text-13 text-foreground-soft">
          Figures mix currencies — regenerate for one account.
        </p>
      )}
      {review ? (
        <WeeklyReview key={insight.id} insight={insight} review={review} isWeek={isWeekPeriod(insight.period.from, insight.period.to)} onOpenTrades={onOpenTrades} />
      ) : (
        <>
          <p className="max-w-prose text-sm">{trueMinus(insight.summary)}</p>
          <ul className="divide-y divide-border border-y border-border">
            {sections.map((s, i) => (
              <li key={`${s.kind}-${i}`} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
                <span className={cn('text-xs font-semibold', KIND_TONE[s.kind])}>{KIND_LABEL[s.kind]}</span>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <h3 className="text-sm font-medium">{s.title}</h3>
                    <Figure section={s} currency={currency} />
                  </div>
                  <p className="max-w-prose whitespace-pre-wrap text-13 text-foreground-soft">{trueMinus(s.body)}</p>
                  {((s.tradeIds && s.tradeIds.length > 0) || s.kind === 'leak') && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {s.tradeIds && s.tradeIds.length > 0 && (
                        <Button type="button" size="sm" variant="outline" onClick={() => onOpenTrades(s.tradeIds ?? [])}>
                          View {s.tradeIds.length} {s.tradeIds.length === 1 ? 'trade' : 'trades'}
                        </Button>
                      )}
                      {s.kind === 'leak' && (
                        <Button type="button" size="sm" variant="outline" onClick={() => onMakeRule(ruleTextFrom(s))}>
                          Make this a rule
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
