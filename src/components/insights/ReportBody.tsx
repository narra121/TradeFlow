import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { KIND_LABEL, orderSections, ruleTextFrom, trueMinus } from '@/lib/ai/insightFormat';
import { formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Insight, InsightSection } from '@/types/insights';

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

/** One report: basis line, summary and findings ordered by money impact. Findings are a list; actions are plain buttons. */
export function ReportBody({ insight, title, currency, onOpenTrades, onMakeRule, onCopy, chat, mixedCurrency }: ReportBodyProps) {
  const sections = orderSections(insight.sections);
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
          {insight.tradeCount} trades · {formatDateShort(insight.period.from, true)} – {formatDateShort(insight.period.to, true)} · generated {formatDateShort(insight.createdAt, true)}
        </p>
        {insight.truncated && <p className="text-xs text-warning">Based on the oldest {insight.tradeCount} trades of the period. The period held more than could be analysed.</p>}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none underline-offset-2 hover:underline">How this is calculated</summary>
          <p className="mt-1 max-w-prose">
            TradeQut calculates counts, win rate, net P&amp;L, fees, expectancy, drawdown, streaks and rule-based findings from your trades. Those figures, not individual trades, notes, screenshots, names or email, are sent to Google Gemini, which writes the wording. Every number shown comes from the calculation.
          </p>
        </details>
      </header>
      {mixedCurrency && (
        <p role="note" className="max-w-prose border-l-2 border-warning pl-3 text-13 text-foreground-soft">
          Figures mix currencies — regenerate for one account.
        </p>
      )}
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
    </article>
  );
}
