import { Link } from 'react-router-dom';

export default function BuildTradingPlan() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">What a Trading Plan Is (And What It Is Not)</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A trading plan is not a strategy. A strategy tells you when to buy and sell. A trading plan tells you how to
        behave as a trader across every situation you will encounter. It is the rulebook you write for yourself before
        the market opens, so that when emotions are running high and money is on the line, you already know what to do.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Think of a strategy as one component inside a much larger operating framework. Your plan covers everything from
        how much capital you risk on a single trade, to what you do after three consecutive losses, to how often you
        sit down and review your performance. Without a plan, even a profitable strategy will eventually fail because
        the trader behind it lacks structure. The market rewards consistency above all else, and consistency comes from
        planning, not from intuition.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Most traders skip the planning phase because it feels bureaucratic. They want to jump straight into charts and
        indicators. But ask any professional trader, fund manager, or prop firm evaluator, and they will tell you the
        same thing: a written plan separates traders who survive from traders who blow up.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The 7 Components of a Complete Trading Plan</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Every effective trading plan contains these seven elements. Some traders add more, but these are the
        non-negotiable foundation.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Entry Criteria:</strong> Define exactly what conditions must be met before
          you open a trade. This includes the technical setup (breakout, pullback, reversal pattern), the timeframe
          confirmation, and any filters like volume or volatility thresholds. If your criteria are vague, your entries
          will be inconsistent.
        </li>
        <li>
          <strong className="text-foreground">Exit Criteria:</strong> Plan your exits before you enter. Specify your{' '}
          <Link to="/glossary#take-profit" className="text-primary hover:text-primary/80">take profit</Link> target,
          your <Link to="/glossary#stop-loss" className="text-primary hover:text-primary/80">stop loss</Link> level,
          and any conditions that would cause you to close early (such as a time-based exit or a reversal signal).
        </li>
        <li>
          <strong className="text-foreground">Risk Per Trade:</strong> Define the maximum percentage of your account you
          will risk on any single trade. Most professional traders cap this between 0.5% and 2%. This number should
          never change based on how confident you feel about a setup.
        </li>
        <li>
          <strong className="text-foreground">Position Sizing:</strong> Calculate your{' '}
          <Link to="/glossary#position-sizing" className="text-primary hover:text-primary/80">position size</Link> based
          on your risk per trade and your stop distance. This ensures that every trade carries the same dollar risk
          regardless of the instrument or the stop loss width.
        </li>
        <li>
          <strong className="text-foreground">Daily and Weekly Limits:</strong> Set a maximum number of trades per day
          and a maximum loss per day. When you hit either limit, you stop trading. This prevents{' '}
          <Link to="/blog/day-trading-journal" className="text-primary hover:text-primary/80">overtrading</Link>, which
          is one of the most common reasons traders lose money.
        </li>
        <li>
          <strong className="text-foreground">Pre-Market Routine:</strong> Document what you do before the session
          starts. Review the economic calendar, mark key levels, check overnight price action, and set your bias.
          Traders who prepare outperform those who react.
        </li>
        <li>
          <strong className="text-foreground">Review Schedule:</strong> Schedule weekly and monthly reviews of your
          trading data. Look at win rates, average risk-reward, and whether you followed your plan. Improvement happens
          in the review, not during live trading.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Plan vs. Reality Tracking</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Writing a plan is the easy part. Following it is where traders struggle. The gap between what your plan says
        and what you actually do is the most valuable data you can collect. Every trade you take should be tagged with
        whether it followed your plan or deviated from it.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        When you track plan compliance over time, patterns emerge. You might discover that you follow your plan
        perfectly in the morning but abandon it in the afternoon when fatigue sets in. Or that you follow entry rules
        consistently but move your stop loss too early, violating your exit criteria. These insights are invisible
        without tracking. A{' '}
        <Link to="/blog/why-trading-rules-matter" className="text-primary hover:text-primary/80">rule-based framework</Link>{' '}
        makes it straightforward to measure compliance and identify where discipline breaks down.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">When to Update Your Plan</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Your trading plan is not a static document. It should evolve as you gain experience and as market conditions
        change. But updates must be deliberate, not reactive. Never modify your plan during a live trading session or
        after a losing streak when emotions are influencing your judgment.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The right time to update your plan is during your scheduled review. Look at your data over the past 30 to 50
        trades. If a rule is consistently violated without negative consequences, maybe it needs adjustment. If a new
        pattern in your data suggests an opportunity, test it on paper before adding it to your live plan. Keep a
        changelog of every modification so you can trace which changes improved your performance and which ones hurt it.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Using TradeQut to Track Plan Compliance</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        TradeQut is designed to make plan tracking effortless. When you log a trade, you can attach your trading rules
        and mark which ones you followed or broke. The{' '}
        <Link to="/blog/trading-analytics-find-edge" className="text-primary hover:text-primary/80">analytics dashboard</Link>{' '}
        then shows you your compliance rate over time, broken down by rule, by session, and by day of the week.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        You can set goals tied to plan adherence, such as following all rules on 90% of trades this month. The goals
        progress tracker shows your real-time compliance, so you always know where you stand. When you combine this
        with performance data, you can see the direct connection between following your plan and your{' '}
        <Link to="/glossary#pnl" className="text-primary hover:text-primary/80">P&L</Link>. That connection is the
        most powerful motivator for building discipline. The data proves that the plan works, and that proof makes it
        easier to follow the plan tomorrow.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A trading plan without tracking is just a wish list. Pair your plan with consistent journaling, review your
        data weekly, and iterate. Over time, the gap between plan and reality will shrink, and your trading results
        will reflect that discipline.
      </p>
    </>
  );
}
