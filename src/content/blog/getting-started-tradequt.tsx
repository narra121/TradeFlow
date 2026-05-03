import { Link } from 'react-router-dom';

export default function GettingStartedTradeQut() {
  return (
    <>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Starting a trading journal is one of the best decisions you can make as a trader, but the
        first few weeks determine whether the habit sticks. This guide walks you through your first
        30 days with TradeQut, from account creation to using analytics to make data-driven
        improvements to your trading.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Week 1 — Set Up Your Account
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Your first session should take about 10 minutes. The goal is to configure TradeQut so that
        logging trades is as fast and frictionless as possible going forward.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Create your account.</strong>{' '}
          <Link to="/signup" className="text-primary hover:text-primary/80">
            Sign up
          </Link>{' '}
          with your email or Google account. The free tier includes unlimited trade logging, full
          analytics, and goal tracking — no credit card required.
        </li>
        <li>
          <strong className="text-foreground">Add your trading accounts.</strong> If you trade with
          multiple brokers or have separate accounts for different strategies (e.g., a day trading
          account and a swing account), add each one in the Accounts section. This lets you filter
          analytics by account later.
        </li>
        <li>
          <strong className="text-foreground">Set up your saved options.</strong> Go to Settings and
          add the symbols you trade most frequently, your common strategies (e.g., "Breakout,"
          "Pullback," "Reversal"), and your session names. These will appear as quick-select options
          when logging trades, saving you from typing the same values repeatedly.
        </li>
        <li>
          <strong className="text-foreground">Define your trading rules.</strong> In the Goals
          section, create 3-5 rules that you want to follow consistently. Examples: "Risk no more
          than 1% per trade," "No trading after 2 PM," "Wait for candle close before entry."
          TradeQut tracks which rules you follow or break on each trade and reports compliance
          rates.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Week 1-2 — Log Your First Trades
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The most important thing during the first two weeks is building the logging habit. Do not
        worry about perfect entries — focus on consistency. Every trade gets logged, no exceptions.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        TradeQut supports three ways to add trades:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Manual entry.</strong> Click "Add Trade" on the
          dashboard. Fill in the symbol, direction, entry/exit prices, position size, and P&L. Add
          your strategy, emotional state, and any notes. The form remembers your recent symbols and
          strategies for faster entry.
        </li>
        <li>
          <strong className="text-foreground">CSV import.</strong> If your broker provides trade
          history exports, you can upload a CSV file and map columns to TradeQut fields. This is
          the fastest way to backfill historical data. See the{' '}
          <Link
            to="/blog/importing-trades-from-broker"
            className="text-primary hover:text-primary/80"
          >
            import guide
          </Link>{' '}
          for details.
        </li>
        <li>
          <strong className="text-foreground">AI extraction.</strong> Take a screenshot of your
          broker's trade confirmation or statement and upload it. TradeQut's AI reads the image and
          pre-fills the trade fields. You review, adjust if needed, and save. This works especially
          well for mobile users who want to snap a screenshot and log trades in seconds.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Whichever method you use, make sure to fill in the{' '}
        <Link
          to="/blog/trading-journal-template"
          className="text-primary hover:text-primary/80"
        >
          template fields
        </Link>{' '}
        — especially the mistake and lesson fields. These are optional in the form, but they make
        your later reviews dramatically more useful. Even a one-sentence note like "Entered too
        early, did not wait for confirmation" captures valuable data.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Week 2-3 — Explore Your Analytics
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Once you have 15-20 trades logged, your analytics start becoming meaningful. Head to the
        Analytics tab and explore what the data reveals.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Dashboard overview.</strong> Your dashboard shows
          key metrics at a glance:{' '}
          <Link to="/glossary#win-rate" className="text-primary hover:text-primary/80">
            win rate
          </Link>
          ,{' '}
          <Link to="/glossary#profit-factor" className="text-primary hover:text-primary/80">
            profit factor
          </Link>
          , total P&L, average win and loss sizes, and your equity curve. These numbers tell you
          the overall health of your trading.
        </li>
        <li>
          <strong className="text-foreground">Performance by symbol.</strong> Which instruments are
          you most profitable on? Many traders discover that they do well on two or three symbols
          and lose money on the rest. This insight alone can dramatically improve results — trade
          more of what works and less of what does not.
        </li>
        <li>
          <strong className="text-foreground">Performance by time.</strong> The hourly breakdown
          shows when your trades perform best and worst. If your afternoon trades are consistently
          losing money, you have found a specific, actionable problem.
        </li>
        <li>
          <strong className="text-foreground">Strategy comparison.</strong> If you tag trades by
          strategy, the analytics will show win rate, average P&L, and{' '}
          <Link
            to="/glossary#risk-reward-ratio"
            className="text-primary hover:text-primary/80"
          >
            risk-reward ratio
          </Link>{' '}
          for each one. This is where you find your edge — the strategy that consistently puts
          money in your account versus the ones that take it out.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        At this stage, resist the urge to make dramatic changes. You are gathering data, not
        acting on it yet. Note the patterns you see, but wait until you have a larger sample before
        making strategy decisions.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
        Week 3-4 — Set Goals and Rules
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        By week three, you have enough data to set meaningful goals. TradeQut's Goals feature lets
        you define targets and tracks your progress automatically.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Process goals over outcome goals.</strong> Instead of
          "Make $500 this week" (which depends on market conditions), set goals like "Follow my
          trading rules on 90% of trades" or "Log every trade within 5 minutes of closing." Process
          goals are within your control and build the habits that lead to profit.
        </li>
        <li>
          <strong className="text-foreground">Refine your rules.</strong> Based on two weeks of
          data, update your{' '}
          <Link to="/glossary#trading-rules" className="text-primary hover:text-primary/80">
            trading rules
          </Link>
          . If you noticed overtrading after 2 PM, add a rule. If your losses are biggest on
          revenge trades, create a cool-down rule. Make your rules specific and measurable — "No
          more than 5 trades per day" is enforceable; "Trade less" is not.
        </li>
        <li>
          <strong className="text-foreground">Start your weekly review routine.</strong> If you have
          not already, commit to a{' '}
          <Link to="/blog/how-to-review-trades" className="text-primary hover:text-primary/80">
            weekly review
          </Link>
          . Block 20-30 minutes every Sunday. Run through your week's trades using TradeQut's
          analytics. Identify one focus area for the coming week.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">After 30 Days</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        At the end of your first month, you have something most traders never build: a structured
        dataset of your own trading behavior. You know your win rate across different conditions.
        You know which strategies work and which do not. You know your emotional patterns and the
        times of day when you perform best. This is not theory from a textbook — it is evidence
        from your own account.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Use this data to make your first round of informed adjustments. Drop a strategy that is
        clearly unprofitable. Add size to the one that is working. Restrict your trading to the
        hours that produce positive results. Each adjustment is backed by evidence, not guesswork.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        From here, the compound effect takes over. Each month of data makes your analytics more
        reliable. Each weekly review sharpens your self-awareness. Each rule adjustment removes
        another leak from your trading. The traders who reach consistent profitability are rarely
        the ones with the best strategies — they are the ones who measure, review, and iterate
        more systematically than everyone else.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-6">
        Your journal is the foundation of that system.{' '}
        <Link to="/signup" className="text-primary hover:text-primary/80">
          Start your TradeQut account
        </Link>{' '}
        today and begin building the dataset that will transform your trading.
      </p>
    </>
  );
}
