import { Link } from 'react-router-dom';

export default function HowToKeepTradingJournal() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Why Every Trader Needs a Journal
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Ask any consistently profitable trader what separates them from the 90% who lose money, and
        the answer almost always involves some form of record-keeping. A trading journal is not a
        nice-to-have productivity hack — it is the single most effective tool for turning random
        market participation into a structured, improvable process.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The reason is simple: human memory is unreliable, especially under the emotional stress of
        real money at risk. You might remember a winning trade from last Tuesday, but you probably
        do not remember that you entered it fifteen minutes too early, risked twice your normal
        position size, and only profited because the market gapped in your favor overnight. Without
        written records, you internalize a distorted version of reality — one that reinforces bad
        habits and hides the patterns that are actually costing you money.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A journal replaces gut feeling with data. It turns vague impressions like "I think I trade
        better in the morning" into concrete metrics: your{' '}
        <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">
          win rate
        </Link>{' '}
        between 9:30 and 11:00 AM is 62%, compared to 38% after 2:00 PM. That kind of insight is
        impossible to extract from memory alone, but trivially easy to pull from a well-maintained
        log.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        What to Record in Every Trade
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The goal of a journal entry is to capture enough information that you could reconstruct your
        decision-making process weeks or months later. At minimum, every entry should include these
        fields:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Symbol and direction</strong> — What you traded and
          whether you went long or short.
        </li>
        <li>
          <strong className="text-foreground">Entry and exit prices</strong> — The exact prices at
          which you opened and closed the position.
        </li>
        <li>
          <strong className="text-foreground">Position size</strong> — How many shares, lots, or
          contracts you traded.
        </li>
        <li>
          <strong className="text-foreground">Date and time</strong> — When you entered and exited,
          including the trading session.
        </li>
        <li>
          <strong className="text-foreground">Profit or loss</strong> — The realized{' '}
          <Link to="/glossary#pnl" className="text-primary hover:text-primary/80">
            P&L
          </Link>{' '}
          in your account currency.
        </li>
        <li>
          <strong className="text-foreground">Setup or strategy</strong> — The specific pattern or
          signal that prompted the trade (breakout, pullback, mean reversion, etc.).
        </li>
        <li>
          <strong className="text-foreground">Screenshots</strong> — A chart screenshot at entry and
          exit showing your marked levels.
        </li>
        <li>
          <strong className="text-foreground">Emotional state</strong> — Were you calm, anxious,
          impatient, or overconfident?
        </li>
        <li>
          <strong className="text-foreground">Mistakes and lessons</strong> — What you did wrong and
          what you would do differently next time.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If this looks like a lot, it is — but only the first few times. Once you have a{' '}
        <Link
          to="/blog/trading-journal-template"
          className="text-primary hover:text-primary/80"
        >
          consistent template
        </Link>
        , filling in each field takes under two minutes per trade. The payoff in self-awareness is
        enormous.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        The Psychological Benefits of Journaling
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Beyond raw data, the act of writing forces you to slow down and reflect. When you have to
        describe your emotional state in words — "I felt impatient after two hours without a setup
        and forced a trade on a weak signal" — you build self-awareness that is nearly impossible
        to develop through trading alone.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Journaling also creates accountability. When you know you will have to record a revenge
        trade or a broken rule, you are more likely to pause before clicking the button. Many
        traders report that the simple act of committing to write down every trade reduces impulsive
        behavior by 30-50%, even before they begin analyzing the data.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Over time, your journal becomes a personal textbook. Unlike generic trading courses, it
        contains lessons drawn from your own capital, your own markets, and your own psychological
        tendencies. No educator can give you that — only consistent self-documentation can.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        How to Build the Journaling Habit
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The biggest reason traders fail to keep a journal is not laziness — it is trying to do too
        much too soon. If you sit down after a volatile day with twelve trades and try to write
        paragraphs about each one, you will burn out within a week. Instead, follow these
        principles:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Start small.</strong> Begin with just three fields:
          symbol, P&L, and one sentence about why you took the trade. You can expand later.
        </li>
        <li>
          <strong className="text-foreground">Log during the session, not after.</strong> Entering
          data while the trade is fresh takes seconds. Waiting until the evening means you are
          reconstructing from memory, which defeats the purpose.
        </li>
        <li>
          <strong className="text-foreground">Set a fixed review time.</strong> Pick one day per week
          — Sunday evening works for most traders — and spend 20-30 minutes reading through your
          entries. This is where the real learning happens.
        </li>
        <li>
          <strong className="text-foreground">Use a template.</strong> A pre-built form with
          dropdowns and structured fields removes the decision of "what should I write?" and makes
          logging nearly automatic.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Common Excuses (And Why They Do Not Hold Up)
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">"I do not have time."</strong> Logging a trade takes
        under two minutes with a template. If you have time to place the trade, you have time to
        record it. The traders who say they are too busy are often the ones who spend hours staring
        at charts without a plan — time that would be far better spent reviewing past trades.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">"I remember my trades."</strong> You remember the
        outcome. You do not remember the context. Three months from now, you will not recall whether
        you entered that AAPL trade because of a breakout pattern or because you were bored after
        lunch. The details that feel obvious today vanish quickly.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">"It does not actually help."</strong> A journal that
        you never review does not help — that part is true. But a journal paired with a{' '}
        <Link to="/blog/how-to-review-trades" className="text-primary hover:text-primary/80">
          weekly review routine
        </Link>{' '}
        is the closest thing to a guaranteed edge in trading. The data does not lie, and patterns
        will emerge that you cannot see in real time.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Getting Started</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If you have never kept a trading journal, start today — not next Monday, not next month.
        Open your most recent trade, write down the symbol, your P&L, and one sentence about your
        decision. That is it. You have started.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        For a structured approach,{' '}
        <Link to="/signup" className="text-primary hover:text-primary/80">
          TradeQut
        </Link>{' '}
        provides a ready-made journal with built-in analytics, chart screenshots, goal tracking,
        and{' '}
        <Link to="/glossary#profit-factor" className="text-primary hover:text-primary/80">
          profit factor
        </Link>{' '}
        calculations — everything covered in this guide, available from day one. The free tier
        includes unlimited trade logging and full analytics, so there is no barrier to getting
        started.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-6">
        The traders who improve are the ones who measure. The ones who measure are the ones who
        journal. Everything else is just noise.
      </p>
    </>
  );
}
