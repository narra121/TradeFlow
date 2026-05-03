import { Link } from 'react-router-dom';

export default function HowToReviewTrades() {
  return (
    <>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Logging trades is step one. Reviewing them is where the actual improvement happens. Without
        regular review, your journal is just a database — full of valuable information that nobody
        ever reads. A structured weekly review transforms raw trade data into actionable insights
        that compound over months and years.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Why Weekly Reviews Beat Daily Reviews
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Daily reviews sound disciplined, but they have a critical flaw: one day of data is too small
        a sample to reveal meaningful patterns. If you took three trades today and two were winners,
        your daily "insight" is that your win rate was 67%. Tomorrow it might be 20%. Neither number
        tells you anything useful because the sample size is too small.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Weekly reviews give you 15-40 trades (for active day traders) or 5-10 (for swing traders) —
        enough to start seeing real patterns. You can identify whether a losing Monday was an
        anomaly or part of a recurring "Monday morning overtrading" habit. You can see whether your
        strategy performed differently in trending versus choppy markets. These patterns only emerge
        when you look at clusters of trades rather than individual ones.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Daily reviews also create analysis paralysis. When you dissect every single trade in
        isolation, you risk over-optimizing for noise. A trade that lost money might have been a
        perfectly executed setup that simply did not work out — that is expected and healthy. Only
        by looking at groups of similar trades can you distinguish between execution problems and
        normal variance.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        The Weekly Review Checklist
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Follow these six steps every week. The entire process takes 20-30 minutes once you are
        familiar with it.
      </p>
      <ol className="list-decimal pl-6 space-y-3 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Check your numbers.</strong> Open your journal and look
          at the week's summary:{' '}
          <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">
            win rate
          </Link>
          , total P&L, number of trades, and average{' '}
          <Link to="/glossary#risk-reward-ratio" className="text-primary hover:text-primary/80">
            risk-reward ratio
          </Link>
          . Compare these to your trailing averages. Are you improving, declining, or flat?
        </li>
        <li>
          <strong className="text-foreground">Review your biggest loss.</strong> Pull up the single
          worst trade of the week. Read your notes and look at the screenshot. Was the loss due to
          a bad setup, poor execution, or an external event? Could you have avoided it? If the
          answer is "I followed my plan and the trade did not work," move on — that is normal.
        </li>
        <li>
          <strong className="text-foreground">Review your biggest win.</strong> Same process, but
          look for what you did right. Was this a well-executed setup or a lucky entry? Did you
          manage the trade correctly or did you get bailed out by a news spike? The goal is to
          separate skill from luck so you can replicate the former.
        </li>
        <li>
          <strong className="text-foreground">Count broken rules.</strong> If you track{' '}
          <Link to="/glossary#trading-rules" className="text-primary hover:text-primary/80">
            trading rules
          </Link>{' '}
          in your journal, count how many times you broke them this week. Compare to last week.
          Improvement here — even if your P&L is flat — means you are building discipline. A trader
          who follows their rules and loses is in a far better position than one who breaks rules
          and wins.
        </li>
        <li>
          <strong className="text-foreground">Look for recurring mistakes.</strong> Scan through the
          "mistakes" field across all of this week's entries. Do you see the same mistake appearing
          more than once? Moving stops, chasing entries, oversizing — if a mistake repeats, it is
          not a slip, it is a habit. Write it down and create a specific rule to address it next
          week.
        </li>
        <li>
          <strong className="text-foreground">Set one focus for next week.</strong> Based on
          everything above, choose exactly one thing to work on. Not three, not five — one. "I will
          not trade after 2:00 PM" or "I will size every position at 1% risk maximum." A single
          focus point is achievable. A laundry list is overwhelming.
        </li>
      </ol>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        What Patterns to Look For
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        As your journal grows over weeks and months, certain patterns become visible that are
        impossible to detect in real time. Here are the most valuable ones to watch for:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Time-of-day edges.</strong> Many traders have a
          clear "sweet spot" — specific hours when their setups work and other hours when they
          consistently underperform. Your analytics will show your P&L broken down by hour. If
          your first hour is profitable and your last hour is not, you have found an actionable
          edge.
        </li>
        <li>
          <strong className="text-foreground">Strategy performance divergence.</strong> You might
          trade three different setups. Over 50 trades, one has a 65% win rate and the others are
          below 45%. Without data, you might feel equally confident in all three. With data, you
          can allocate more size to the winning strategy and reduce or eliminate the losers.
        </li>
        <li>
          <strong className="text-foreground">Emotional triggers.</strong> Trades tagged with
          "anxious" or "frustrated" almost always underperform trades tagged with "calm" or
          "focused." The correlation between emotional state and trade outcome is one of the most
          consistent findings in trading journals.
        </li>
        <li>
          <strong className="text-foreground">Day-of-week effects.</strong> Some traders
          consistently lose money on Mondays (anticipation-driven overtrading) or Fridays
          (position squaring before the weekend). Weekly data makes this visible.
        </li>
        <li>
          <strong className="text-foreground">Winning and losing streaks.</strong> Track how you
          perform after three consecutive wins or losses. Many traders become reckless after
          wins and overly cautious after losses — both states hurt performance.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Monthly vs Weekly Reviews
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Weekly reviews focus on tactical adjustments: specific mistakes, rule adherence, and
        short-term patterns. Monthly reviews are strategic. At the end of each month, you should
        step back and ask bigger questions.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>Is my overall{' '}
          <Link to="/glossary#profit-factor" className="text-primary hover:text-primary/80">
            profit factor
          </Link>{' '}
          improving, declining, or flat month over month?
        </li>
        <li>Am I sticking to the focus areas I set in my weekly reviews?</li>
        <li>Are there strategies I should add, modify, or drop entirely?</li>
        <li>How does my current{' '}
          <Link to="/glossary#drawdown" className="text-primary hover:text-primary/80">
            drawdown
          </Link>{' '}
          compare to my maximum acceptable drawdown?
        </li>
        <li>Am I on track for my quarterly and annual goals?</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Monthly reviews use the same data as weekly reviews but ask different questions. They also
        provide the sample size needed for statistically meaningful conclusions. Fifty trades is a
        decent sample. Two hundred is strong. Do not make major strategy changes based on a single
        bad week.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Building the Habit</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The review habit fails when it is treated as optional. The most effective approach is to
        block a specific time on your calendar and treat it as non-negotiable. Sunday evening works
        well for most traders because it provides closure on the previous week and mental
        preparation for the next one.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Set a timer for 30 minutes. Open your journal, run through the six-step checklist, and
        write down your one focus for next week. When the timer goes off, stop. You do not need to
        analyze every trade in microscopic detail. The goal is consistency, not perfection. A
        mediocre review done every week is infinitely more valuable than a thorough review done once
        and then abandoned.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If you use{' '}
        <Link to="/blog/getting-started-tradequt" className="text-primary hover:text-primary/80">
          TradeQut
        </Link>
        , the analytics dashboard calculates most of these metrics automatically — win rate by
        strategy, P&L by time of day, broken rule counts, and streak analysis. Your weekly review
        becomes scanning a dashboard rather than manually crunching numbers, which cuts the time
        roughly in half.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-6">
        The traders who improve fastest are not the ones who trade the most — they are the ones who
        review the most. Twenty minutes of honest reflection each week will do more for your
        account than twenty hours of screen time without a plan.
      </p>
    </>
  );
}
