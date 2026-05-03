import { Link } from 'react-router-dom';

export default function DayTraderWinRate() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Problem</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Mike had been day trading US equities for just over two years. He was profitable in some
        months, but the inconsistency was wearing him down. His overall{' '}
        <Link to="/glossary" className="text-primary hover:underline">win rate</Link>{' '}
        hovered around 40%, which meant he needed outsized winners to stay afloat. Most months, those
        winners never came. He was churning through commissions and slowly bleeding his $25,000
        account.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        His setups were sound &mdash; he traded breakouts on the 5-minute chart using VWAP and
        premarket levels on stocks with above-average relative volume. The strategy backtested well.
        But something in the execution was off, and he could not figure out what.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Turning Point</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Mike started journaling every trade. Not just the ticker and P&L, but the exact time of
        entry, his emotional state, the quality of the setup on a 1-5 scale, and a one-sentence
        reason for taking the trade. He committed to doing this for 60 consecutive trading days
        before drawing any conclusions.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After the first month, he had 147 trades logged. He began running the numbers through{' '}
        <Link to="/blog" className="text-primary hover:underline">hourly analytics</Link>{' '}
        &mdash; breaking down his performance by time of day, setup quality, and position size.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Discovery</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The data told a clear story. Trades taken between 9:30 AM and 11:30 AM ET had a 58% win rate
        and an average reward-to-risk of 1.9:1. Trades taken during the 2:00&ndash;4:00 PM power
        hour were respectable at 52% with decent risk-reward. But trades placed between 11:30 AM and
        1:00 PM &mdash; the midday lull &mdash; had a dismal 28% win rate and an average R:R of just
        0.6:1.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Even more telling: his journal entries for lunchtime trades frequently contained phrases like
        &quot;bored, nothing setting up but took it anyway&quot; and &quot;just want one more
        winner.&quot; He was overtrading during the lowest-quality period of the day, and those trades
        accounted for roughly 35% of his total volume but nearly 60% of his total losses.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Fix</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Mike created a{' '}
        <Link to="/glossary" className="text-primary hover:underline">trading rule</Link>:
        no new positions between 11:30 AM and 1:30 PM ET. He set it as an active rule in his
        journal so every trade during that window would get automatically flagged. For the first two
        weeks, he physically stepped away from his desk at 11:30 &mdash; going for a walk, eating
        lunch, reviewing his morning trades.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        He also added a setup quality filter. If a trade scored below 3 out of 5 on his own
        assessment, he would not take it. This removed another layer of marginal trades that were
        diluting his edge.
      </p>

      <div className="bg-card rounded-xl border border-border/50 p-6 my-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Results at a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-lg font-semibold text-foreground">40% &rarr; 62%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Profit Factor</p>
            <p className="text-lg font-semibold text-foreground">0.8 &rarr; 1.7</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Trades/Day</p>
            <p className="text-lg font-semibold text-foreground">6.2 &rarr; 3.8</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly P&L</p>
            <p className="text-lg font-semibold text-foreground">-$340 &rarr; +$1,820</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lunchtime Trades</p>
            <p className="text-lg font-semibold text-foreground">35% &rarr; 0%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg R:R</p>
            <p className="text-lg font-semibold text-foreground">1.1 &rarr; 1.8</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Results</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Within three months of implementing the lunch break rule and the setup quality filter, Mike's
        win rate climbed from 40% to 62%. His{' '}
        <Link to="/glossary" className="text-primary hover:underline">profit factor</Link>{' '}
        jumped from 0.8 to 1.7. He was taking fewer trades &mdash; averaging 3.8 per day instead of
        6.2 &mdash; but every trade he took had a genuine edge.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        His account went from slowly bleeding to consistently growing. In his best month, he cleared
        $3,200 on the same $25,000 account that had been going nowhere for two years.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Key Takeaway</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Mike's strategy was never the problem &mdash; his execution window was. Without detailed
        time-of-day analytics, he would have continued assuming the whole system was flawed. The
        journal revealed that he already had a winning edge; he just needed to stop diluting it with
        low-quality midday trades. Sometimes the biggest improvement comes not from finding a new
        strategy, but from eliminating the worst hours of your current one.
      </p>
    </>
  );
}
