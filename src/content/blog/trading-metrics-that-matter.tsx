import { Link } from 'react-router-dom';

export default function TradingMetricsThatMatter() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Beyond Win Rate — The Full Picture</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Most traders check their <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">win rate</Link> and
        call it a day. But win rate alone is one of the least reliable indicators of trading performance.
        A 70% win rate means nothing if your average loss is three times your average win. Professional
        traders track a suite of metrics that together reveal whether a strategy has a genuine edge, how
        sustainable that edge is, and where weaknesses hide. This article covers the metrics that separate
        guessing from systematic trading, with formulas and real examples so you can calculate each one
        from your own journal data.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Expectancy</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Expectancy tells you how much you can expect to make or lose per trade on average. It accounts
        for both the probability and magnitude of wins and losses.
      </p>
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <p className="text-foreground font-mono text-center">
          Expectancy = (Win% x Avg Win) - (Loss% x Avg Loss)
        </p>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Suppose your win rate is 55%, your average win is $200, and your average loss is $150. Your
        expectancy is: (0.55 x $200) - (0.45 x $150) = $110 - $67.50 = $42.50 per trade. Over 200
        trades per month, that is $8,500 in expected profit. Negative expectancy means your strategy
        loses money over time, regardless of any hot streak. A positive expectancy, even $5 per trade,
        becomes significant when multiplied by hundreds of trades.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Profit Factor</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <Link to="/glossary#profit-factor" className="text-primary hover:text-primary/80">Profit factor</Link> is
        the ratio of gross profit to gross loss. A profit factor of 1.5 means you make $1.50 for every
        $1.00 you lose. Above 1.0 is profitable, below 1.0 is unprofitable, and anything above 2.0 is
        considered strong. For a detailed breakdown of how profit factor interacts with win rate, including
        scenarios where high win rates lose money, read our dedicated article on{' '}
        <Link to="/blog/win-rate-vs-profit-factor" className="text-primary hover:text-primary/80">win rate versus
        profit factor</Link>.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        One advantage of profit factor over expectancy is simplicity: you do not need to calculate
        percentages. Just sum all your winning trade profits, sum all your losing trade losses (as a
        positive number), and divide. If you made $15,000 in winning trades and lost $9,000 in losing
        trades, your profit factor is 1.67. Track this number monthly to spot when your edge is
        strengthening or deteriorating.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Average R-Multiple</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        An R-multiple measures each trade's result as a multiple of the initial risk (R). If you risked
        $100 and made $250, the R-multiple is +2.5R. Lost your full $100 risk? That is -1R. Exited early
        with a $60 loss? That is -0.6R.
      </p>
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <p className="text-foreground font-mono text-center">
          R-Multiple = Trade P&L / Initial Risk (dollar amount at stop-loss)
        </p>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The average R-multiple normalizes expectancy by stripping out position size differences. A trader
        with a $10,000 account averaging +1.5R has equivalent skill to one with a $500,000 account at the
        same R-multiple. Track R-multiples instead of dollar amounts to eliminate the bias of thinking a
        $5,000 win was "better" than a $200 win. The $200 win might have been +3R while the $5,000 win
        was only +0.8R.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Sharpe Ratio for Traders</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The Sharpe ratio measures risk-adjusted returns: how much return you generate per unit of volatility.
      </p>
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <p className="text-foreground font-mono text-center">
          Sharpe Ratio = Average Return per Trade / Standard Deviation of Returns
        </p>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Above 1.0 indicates solid risk-adjusted performance. Above 2.0 is excellent, meaning returns come
        with remarkably low variation. Below 0.5 suggests noisy, inconsistent results even if positive on
        average. The Sharpe ratio penalizes wild equity swings: two strategies returning 30% annually are
        not equal if one has a Sharpe of 1.8 (smooth returns) and the other 0.6 (gut-wrenching{' '}
        <Link to="/blog/track-reduce-drawdown" className="text-primary hover:text-primary/80">drawdowns</Link>).
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Consecutive Wins and Losses</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Maximum consecutive losses (and wins) tell you what your worst psychological stretch looks like in
        practice. Even a profitable strategy with a 60% win rate can produce 8-10 consecutive losses over a
        large sample. The math of independent events guarantees this. Understanding your strategy's typical
        losing streak length prepares you mentally and helps you size positions appropriately.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If your maximum consecutive loss count is 7 and you risk 2% per trade, you should expect a 14%{' '}
        <Link to="/glossary#drawdown" className="text-primary hover:text-primary/80">drawdown</Link> at some point.
        Can you handle that emotionally? If not, reduce your risk per trade. Conversely, tracking maximum
        consecutive wins helps you avoid overconfidence. A streak of 12 wins does not mean your strategy
        has become invincible. It means you are statistically due for a correction, and your position sizing
        should remain disciplined.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Time-Based Metrics</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Your performance varies by time of day, day of week, and market session. Most traders have no idea
        that they consistently lose money during specific hours because they have never analyzed their
        results by time. Common patterns include:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">First 30 minutes:</strong> High volatility produces both the
          best and worst trades. Win rate often drops sharply when price action is noisy after the open.
        </li>
        <li>
          <strong className="text-foreground">Midday lull (11:30 AM - 1:30 PM):</strong> Volume dries up
          and setups become unreliable. Traders forcing trades here often show negative expectancy.
        </li>
        <li>
          <strong className="text-foreground">Day of week:</strong> Mondays and Fridays produce different
          conditions than mid-week. Monday gaps and Friday profit-taking may not suit your strategy.
        </li>
        <li>
          <strong className="text-foreground">Session overlaps:</strong> Forex traders often perform best
          during the London-New York overlap when liquidity peaks.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Choosing Metrics for Your Style</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Not every metric is equally important for every trading style. Focus on the metrics that match how
        you trade:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Scalpers (high-frequency, small moves):</strong> Win rate and
          average R-multiple are your primary metrics. You need a high win rate (65%+) because your average
          win is small. Monitor time-based metrics closely since scalping performance degrades sharply outside
          peak liquidity windows.
        </li>
        <li>
          <strong className="text-foreground">Day traders (intraday, moderate holds):</strong> Expectancy and
          profit factor tell you whether your edge is real. Track daily drawdown rigorously since your entire
          P&L resets each day.
        </li>
        <li>
          <strong className="text-foreground">Swing traders (multi-day to multi-week):</strong> Profit factor
          and maximum drawdown matter most. You will have a lower win rate but larger R-multiples. The Sharpe
          ratio helps you assess whether your returns justify the overnight and weekend risk.
        </li>
        <li>
          <strong className="text-foreground">Position traders (weeks to months):</strong> Maximum drawdown
          and Sharpe ratio are critical. With fewer trades, each one has outsized impact on your metrics.
          Consecutive loss tracking is essential for psychological preparation since each loss represents
          days or weeks of capital tied up in a failing trade.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Start with expectancy and profit factor regardless of your style. These two numbers answer the most
        fundamental question: does your strategy make money? Then layer in style-specific metrics and
        review your{' '}
        <Link to="/blog/risk-reward-ratio-guide" className="text-primary hover:text-primary/80">risk-reward
        ratios</Link> to ensure your trade management supports the edge your analysis provides.
      </p>
    </>
  );
}
