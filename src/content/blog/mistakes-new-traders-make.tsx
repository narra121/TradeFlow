import { Link } from 'react-router-dom';

export default function MistakesNewTradersMake() {
  return (
    <>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Most new traders lose money not because they lack technical knowledge, but because they
        repeat the same behavioral mistakes without realizing it. These mistakes are invisible in
        real time — they only become obvious when you have data to look at. A trading journal
        surfaces these patterns and gives you the evidence needed to break the cycle.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Here are five of the most costly mistakes new traders make, and how a journal addresses
        each one.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The 5 Costly Mistakes</h2>

      <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">1. Revenge Trading</h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Revenge trading is the impulse to immediately re-enter the market after a loss, driven by
        the emotional need to "win it back." The trader abandons their strategy, increases position
        size, or trades a setup they would normally skip — all because the previous loss created an
        emotional wound that demands an immediate remedy.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The spiral is predictable: loss leads to impulsive re-entry, which leads to a larger loss
        due to poor decision-making, which intensifies the urge to trade again. A single bad trade
        can cascade into a day that wipes out a week of gains.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">How journaling fixes it:</strong> When you are required
        to log every trade with an emotional state tag, a pattern emerges quickly. You will see
        entries marked "frustrated" or "angry" clustered together with losses. The data makes the
        cycle undeniable. Many traders establish a personal rule after seeing this pattern: close
        the platform for 30 minutes after any loss that triggers negative emotions.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">2. Overtrading</h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Overtrading means taking more trades than your strategy justifies. It happens when traders
        confuse activity with productivity. Sitting in front of charts all day creates pressure to
        "do something," even when the market is not presenting valid setups. The result is a pile
        of low-quality trades that dilute or reverse the gains from good ones.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">How journaling fixes it:</strong> Your journal will show
        exactly how many trades you take per day and the{' '}
        <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">
          win rate
        </Link>{' '}
        of those trades. Most overtraders discover that their first three trades of the day are
        profitable on average, while trades four through ten are net negative. Setting a daily trade
        limit based on this data is one of the simplest improvements a new trader can make.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
        3. Trading Without a Plan
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A surprising number of new traders enter positions with no predefined entry criteria, stop
        loss, or profit target. They buy because a stock "looks like it is going up" or sell because
        they feel the market is "too high." Without a plan, every decision is improvised in real
        time under emotional pressure — the worst possible conditions for rational thinking.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">How journaling fixes it:</strong> A template with a
        mandatory "setup/strategy" field forces you to name the reason for every trade before or
        immediately after entry. If you cannot fill in the strategy field, you did not have a plan.
        After a few weeks, you will notice that "no strategy" entries have significantly worse
        outcomes than planned trades. This data is the push most traders need to{' '}
        <Link to="/blog/build-trading-plan" className="text-primary hover:text-primary/80">
          build a formal trading plan
        </Link>
        .
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
        4. Ignoring Risk Management
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        New traders focus obsessively on entries and almost entirely ignore risk. They do not set
        stop losses. They size positions based on how much money they want to make rather than how
        much they can afford to lose. They risk 10% of their account on a single trade and wonder
        why three consecutive losses put them in a hole they cannot climb out of.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">How journaling fixes it:</strong> Recording position
        size, stop loss level, and actual risk per trade forces you to confront the numbers. Your
        journal will calculate your average{' '}
        <Link
          to="/glossary#risk-reward-ratio"
          className="text-primary hover:text-primary/80"
        >
          risk-reward ratio
        </Link>{' '}
        and show whether you are risking too much relative to your potential reward. When you see
        that your average loss is three times your average win, the math of why you are losing money
        becomes inescapable.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
        5. Never Reviewing Your Trades
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Some traders do log their trades — and never look at them again. A journal without review is
        like a medical test you never read the results of. The data is there, but it has zero impact
        on your behavior because you never extracted the insights it contains.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground">How journaling fixes it:</strong> The fix here is not
        more logging — it is establishing a{' '}
        <Link to="/blog/how-to-review-trades" className="text-primary hover:text-primary/80">
          weekly review routine
        </Link>
        . Set aside 20-30 minutes every Sunday. Pull up your journal entries for the week. Look
        for recurring mistakes, strategies that worked, and emotional patterns. Write down one
        specific thing to improve next week. This single habit turns a static log into an active
        learning tool.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Common Thread</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        All five mistakes share a root cause: the trader is making decisions based on emotion and
        instinct rather than evidence and process. Revenge trading is driven by anger. Overtrading
        is driven by boredom or greed. No plan means no structure. Ignoring risk means ignoring
        math. Skipping reviews means ignoring reality.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A trading journal is the antidote to all of them because it introduces objectivity into a
        process that is naturally subjective. You cannot argue with your own data. When your journal
        shows a 23% win rate on afternoon trades, you either stop trading in the afternoon or you
        accept that you are willfully losing money. There is no middle ground.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The traders who survive their first year are not the ones with the best strategies — they
        are the ones who identified and eliminated their worst habits fastest. A journal is how you
        do that. Start with the{' '}
        <Link
          to="/blog/trading-journal-template"
          className="text-primary hover:text-primary/80"
        >
          trading journal template
        </Link>{' '}
        to build consistent logging habits, and commit to reviewing your data weekly. The mistakes
        will reveal themselves, and once you see them, you can fix them.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-6">
        Every profitable trader you admire made these exact same mistakes early on. The difference
        is that they recognized them, documented them, and built systems to prevent them. Your
        journal is that system.
      </p>
    </>
  );
}
