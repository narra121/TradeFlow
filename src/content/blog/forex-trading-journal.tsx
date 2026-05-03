import { Link } from 'react-router-dom';

export default function ForexTradingJournal() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Pips vs. Dollar P&L: Why Both Matter</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Forex traders face a unique measurement challenge. A trade that gains 50 pips on a micro lot has a very
        different dollar impact than 50 pips on a standard lot. This is why a forex trading journal must track both
        pip performance and dollar{' '}
        <Link to="/glossary#pnl" className="text-primary hover:text-primary/80">P&L</Link>. Pips measure the quality
        of your entries and exits, independent of position size. Dollar P&L measures the actual financial impact on
        your account, which is what ultimately determines whether you can continue trading.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Tracking pips alone can mask poor{' '}
        <Link to="/glossary#position-sizing" className="text-primary hover:text-primary/80">position sizing</Link>.
        A trader who gains 200 pips on small lots but loses 100 pips on oversized lots can end the week negative in
        dollar terms despite a seemingly strong pip count. Conversely, tracking only dollar P&L can hide whether your
        analysis is sound. If you are only profitable because you happened to size one big winner correctly, your
        strategy may not be as reliable as the dollar figure suggests. Record both metrics for every trade, and compare
        them during your weekly review.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Session Timing: London, New York, Tokyo, Sydney</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The forex market operates 24 hours a day, but not all hours are created equal. Volatility, liquidity, and
        tradeable setups cluster around four major sessions: Sydney (22:00-07:00 UTC), Tokyo (00:00-09:00 UTC),
        London (08:00-17:00 UTC), and New York (13:00-22:00 UTC). The London-New York overlap from 13:00 to 17:00 UTC
        is typically the most active window, with the highest volume and tightest spreads on major pairs.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Your journal should record which session each trade was taken during. Over time, this data reveals which
        sessions suit your strategy best. A breakout trader may find that London open provides the best setups, while
        a range trader might perform best during the Asian session when markets are calmer. Without session tagging,
        this insight stays hidden. Most traders who journal session data are surprised by how dramatically their
        performance varies between windows. The{' '}
        <Link to="/blog/trading-analytics-find-edge" className="text-primary hover:text-primary/80">analytics breakdown</Link>{' '}
        by time of day makes this analysis straightforward.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Currency Pair Analysis</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Not every currency pair behaves the same way, and not every trader is equally good at trading all pairs. Your
        journal should track performance per pair so you can identify which instruments give you the best edge.
        Separate your pairs into categories: majors (EUR/USD, GBP/USD, USD/JPY), minors (EUR/GBP, AUD/NZD), and
        exotics (USD/TRY, EUR/ZAR).
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Majors tend to have tighter spreads and more predictable behavior during news events. Minors offer different
        volatility profiles and can provide diversification. Exotics carry wider spreads and higher swap costs, making
        them unsuitable for strategies that rely on small moves or long holding periods. After 50 to 100 trades with
        pair-level data, you can make informed decisions about which pairs to focus on and which to avoid. Eliminating
        underperforming pairs from your watchlist is one of the fastest ways to improve overall results.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Swap and Rollover Costs</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Swap rates are the interest charges or credits applied to positions held overnight. They vary by broker, pair,
        and direction (long vs. short). On some pairs, the swap can be substantial enough to erode a profitable trade
        if held for several days. Triple swaps on Wednesdays (to account for the weekend) can be particularly costly
        on exotic pairs.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A forex journal should record swap costs as a separate line item for any trade held overnight. When reviewing
        your swing trades, calculate the net P&L after swap deductions. Some traders discover that their swing trading
        edge disappears once swap costs are factored in, leading them to either shorten their holding period or switch
        to pairs with more favorable swap rates. Ignoring swap costs is a common mistake that slowly drains accounts,
        especially for traders who hold positions for multiple days.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">News Event Tracking: NFP, FOMC, and Beyond</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Forex markets are driven by macroeconomic data releases more than any other asset class. Non-Farm Payrolls
        (NFP), Federal Open Market Committee (FOMC) rate decisions, Consumer Price Index (CPI), and central bank
        speeches can move currency pairs hundreds of pips in minutes. Your journal should tag trades that occurred
        during or immediately after major news events.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This tagging serves two purposes. First, it helps you evaluate whether your strategy performs better or worse
        around news events. If your win rate drops significantly on news days, you should add a rule to{' '}
        <Link to="/blog/why-trading-rules-matter" className="text-primary hover:text-primary/80">avoid trading</Link>{' '}
        during those windows. Second, it allows you to isolate news-related volatility from your regular performance
        data, giving you a cleaner picture of how your strategy performs under normal conditions. Many forex traders
        find that their overall win rate improves by 5 to 10 percentage points simply by filtering out news-related
        trades.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Forex-Specific Journal Fields</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Beyond the standard journal fields that every trader needs, forex traders should track several additional data
        points to get the most from their journal.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li><strong className="text-foreground">Pip value at entry:</strong> Record the exact pip value based on your lot size and the pair being traded. This varies between pairs and account currencies.</li>
        <li><strong className="text-foreground">Spread at entry:</strong> Spreads widen during low liquidity and news events. Tracking the actual spread helps you identify when your broker's execution is hurting your results.</li>
        <li><strong className="text-foreground">Session tag:</strong> Mark whether the trade was taken during Asian, London, New York, or the overlap.</li>
        <li><strong className="text-foreground">Swap charged or credited:</strong> Record the overnight interest for any trade held past the daily rollover.</li>
        <li><strong className="text-foreground">News proximity:</strong> Tag whether a major economic event occurred within one hour of the trade entry.</li>
        <li><strong className="text-foreground">Correlation check:</strong> Note whether you had another open position on a correlated pair (e.g., long EUR/USD and long GBP/USD simultaneously doubles your dollar exposure).</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        With these fields populated, TradeQut can generate forex-specific insights during your weekly review. You will
        see which sessions produce your best trades, which pairs consistently underperform, and whether your swap
        costs are eating into your profits. These details are the difference between a generic journal and one that
        actually helps a forex trader improve. Import your trades via{' '}
        <Link to="/blog/importing-trades-from-broker" className="text-primary hover:text-primary/80">CSV or screenshot extraction</Link>{' '}
        to populate your journal quickly and start analyzing within minutes.
      </p>
    </>
  );
}
