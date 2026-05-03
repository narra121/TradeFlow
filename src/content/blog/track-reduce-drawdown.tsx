import { Link } from 'react-router-dom';

export default function TrackReduceDrawdown() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">What Is Drawdown?</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        <Link to="/glossary#drawdown" className="text-primary hover:text-primary/80">Drawdown</Link> measures
        the decline from a peak in your account equity to a subsequent trough. It represents the worst-case
        loss experienced during a specific period before the account recovers to a new high. Drawdown is
        expressed as either a dollar amount or a percentage of the peak equity.
      </p>
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <p className="text-foreground font-mono text-center">
          Drawdown % = (Peak Equity - Trough Equity) / Peak Equity x 100
        </p>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If your account reaches $52,000 and then drops to $45,000 before recovering, the drawdown is $7,000
        or 13.5%. Drawdown is the metric that separates professional risk managers from gamblers. Two traders
        can have the same annual return, but the one who achieved it with a 10% maximum drawdown is
        objectively better than the one who suffered a 40% drawdown along the way. Lower drawdown means
        smoother equity curves, less psychological stress, and a greater ability to compound returns
        consistently over years.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Math of Recovery</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The most dangerous property of drawdown is that recovery requires a disproportionately larger
        percentage gain. This asymmetry accelerates as losses deepen, making deep drawdowns exponentially
        harder to overcome.
      </p>
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden mb-6">
        <div className="grid grid-cols-3 bg-muted/50 border-b border-border/50">
          <div className="px-4 py-3 font-semibold text-foreground text-sm">Drawdown</div>
          <div className="px-4 py-3 font-semibold text-foreground text-sm">Account Value ($50k start)</div>
          <div className="px-4 py-3 font-semibold text-foreground text-sm">Gain Needed to Recover</div>
        </div>
        {[
          ['10%', '$45,000', '11.1%'],
          ['20%', '$40,000', '25.0%'],
          ['30%', '$35,000', '42.9%'],
          ['40%', '$30,000', '66.7%'],
          ['50%', '$25,000', '100.0%'],
          ['60%', '$20,000', '150.0%'],
          ['75%', '$12,500', '300.0%'],
        ].map(([loss, value, recovery], i) => (
          <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'} ${i < 6 ? 'border-b border-border/30' : ''}`}>
            <div className="px-4 py-3 text-foreground font-mono text-sm">{loss}</div>
            <div className="px-4 py-3 text-muted-foreground text-sm">{value}</div>
            <div className="px-4 py-3 text-foreground font-semibold text-sm">{recovery}</div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A 10% drawdown is manageable, requiring an 11.1% gain to recover. But a 50% drawdown requires a
        100% gain just to break even. This is not a theoretical exercise. Traders who do not manage
        drawdown actively often find themselves in a hole so deep that recovery takes months or years. The
        math makes it clear: preventing large drawdowns is more important than chasing large gains.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Types of Drawdown</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        There are three main types of drawdown that traders should track, each serving a different purpose
        in risk management:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Daily drawdown</strong> is the maximum loss within a single
          trading day, measured from the day's starting equity. If you begin the day at $50,000 and drop to
          $48,500 before ending at $49,200, your daily drawdown was $1,500 or 3%. This metric is critical
          for day traders and is used as a hard stop rule: once you hit your daily drawdown limit, you stop
          trading for the day.
        </li>
        <li>
          <strong className="text-foreground">Trailing drawdown</strong> (also called running drawdown) tracks
          the decline from the highest equity point ever reached. Unlike maximum drawdown, which is measured
          after the fact, trailing drawdown updates in real time as your equity fluctuates. Some prop firms
          use a trailing drawdown that ratchets up with your profits, meaning as your account grows, the
          absolute drawdown floor rises as well.
        </li>
        <li>
          <strong className="text-foreground">Maximum drawdown</strong> is the largest peak-to-trough decline
          over the entire life of the account or a defined measurement period. This is the number that risk
          managers, fund allocators, and prop firms care about most because it represents the worst pain the
          strategy has historically produced.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Why Prop Firms Care About Drawdown</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Proprietary trading firms place strict drawdown limits on funded accounts because they are lending
        you capital and need to limit their downside exposure. The most common structure, popularized by
        firms like FTMO, uses two drawdown rules:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">5% daily drawdown limit:</strong> Your account cannot lose more
          than 5% from the starting balance of any given day. If your account starts at $100,000, you cannot
          drop below $95,000 during that session.
        </li>
        <li>
          <strong className="text-foreground">10% maximum drawdown limit:</strong> Your account cannot decline
          more than 10% from the initial starting balance at any point. On a $100,000 account, your equity
          must never touch $90,000.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Violating either rule typically results in losing the funded account immediately. This is why
        drawdown management is not optional for anyone pursuing prop firm funding. Your strategy might be
        profitable over 12 months, but a single week of undisciplined trading can breach the limit and end
        your funded career. Tracking drawdown in a journal lets you practice staying within these limits
        before you apply for a funded account.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Strategies to Reduce Drawdown</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Controlling drawdown is a combination of position sizing discipline, predefined rules, and
        self-awareness. These strategies, used together, keep drawdowns within acceptable limits:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Fixed percentage position sizing.</strong> Risk no more than 1-2%
          of your account on any single trade. With 1% risk, even five consecutive losses only create a 5%
          drawdown, which is well within recovery range.
        </li>
        <li>
          <strong className="text-foreground">Daily loss limits.</strong> Set a hard stop at 2-3% daily loss.
          Once you hit it, close all positions and stop trading for the day. This prevents emotional revenge
          trading from turning a bad day into a catastrophic one.
        </li>
        <li>
          <strong className="text-foreground">Scale down after losses.</strong> If you hit 50% of your daily
          or weekly loss limit, reduce position size by half. This slows the bleeding and gives your remaining
          capital more room to recover. Scale back up only after you record winning trades at the reduced size.
        </li>
        <li>
          <strong className="text-foreground">Take breaks after losing streaks.</strong> Three consecutive
          losses should trigger a mandatory pause of at least one hour, or the rest of the day. Losing streaks
          cause tunnel vision and impulsive decisions. A break resets your mental state.
        </li>
        <li>
          <strong className="text-foreground">Diversify across setups.</strong> Do not concentrate all your risk
          in one trade idea or correlated positions. If you are long three tech stocks simultaneously, a sector
          sell-off hits all of them. Spread risk across uncorrelated setups.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Using Your Journal to Identify Drawdown Causes</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The most valuable use of a trading journal is diagnosing why drawdowns happen. TradeQut's analytics
        dashboard lets you filter trades by date range to isolate losing periods. Look for patterns in your
        worst stretches: were you overtrading, ignoring your{' '}
        <Link to="/blog/risk-reward-ratio-guide" className="text-primary hover:text-primary/80">risk-reward
        ratios</Link>, or trading outside your best hours?
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Review your maximum consecutive losses, the instruments you traded during the drawdown, and whether
        you followed your rules. Often, the biggest drawdowns correlate with{' '}
        <Link to="/glossary#broken-rules" className="text-primary hover:text-primary/80">broken rules</Link> rather
        than bad market conditions. The journal makes this visible by tagging each trade with the rules you
        set for yourself. When you can see that 80% of your drawdown came from trades where you violated
        your own stop-loss rules, the fix becomes obvious. Pair drawdown analysis with your{' '}
        <Link to="/blog/trading-metrics-that-matter" className="text-primary hover:text-primary/80">key trading
        metrics</Link> to build a complete picture of risk management performance.
      </p>
    </>
  );
}
