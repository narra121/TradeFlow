import { useState, type ReactNode } from 'react';
import { CalendarStage } from '@/components/showcase/CalendarStage';
import { TradeReviewDemo } from '@/components/showcase/TradeReviewDemo';
import { SAMPLE_MONTH, SAMPLE_RECENT, money, plural, sampleStats } from '@/components/showcase/sampleJournal';

/** CalendarStage's design size on the auth stage; auth.css reserves the same ratio (`.stage-box`). */
const JOURNAL_SIZE = { width: 760, height: 470 };

const MONTH = sampleStats();
/** The trade TradeReviewDemo marks as breaking a rule (its MARKED). */
const MARKED = SAMPLE_RECENT[1];
const MARKED_MONTH = sampleStats([{ pnl: MARKED.pnl, day: MARKED.day }]);

const JOURNAL_ALT = `Sample data: the TradeQut calendar for ${SAMPLE_MONTH.label}, each trading day tinted by its net P&L (month ${money(MONTH.net)}). ${plural(MONTH.brokenDays, 'day')} are marked because their trades broke a rule; those ${plural(MONTH.brokenTrades, 'trade')} cost ${money(MONTH.brokenRules)}.`;
const REVIEW_ALT = `Sample data: in Trades, a losing ${MARKED.symbol} ${MARKED.direction.toLowerCase()} is opened and marked as breaking a rule; the month's broken-rules cost goes from ${money(MONTH.brokenRules)} over ${plural(MONTH.brokenTrades, 'trade')} to ${money(MARKED_MONTH.brokenRules)} over ${plural(MARKED_MONTH.brokenTrades, 'trade')}.`;

/** The demo comes forward once (the landing page's reveal); its script starts when it has landed, so the cursor aims at settled targets. */
function Reveal({ children }: { children: (landed: boolean) => ReactNode }) {
  const [landed, setLanded] = useState(false);
  return (
    <div className="stage-reveal" onAnimationEnd={(e) => e.target === e.currentTarget && setLanded(true)}>
      {children(landed)}
    </div>
  );
}

/** Log in: the month fills in, then the cursor opens a rule-break day and the best day. */
export function JournalDemo({ paused }: { paused: boolean }) {
  return (
    <Reveal>
      {(landed) => (
        <>
          <div role="img" aria-label={JOURNAL_ALT}>
            <div aria-hidden="true" className="stage-demo" data-ss-fill>
              <CalendarStage play={landed && !paused} size={JOURNAL_SIZE} fillIn />
            </div>
          </div>
          <div className="stage-satellite" aria-hidden="true">
            <span>Broken rules · November</span>
            <strong className="tq-num tq-neg">{money(MONTH.brokenRules)}</strong>
            <span>
              {plural(MONTH.brokenTrades, 'trade')} · {plural(MONTH.brokenDays, 'day')}
            </span>
          </div>
        </>
      )}
    </Reveal>
  );
}

/** Reset: the calendar as a still, behind the card that says a reset leaves it alone. */
export function StillJournal() {
  return (
    <div className="stage-demo" data-ss-fill>
      <CalendarStage play={false} size={JOURNAL_SIZE} />
    </div>
  );
}

/** Sign up: the landing hero's demo, a trade marked as breaking a rule and the month's cost counting up. */
export function SignupDemo({ paused }: { paused: boolean }) {
  return (
    <Reveal>
      {(landed) => (
        <div role="img" aria-label={REVIEW_ALT}>
          <div aria-hidden="true" className="stage-demo" data-ss-fill>
            <TradeReviewDemo play={landed && !paused} />
          </div>
        </div>
      )}
    </Reveal>
  );
}
