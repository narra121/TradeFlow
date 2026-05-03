import { Link } from 'react-router-dom';

export default function WinRateVsProfitFactor() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">What Is Win Rate?</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">Win rate</Link> is the
        percentage of trades that end in profit. The formula is straightforward:
      </p>
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <p className="text-foreground font-mono text-center">
          Win Rate = (Number of Winning Trades / Total Number of Trades) x 100
        </p>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If you take 100 trades and 60 are profitable, your win rate is 60%. It is the first metric most
        traders learn, and the one they fixate on the longest. A high win rate feels good psychologically
        because every closed trade confirms your analysis. But win rate alone tells you nothing about how
        much you make when you win or how much you lose when you are wrong. A trader with a 90% win rate can
        still blow up an account if the 10% of losing trades are catastrophically large. This is the trap
        that catches beginners: chasing a high win rate without examining the quality of each win and loss.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">What Is Profit Factor?</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <Link to="/glossary#profit-factor" className="text-primary hover:text-primary/80">Profit factor</Link> measures
        the ratio between the money you make and the money you lose. The formula is:
      </p>
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <p className="text-foreground font-mono text-center">
          Profit Factor = Gross Profit / Gross Loss
        </p>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A profit factor of 1.0 means you are breaking even, every dollar won is offset by a dollar lost.
        A profit factor below 1.0 means you are losing money overall. Most professional traders aim for a
        profit factor of 1.5 or higher, meaning they earn $1.50 for every $1.00 they lose. A profit factor
        above 2.0 is considered excellent and indicates a strong edge in the market. Unlike win rate, profit
        factor captures both the frequency and the magnitude of wins and losses in a single number, making
        it a far more reliable indicator of whether your trading strategy actually generates money.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">When High Win Rate Loses Money</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Consider this scenario. A trader takes 100 trades with an 80% win rate. That sounds excellent on
        the surface. But look at the numbers:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>80 winning trades with an average gain of $50 each = $4,000 gross profit</li>
        <li>20 losing trades with an average loss of $300 each = $6,000 gross loss</li>
        <li>Net result: -$2,000 (a loss despite winning 80% of the time)</li>
        <li>Profit factor: $4,000 / $6,000 = 0.67</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This is not a contrived example. It is the reality for traders who refuse to take losses quickly.
        They hold losers far too long hoping for a reversal, turning what should be a $50 loss into a $300
        drawdown. Meanwhile, they cut winners short, banking small profits the moment a trade goes green.
        The win rate looks great in isolation, but the profit factor of 0.67 reveals the strategy is
        bleeding money. This pattern is common among traders who average down into losing positions or who
        refuse to use <Link to="/glossary#stop-loss" className="text-primary hover:text-primary/80">stop-loss</Link> orders.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">When Low Win Rate Makes Money</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Now consider the opposite scenario. A trader has only a 35% win rate. Most beginners would abandon
        this strategy immediately. But examine the numbers:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>35 winning trades with an average gain of $500 each = $17,500 gross profit</li>
        <li>65 losing trades with an average loss of $100 each = $6,500 gross loss</li>
        <li>Net result: +$11,000 (a significant profit despite losing 65% of the time)</li>
        <li>Profit factor: $17,500 / $6,500 = 2.69</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This is the profile of a trend-following or breakout trader. They accept that most breakout
        attempts fail, and they lose a small, controlled amount on each failed attempt. But when a
        breakout works, they ride the trend and let the winner run to a much larger multiple. The profit
        factor of 2.69 means they make $2.69 for every $1.00 they risk. This strategy is emotionally
        harder to execute because you experience losing trades more often, but mathematically it is
        far more profitable than the high-win-rate approach above. Many of the most successful hedge
        funds and commodity trading advisors operate with win rates between 30% and 45%.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Which Should You Optimize?</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If you could only track one metric, profit factor is the better choice. It encapsulates both
        how often you win and how large those wins are relative to your losses. A profit factor above
        1.0 means you are making money, period.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        That said, the best approach is to track both metrics together because the relationship between
        them reveals your trading style. Scalpers and mean-reversion traders tend to have high win rates
        (65-80%) with modest profit factors (1.2-1.8) because they take many small wins. Swing traders and
        trend followers typically have lower win rates (30-50%) but higher profit factors (1.8-3.0+)
        because they capture larger moves. Neither style is inherently superior. What matters is that your
        profit factor stays above 1.0 after accounting for commissions, slippage, and fees.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Tracking <Link to="/blog/trading-metrics-that-matter" className="text-primary hover:text-primary/80">the right
        combination of metrics</Link> helps you understand not just whether you are profitable, but why.
        If your win rate drops but your profit factor stays the same, you may be taking fewer but better
        trades. If your win rate rises but your profit factor drops, you might be cutting winners too early.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How to Track Both in Your Journal</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Every trade you log should capture the entry price, exit price, and position size so that both
        win rate and profit factor can be calculated automatically. Manually computing these from a
        spreadsheet is error-prone and tedious. TradeQut calculates both metrics in real time across your
        entire trade history or any filtered subset: by account, date range, instrument, or strategy.
        The analytics dashboard displays win rate alongside profit factor so you can immediately see
        whether a high win rate is translating into actual profitability.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Review these metrics weekly. Look for divergences: if win rate is climbing but profit factor is
        flat or declining, you may be unconsciously taking smaller winners while letting losses grow.
        Pair these two metrics with your{' '}
        <Link to="/blog/risk-reward-ratio-guide" className="text-primary hover:text-primary/80">risk-reward ratio</Link> to
        get a complete picture of your trading edge. Together, they answer the three essential questions:
        how often do you win, how much do you make when you win, and how much do you lose when you are wrong?
      </p>
    </>
  );
}
