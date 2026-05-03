import { Link } from 'react-router-dom';

export default function RiskRewardRatioGuide() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">What Is Risk-Reward Ratio?</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The <Link to="/glossary#risk-reward-ratio" className="text-primary hover:text-primary/80">risk-reward ratio</Link> (R:R)
        compares how much you stand to lose on a trade versus how much you stand to gain. It is expressed
        as a ratio of risk to reward. The formula is:
      </p>
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <p className="text-foreground font-mono text-center">
          Risk-Reward Ratio = (Entry Price - Stop Loss) / (Take Profit - Entry Price)
        </p>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        For example, you buy a stock at $100 with a stop-loss at $95 and a profit target of $115. Your
        risk is $5 per share and your potential reward is $15 per share. That gives you a risk-reward
        ratio of 1:3, meaning you risk $1 to make $3. This ratio is the foundation of professional
        risk management because it forces you to evaluate each trade objectively before entering. A trade
        might look compelling on a chart, but if the nearest logical stop is $10 away and the target is
        only $5 away, the 2:1 risk-to-reward is unfavorable no matter how good the setup looks.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The 1:2 Minimum Rule</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Most professional traders will not enter a trade unless the potential reward is at least twice the
        risk, a 1:2 ratio. The reason is mathematical: with a 1:2 risk-reward, you only need to win 33.3%
        of your trades to break even. Any <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">win rate</Link> above
        that threshold produces profit.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Here is the breakeven calculation. If you risk $100 per trade and target $200, then one win recovers
        the cost of two losses. Over 100 trades, you need at least 34 winners (34 x $200 = $6,800) to
        offset 66 losers (66 x $100 = $6,600). The remaining margin is your profit. This mathematical
        cushion is why the 1:2 minimum exists. It gives your strategy room to survive losing streaks while
        remaining profitable over a large sample of trades.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Breakeven Win Rate Table</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The following table shows the win rate you need just to break even at various risk-reward ratios.
        The lower the required win rate, the more forgiving the strategy is during losing streaks.
      </p>
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden mb-6">
        <div className="grid grid-cols-3 bg-muted/50 border-b border-border/50">
          <div className="px-4 py-3 font-semibold text-foreground text-sm">Risk:Reward</div>
          <div className="px-4 py-3 font-semibold text-foreground text-sm">Example ($100 risk)</div>
          <div className="px-4 py-3 font-semibold text-foreground text-sm">Breakeven Win Rate</div>
        </div>
        {[
          ['1:1', '$100 target', '50.0%'],
          ['1:1.5', '$150 target', '40.0%'],
          ['1:2', '$200 target', '33.3%'],
          ['1:3', '$300 target', '25.0%'],
          ['1:4', '$400 target', '20.0%'],
          ['1:5', '$500 target', '16.7%'],
        ].map(([ratio, example, winRate], i) => (
          <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'} ${i < 5 ? 'border-b border-border/30' : ''}`}>
            <div className="px-4 py-3 text-foreground font-mono text-sm">{ratio}</div>
            <div className="px-4 py-3 text-muted-foreground text-sm">{example}</div>
            <div className="px-4 py-3 text-foreground font-semibold text-sm">{winRate}</div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Notice how a 1:3 ratio only requires a 25% win rate to break even. This is why trend followers
        can be profitable despite losing on most trades. Their winners are large enough that a handful of
        successful trades covers many small losses. Read more about this dynamic in our article on{' '}
        <Link to="/blog/win-rate-vs-profit-factor" className="text-primary hover:text-primary/80">win rate versus profit factor</Link>.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">R:R and Position Sizing</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Risk-reward ratio directly determines how you size your positions. The standard approach is to risk
        a fixed percentage of your account on each trade, typically 1-2%. Your R:R then determines the
        position size. Consider this example with a $50,000 account risking 1% per trade ($500 risk):
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>Stock at $100, stop at $95 (risk = $5/share). Position size: $500 / $5 = 100 shares ($10,000 position)</li>
        <li>Stock at $100, stop at $98 (risk = $2/share). Position size: $500 / $2 = 250 shares ($25,000 position)</li>
        <li>Stock at $100, stop at $90 (risk = $10/share). Position size: $500 / $10 = 50 shares ($5,000 position)</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A tighter stop allows a larger position (more shares) while keeping the dollar risk constant. A
        wider stop requires a smaller position. This is how professionals keep their risk consistent across
        different setups. The risk-reward ratio determines the target, and the stop distance determines the
        position size. Together, they define the complete trade plan before you enter.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Common R:R Mistakes</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Even traders who understand risk-reward ratios make errors that erode their edge over time.
        These are the most frequent mistakes:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Moving your stop-loss further away.</strong> When a trade moves against you,
          the temptation is to widen the stop to avoid being taken out. This destroys your planned R:R. If
          you entered with a 1:3 ratio and then doubled your stop distance, your actual R:R is now 2:3 and
          you need a much higher win rate to be profitable.
        </li>
        <li>
          <strong className="text-foreground">Taking profit too early.</strong> You planned a 1:3 target but close at 1:1.5
          because you are afraid of giving back gains. Over hundreds of trades, this habit cuts your average
          win in half and significantly reduces your{' '}
          <Link to="/glossary#profit-factor" className="text-primary hover:text-primary/80">profit factor</Link>.
        </li>
        <li>
          <strong className="text-foreground">Ignoring commissions and slippage.</strong> A 1:1.5 ratio looks profitable on
          paper, but after commissions, exchange fees, and slippage on entry and exit, the real ratio might
          be closer to 1:1.2, requiring a much higher win rate than you planned for.
        </li>
        <li>
          <strong className="text-foreground">Using arbitrary stop levels.</strong> Placing your stop exactly $1 below entry
          because it looks clean, instead of placing it at a structural level like below support. Arbitrary stops
          get hit by normal price noise, turning a viable 1:3 trade into a wasted loss.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Tracking R:R in Your Journal</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The most valuable habit you can build is logging both your planned risk-reward ratio and your actual
        risk-reward ratio for every trade. The planned R:R is what you intended when you entered. The actual
        R:R is what happened when you exited. The gap between these two numbers reveals your execution
        discipline. If you consistently plan 1:3 trades but your actual average is 1:1.8, you know you are
        cutting winners short or moving stops.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        TradeQut calculates your actual R:R from your entry, exit, and stop-loss data. You can filter by
        date range, account, or instrument to identify which setups deliver the best actual risk-reward.
        Over time, this data helps you eliminate low-R:R setups from your playbook and focus on the patterns
        where you consistently achieve 1:2 or better. Combine this with{' '}
        <Link to="/blog/track-reduce-drawdown" className="text-primary hover:text-primary/80">drawdown tracking</Link> to
        ensure that even your losing trades stay within your risk parameters. Together, R:R discipline and
        drawdown management form the backbone of sustainable trading performance.
      </p>
    </>
  );
}
