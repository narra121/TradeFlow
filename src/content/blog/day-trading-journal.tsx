import { Link } from 'react-router-dom';

export default function DayTradingJournal() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Time-of-Day Analysis</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Day trading performance is not evenly distributed across the session. Most day traders have specific windows
        where their strategies work best, and other periods where their results are flat or negative. The opening
        30 minutes typically offer the highest volatility and widest range, which favors momentum and breakout
        strategies. The midday lull between 11:30 AM and 1:30 PM (US Eastern) sees reduced volume and choppy,
        range-bound action that traps traders who expect continuation moves.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Your journal should record the exact entry time for every trade. After accumulating 50 or more trades, group
        your performance by hour of the day. The results will likely surprise you. Many traders discover that 70% or
        more of their profits come from the first and last hours of the session, while the middle of the day is a net
        loser. Once you see this pattern in your data, the logical response is to stop trading during your
        unprofitable hours. This single adjustment can transform a breakeven trader into a profitable one. Use the{' '}
        <Link to="/blog/trading-analytics-find-edge" className="text-primary hover:text-primary/80">hourly analytics breakdown</Link>{' '}
        to visualize these patterns clearly.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Overtrading Detection</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Overtrading is the most common and most destructive habit among day traders. It manifests in two forms:
        taking too many trades in a single session, and trading when there are no valid setups. Both forms share the
        same root cause: the inability to sit still and wait. Day traders feel pressure to be active because they
        have dedicated time to trading and want to see results. But activity and productivity are not the same thing
        in trading.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A journal reveals overtrading through simple metrics. Track your trade count per day alongside your daily{' '}
        <Link to="/glossary#pnl" className="text-primary hover:text-primary/80">P&L</Link>. If you consistently
        see that days with 5 or more trades have lower average P&L than days with 2 to 3 trades, you have a
        quantified overtrading problem. The fix is a hard daily trade limit as part of your{' '}
        <Link to="/blog/why-trading-rules-matter" className="text-primary hover:text-primary/80">trading rules</Link>.
        Start restrictive (3 trades per day) and only loosen the limit if your data shows that additional trades
        maintain the same quality as your first few.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Scalping-Specific Metrics</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Scalpers operate on a different plane from other day traders. Positions are held for seconds to minutes,
        targets are measured in ticks rather than points, and commission costs represent a significant percentage of
        gross profit. A scalping journal must track metrics that other traders can ignore.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Average hold time:</strong> Scalps should last seconds to a few minutes.
          If your average hold time creeps above 10 minutes, you are holding losers too long and turning scalps into
          swing trades.
        </li>
        <li>
          <strong className="text-foreground">Ticks per trade:</strong> Track the raw tick/pip capture per trade
          independent of position size. This tells you whether your entries and exits are sharp, separate from your
          sizing decisions.
        </li>
        <li>
          <strong className="text-foreground">Commission as percentage of gross:</strong> If commissions consume more
          than 30% of your gross profits, your scalping edge is too thin. Either increase your average target, reduce
          trade count, or negotiate better commission rates with your broker.
        </li>
        <li>
          <strong className="text-foreground">Slippage tracking:</strong> Record the difference between your intended
          entry price and actual fill. For scalpers, even half a tick of adverse slippage per trade adds up to
          significant amounts over hundreds of trades.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Daily P&L Limits</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Every day trader needs both a daily loss limit and a daily profit target. The loss limit is non-negotiable:
        when you reach it, you stop trading for the day. A common guideline is to set the daily loss limit at 2 to 3
        times your average winning trade, or 1 to 2% of your account. This cap prevents catastrophic days that erase
        a week of profits.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The daily profit target is more nuanced. Some traders stop once they hit their target to protect gains. Others
        use a trailing approach: once they hit the target, they continue trading but tighten their risk parameters.
        Your journal data will tell you which approach works better for you. Look at days where you exceeded your
        target. Did the extra trades add to the profit, or did they give back gains? If trading beyond the target
        consistently produces worse results, enforce a hard stop. For traders pursuing{' '}
        <Link to="/blog/prop-trading-challenges" className="text-primary hover:text-primary/80">prop firm challenges</Link>,
        daily loss limits are especially critical since exceeding the firm's daily{' '}
        <Link to="/glossary#drawdown" className="text-primary hover:text-primary/80">drawdown</Link> limit means
        instant failure.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Pre-Market and Post-Market Routines</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Professional day traders do not just show up and start clicking. They have structured routines before and
        after the trading session that are as important as the trades themselves.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A pre-market routine should take 15 to 30 minutes: review overnight price action and gap levels, check the
        economic calendar, mark key support and resistance levels, and set a game plan for the first 30 minutes.
        This preparation primes you to act decisively when opportunities appear.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A post-market routine is where real learning happens. Spend 15 minutes reviewing every trade, noting your
        emotional state, tagging rule compliance, and writing one sentence about what you did well and one about what
        to improve. This daily micro-review compounds into significant skill development over weeks and months.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Day Trader's Review Cycle</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Daily reviews catch tactical issues. Weekly reviews reveal patterns. Monthly reviews measure genuine progress
        against your{' '}
        <Link to="/blog/build-trading-plan" className="text-primary hover:text-primary/80">trading plan</Link> goals.
        Each review level serves a different purpose, and skipping any of them creates blind spots.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The daily review (5 to 10 minutes) focuses on execution: did you follow your rules and how was your
        emotional state. The weekly review (30 minutes on the weekend) examines aggregated data: win rate by day,
        average{' '}
        <Link to="/glossary#risk-reward-ratio" className="text-primary hover:text-primary/80">risk-to-reward ratio</Link>,
        trade count trends, and P&L curve. The monthly review (1 hour at month end) evaluates whether your strategy
        is still working, whether your rules need adjustment, and whether you are progressing toward your goals.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The traders who consistently improve are not those who trade the most but those who review the most.
        TradeQut automates data collection so your review time is spent analyzing and adjusting rather than entering
        numbers into a spreadsheet. A review process you actually follow beats a complex one you abandon after two weeks.
      </p>
    </>
  );
}
