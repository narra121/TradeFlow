import { Link } from 'react-router-dom';

export default function FtmoChallengeJournal() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Background</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Sarah had been trading forex for three years with a focus on EUR/USD, GBP/USD, and USD/JPY
        on the 15-minute and 1-hour charts. She was consistently profitable on her personal $5,000
        account, averaging 4&ndash;6% monthly returns. The logical next step was funded capital, so
        she applied for the FTMO $100,000 Challenge.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Her first attempt ended on day 9 when a single GBP/USD position during a Bank of England
        rate decision blew through her 5% daily drawdown limit. Her second attempt lasted 22 days
        &mdash; she hit the 10% profit target but violated the 5% max daily loss rule on day 14,
        invalidating the entire challenge. Both times, the failures came from the same source: a
        single oversized loss on a news-driven move.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The New Approach</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Before her third attempt, Sarah committed to tracking every trade in a journal with a
        specific focus on{' '}
        <Link to="/glossary" className="text-primary hover:underline">risk management</Link>{' '}
        metrics. She created a pre-trade checklist that she would fill out before clicking the buy or
        sell button. The checklist included: risk per trade in dollars and percentage, distance to
        stop loss in pips, whether any high-impact news was scheduled within 2 hours, and her current
        daily drawdown.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        She reviewed her two failed challenges and identified the exact moments where discipline
        broke down. In both cases, she had been up on the day, felt confident, and increased her
        position size right before the news event. The journal data from her personal account
        confirmed this pattern &mdash; her largest single-day losses always came after winning
        streaks of 3 or more trades.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Rules</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Sarah defined three non-negotiable rules and tracked compliance in her journal:
      </p>
      <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
        <li>
          <span className="font-medium text-foreground">Max 1% risk per trade.</span> On a $100K
          challenge, that meant $1,000 max loss per position. No exceptions, no &quot;high
          conviction&quot; overrides.
        </li>
        <li>
          <span className="font-medium text-foreground">3% daily stop.</span> If she lost $3,000 in
          a single day, she closed the platform &mdash; well below FTMO's 5% daily limit, giving
          herself a buffer.
        </li>
        <li>
          <span className="font-medium text-foreground">No trading 30 minutes before or after
          high-impact news.</span> No NFP, no rate decisions, no CPI. She marked these events in her
          calendar and logged compliance in her journal.
        </li>
      </ul>

      <div className="bg-card rounded-xl border border-border/50 p-6 my-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Results at a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Challenge Duration</p>
            <p className="text-lg font-semibold text-foreground">18 trading days</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Final Profit</p>
            <p className="text-lg font-semibold text-foreground">+$11,400 (11.4%)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Daily Drawdown</p>
            <p className="text-lg font-semibold text-foreground">-2.8% (limit: 5%)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Overall Drawdown</p>
            <p className="text-lg font-semibold text-foreground">-3.9% (limit: 10%)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-lg font-semibold text-foreground">57%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rule Violations</p>
            <p className="text-lg font-semibold text-foreground">0</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Challenge</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Sarah started her third FTMO Challenge on a Monday. The first week was slow &mdash; she took
        only 8 trades and finished up $2,100. By reviewing her journal each evening, she confirmed
        she was following all three rules with zero violations.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The real test came on day 11. She was up $7,800 and needed only $2,200 more to hit the 10%
        profit target. NFP was scheduled for Friday morning. In her previous attempts, this exact
        scenario &mdash; close to the target with a news event ahead &mdash; had triggered the
        &quot;just one big trade&quot; impulse. This time, she opened her journal, re-read her failed
        challenge entries, and logged: &quot;NFP tomorrow. No trades after 8:00 AM ET. Closing
        platform at 7:55 AM.&quot;
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        She sat out NFP entirely. The following Monday, she took two clean trades on EUR/USD during
        the London session and hit her profit target by 11:00 AM. Total time: 18 trading days, max
        daily drawdown of 2.8%, and zero rule violations logged in her journal.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Key Takeaway</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Sarah's trading skill was never in question &mdash; she had been profitable for three years.
        What she lacked was a system for enforcing discipline under the specific pressure of a prop
        firm evaluation. The journal served as both a planning tool and a{' '}
        <Link to="/blog" className="text-primary hover:underline">psychological anchor</Link>.
        By writing down her rules before each session and reviewing compliance at the end, she
        eliminated the gap between what she knew she should do and what she actually did. The same
        strategy that failed twice passed on the third attempt with room to spare.
      </p>
    </>
  );
}
