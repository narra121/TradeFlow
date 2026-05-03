import { Link } from 'react-router-dom';

export default function ForexSessionEdge() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Problem</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Priya had been trading forex for three years, focusing on EUR/USD, GBP/USD, and USD/CHF. She
        worked from home in Mumbai (IST, UTC+5:30) and traded whenever she had free time &mdash;
        sometimes during the Asian session in the morning, sometimes during the London open in the
        early afternoon, and occasionally staying up for the New York session.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Her equity curve was remarkably flat. Over 14 months, her $8,000 account fluctuated between
        $7,200 and $8,800 but never broke out in either direction. Her overall{' '}
        <Link to="/glossary" className="text-primary hover:underline">win rate</Link> was 41%, her{' '}
        <Link to="/glossary" className="text-primary hover:underline">profit factor</Link> was
        1.05, and her average reward-to-risk was 1.3:1. She was trading at breakeven after
        commissions, and she could not figure out why a strategy that seemed sound in backtesting was
        going nowhere live.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Analysis</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After logging 340 trades over two months with precise entry times, Priya ran her first
        hourly performance breakdown. The results were not subtle.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Trades entered during the London/New York overlap window &mdash; 1:30 PM to 5:30 PM IST
        (8:00 AM to 12:00 PM ET) &mdash; had a 73% win rate with a 2.4:1 average R:R. Trades during
        the Asian session (5:30 AM to 12:00 PM IST) had a 31% win rate with a 0.8:1 R:R. Trades
        during the London-only session (1:30 PM to 3:00 PM IST, before NY opened) were in between at
        44%.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Her strategy &mdash; breakouts from consolidation ranges with volume confirmation &mdash;
        depended on volatility and institutional order flow. During the Asian session, EUR/USD and
        GBP/USD barely moved 15&ndash;20 pips, and the breakouts she entered were false breaks that
        reverted to the range. During the London/NY overlap, the same pairs routinely moved
        50&ndash;80 pips with clean directional follow-through. The strategy was not broken &mdash;
        she was applying it during sessions where the market conditions it required did not exist.
      </p>

      <div className="bg-card rounded-xl border border-border/50 p-6 my-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Results at a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Win Rate (Overall)</p>
            <p className="text-lg font-semibold text-foreground">41% &rarr; 64%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Win Rate (Overlap)</p>
            <p className="text-lg font-semibold text-foreground">73%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Win Rate (Asian)</p>
            <p className="text-lg font-semibold text-foreground">31% (eliminated)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Profit Factor</p>
            <p className="text-lg font-semibold text-foreground">1.05 &rarr; 2.1</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Screen Time</p>
            <p className="text-lg font-semibold text-foreground">8 hrs &rarr; 3 hrs/day</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Return</p>
            <p className="text-lg font-semibold text-foreground">+0.2% &rarr; +5.8%</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Change</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Priya made a simple but transformative decision: she would only trade during the London/NY
        overlap. For her time zone, that meant sitting down at 1:30 PM IST, scanning for setups, and
        shutting down by 5:30 PM IST. No morning trades, no late-night sessions.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        She created a{' '}
        <Link to="/glossary" className="text-primary hover:underline">trading rule</Link>{' '}
        in her journal: &quot;Only enter new positions between 1:30 PM and 5:00 PM IST.&quot; Any
        trade outside this window would be flagged automatically. She also refined her setup criteria
        &mdash; she would only trade pairs where the Average True Range for the session was above
        40 pips, ensuring she was entering during genuinely active conditions.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The hardest part was the mornings. She had been used to scanning charts with her coffee at
        6:00 AM, and the habit was deeply ingrained. For the first two weeks, she replaced morning
        chart time with{' '}
        <Link to="/blog" className="text-primary hover:underline">reviewing her journal</Link>{' '}
        &mdash; reading over the previous day's trades, checking rule compliance, and updating her
        watchlist for the afternoon session.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Results</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After two months of session-filtered trading, Priya's numbers were unrecognizable. Her
        overall win rate rose from 41% to 64%. Her profit factor jumped from 1.05 to 2.1. Her
        monthly return went from a near-breakeven +0.2% to +5.8%.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        She was taking fewer trades &mdash; about 18 per month compared to 45 previously &mdash; but
        each trade had a genuine structural edge. The 60% reduction in screen time was an unexpected
        benefit. She used the freed-up hours to study price action on higher timeframes and to
        backtest new pair selections, both of which she tracked in her journal as part of a
        continuous improvement process.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After four months, her account grew from $8,000 to $10,600. More importantly, the equity
        curve finally had a consistent upward slope instead of the flat line that had defined her
        previous year of trading.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Key Takeaway</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Most traders treat all market hours as equal. They are not. Priya's breakout strategy had a
        massive edge during high-liquidity overlap sessions and a negative edge during low-volatility
        Asian hours. Without hourly analytics, this difference was invisible &mdash; it just looked
        like an inconsistent strategy. The fix was not a new indicator or a different timeframe; it
        was simply filtering for the market conditions where her existing approach actually worked.
        A journal with time-of-day analysis can reveal session edges that years of screen time alone
        will never surface.
      </p>
    </>
  );
}
