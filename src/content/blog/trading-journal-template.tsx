import { Link } from 'react-router-dom';

export default function TradingJournalTemplate() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Required Fields for Every Trade
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A trading journal template serves one purpose: to ensure you capture the same structured
        information for every single trade, regardless of whether you are excited after a big win
        or frustrated after a loss. Consistency in logging creates consistency in analysis. Without
        it, your journal becomes a scattered collection of notes with no analytical value.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Here are the non-negotiable fields that every trade entry must include:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-muted-foreground border border-border/50 rounded-lg">
          <thead>
            <tr className="bg-card">
              <th className="text-left px-4 py-3 text-foreground font-semibold border-b border-border/50">
                Field
              </th>
              <th className="text-left px-4 py-3 text-foreground font-semibold border-b border-border/50">
                Example
              </th>
              <th className="text-left px-4 py-3 text-foreground font-semibold border-b border-border/50">
                Why It Matters
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 font-medium text-foreground">Symbol</td>
              <td className="px-4 py-3">AAPL, EUR/USD, BTC</td>
              <td className="px-4 py-3">Performance by instrument analysis</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 font-medium text-foreground">Direction</td>
              <td className="px-4 py-3">Long / Short</td>
              <td className="px-4 py-3">Reveals directional bias</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 font-medium text-foreground">Entry Price</td>
              <td className="px-4 py-3">$187.45</td>
              <td className="px-4 py-3">Measures execution quality</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 font-medium text-foreground">Exit Price</td>
              <td className="px-4 py-3">$191.20</td>
              <td className="px-4 py-3">Calculates realized P&L</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 font-medium text-foreground">Position Size</td>
              <td className="px-4 py-3">50 shares / 0.5 lots</td>
              <td className="px-4 py-3">Risk management validation</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 font-medium text-foreground">Date &amp; Time</td>
              <td className="px-4 py-3">2026-04-21 10:32 AM</td>
              <td className="px-4 py-3">Time-of-day pattern analysis</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-3 font-medium text-foreground">Outcome</td>
              <td className="px-4 py-3">Win / Loss / Breakeven</td>
              <td className="px-4 py-3">
                <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">
                  Win rate
                </Link>{' '}
                calculation
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-foreground">P&L</td>
              <td className="px-4 py-3">+$187.50</td>
              <td className="px-4 py-3">Bottom-line performance tracking</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground leading-relaxed mb-4">
        These eight fields are the skeleton of your journal. They enable every quantitative
        analysis you will ever want to run — win rate by symbol, average P&L by time of day,
        position sizing consistency, and more. If you log nothing else, log these.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Optional Context Fields
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The required fields tell you <em>what</em> happened. Context fields tell you <em>why</em>.
        They are optional in the sense that your journal still functions without them, but they
        dramatically increase the depth of insights you can extract during{' '}
        <Link to="/blog/how-to-review-trades" className="text-primary hover:text-primary/80">
          weekly reviews
        </Link>
        .
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Strategy or setup name</strong> — Label every trade
          with the specific pattern you followed: "Bull Flag Breakout," "VWAP Reversal," "Earnings
          Gap Fill." This lets you compare performance across strategies and identify which setups
          are actually profitable.
        </li>
        <li>
          <strong className="text-foreground">Trading session</strong> — Pre-market, regular hours,
          or after-hours. Many traders discover their edge only exists during specific windows.
        </li>
        <li>
          <strong className="text-foreground">Market conditions</strong> — Was the overall market
          trending, ranging, or volatile? Your strategy might crush it in trends but fail in
          choppy conditions.
        </li>
        <li>
          <strong className="text-foreground">News or catalyst</strong> — Earnings, Fed
          announcements, sector rotation. If a catalyst drove the trade, record it so you can
          evaluate how well you trade catalysts versus technical setups.
        </li>
        <li>
          <strong className="text-foreground">Emotional state</strong> — Use a simple scale:
          calm, slightly anxious, anxious, frustrated, euphoric. You will be surprised how strongly
          emotional state correlates with trade outcomes.
        </li>
        <li>
          <strong className="text-foreground">Screenshots</strong> — A chart image at entry and
          exit is worth more than any written description. Mark your entry, stop loss, and target
          on the chart. Months later, you will be able to see exactly what you saw.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        The Mistake and Lesson Fields
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        If there is one optional field you should treat as mandatory, it is the mistake and lesson
        pair. Every trade, win or loss, offers something to learn. The discipline of articulating
        what went wrong — even on profitable trades — accelerates your development faster than
        any other journaling practice.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Common mistakes to watch for:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>Entered before the setup fully formed (impatience)</li>
        <li>Moved stop loss to avoid being stopped out (hope)</li>
        <li>Sized up after a winning streak (overconfidence)</li>
        <li>Traded a symbol not on the watchlist (boredom)</li>
        <li>Held through a predetermined exit signal (greed)</li>
        <li>
          Took a{' '}
          <Link to="/blog/mistakes-new-traders-make" className="text-primary hover:text-primary/80">
            revenge trade
          </Link>{' '}
          after a loss (anger)
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The lesson should be actionable, not aspirational. Instead of writing "I need to be more
        disciplined," write "I will set a hard stop in the platform before entering, not a mental
        stop." Specific, concrete actions you can implement on the next trade.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Why Templates Prevent Lazy Logging
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Without a template, journaling requires a creative decision for every entry: "What should
        I write about this trade?" That friction is enough to make most traders skip entries when
        they are tired, rushed, or emotionally drained — exactly the moments when logging matters
        most.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A template eliminates that decision. You open the form, fill in the fields, and close it.
        There is no blank page staring back at you. The structure ensures you capture the same data
        points every time, which means your analysis is comparing apples to apples. Inconsistent
        logging creates inconsistent data, and inconsistent data produces misleading insights.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Templates also reduce time per entry. Most traders report that a structured form takes 60-90
        seconds to complete, compared to 5-10 minutes of freeform writing. Multiply that by 10
        trades per day, and the template saves you nearly an hour of work. That efficiency makes the
        difference between a journal you maintain for years and one you abandon after two weeks.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Using a Template in TradeQut
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        TradeQut's trade entry form implements every field discussed in this article. When you add a
        trade, the form prompts you for the symbol, direction, entry and exit prices, position size,
        date, strategy, and notes — with dropdowns for commonly used values so you are never typing
        the same strategy name twice.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The mistake and lesson fields are built directly into the trade form, making them first-class
        data points rather than afterthoughts buried in a notes section. You can attach chart
        screenshots, tag trades with your{' '}
        <Link to="/glossary#trading-rules" className="text-primary hover:text-primary/80">
          trading rules
        </Link>
        , and mark which rules you followed or broke.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Your saved symbols, strategies, and setups are remembered across sessions, so repeated
        entries become even faster. For a full walkthrough of the trade entry process, see the{' '}
        <Link to="/guide" className="text-primary hover:text-primary/80">
          TradeQut User Guide
        </Link>
        .
      </p>
      <p className="text-muted-foreground leading-relaxed mb-6">
        The best template is one you will actually use. Start with the required fields, add context
        fields as you see the value, and keep the mistake-and-lesson pair in every entry. Within a
        month, you will have a dataset rich enough to reveal patterns you never knew existed.
      </p>
    </>
  );
}
