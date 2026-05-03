import { Link } from 'react-router-dom';

export default function WhyTradingRulesMatter() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Signals vs. Rules</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A trading signal tells you what the market is doing. A trading rule tells you what you are allowed to do in
        response. Signals are external: a moving average cross, a support bounce, a volume spike. Rules are internal:
        personal constraints you impose on yourself to ensure consistent, disciplined behavior regardless of what the
        market presents. Many traders spend years optimizing their signals while completely ignoring their rules. This
        is backward. A mediocre strategy executed with strict rules will outperform a brilliant strategy executed
        without discipline.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Rules exist to protect you from yourself. When you are in a live trade, your brain is flooded with dopamine or
        cortisol depending on whether the position is moving for or against you. In that state, even experienced traders
        make impulsive decisions. Rules remove the decision from the emotional moment. They pre-commit you to an action
        before the situation arises, so you do not have to think clearly when clarity is hardest to maintain.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Consistency Framework</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Consistency is what separates gambling from trading. A gambler makes each bet independently, adjusting based on
        feel. A trader executes the same process repeatedly, trusting that their edge will play out over a large sample
        size. Rules are the mechanism that produces consistency. Without them, you are making a different decision
        every time you sit at the screen, and your results become random even if your underlying strategy has an edge.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The consistency framework has three layers: <strong className="text-foreground">pre-trade rules</strong> that
        determine whether you are allowed to trade at all today, <strong className="text-foreground">in-trade rules</strong>{' '}
        that govern how you manage open positions, and <strong className="text-foreground">post-trade rules</strong>{' '}
        that define your review and recovery process. A complete{' '}
        <Link to="/blog/build-trading-plan" className="text-primary hover:text-primary/80">trading plan</Link> weaves
        these three layers together into a seamless operating procedure.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5 Trading Rules Every Trader Should Consider</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        These five rules are not universal prescriptions, but they represent the most impactful constraints based on
        common trader failure modes. Adapt the specific numbers to your style, but the principles behind each rule
        apply broadly.
      </p>
      <ul className="list-disc pl-6 space-y-4 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Maximum 3 trades per day.</strong> Overtrading is the silent killer of
          trading accounts. Every trade carries transaction costs, spread costs, and psychological costs. After three
          trades, most{' '}
          <Link to="/blog/day-trading-journal" className="text-primary hover:text-primary/80">day traders</Link> find
          that their signal quality degrades as they start forcing setups that do not meet their entry criteria.
          Capping your trade count forces selectivity.
        </li>
        <li>
          <strong className="text-foreground">No trading after 2 consecutive losses.</strong> Two losses in a row is a
          signal to stop and reassess. Either the market conditions have shifted and your strategy is misaligned, or
          your execution has degraded. In both cases, continuing to trade will likely compound losses. Walk away, review
          your journal, and come back the next session.
        </li>
        <li>
          <strong className="text-foreground">Minimum 1:2 risk-to-reward ratio.</strong> Never enter a trade where the
          potential profit is less than twice the potential loss. A 1:2{' '}
          <Link to="/glossary#risk-reward-ratio" className="text-primary hover:text-primary/80">risk-to-reward ratio</Link>{' '}
          means you only need to win 34% of your trades to break even. This mathematical advantage transforms a modest
          win rate into a profitable system.
        </li>
        <li>
          <strong className="text-foreground">No single position risking more than 2% of account.</strong> This is the
          most fundamental rule in{' '}
          <Link to="/glossary#risk-management" className="text-primary hover:text-primary/80">risk management</Link>.
          If you risk 2% per trade, you would need 35 consecutive losses to lose half your account. At 5% per trade,
          that number drops to 14. At 10%, just 7. The math is unforgiving, and capital preservation is the first
          priority.
        </li>
        <li>
          <strong className="text-foreground">No trading during major news events.</strong> Events like Non-Farm
          Payrolls, FOMC announcements, and CPI releases create extreme volatility with unpredictable direction.
          Spreads widen, stops get slipped, and price action becomes erratic.{' '}
          <Link to="/blog/forex-trading-journal" className="text-primary hover:text-primary/80">Forex traders</Link> are
          particularly vulnerable. Unless your strategy specifically targets news volatility, stay out of the market
          during these windows.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Tracking Rule Compliance</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Rules are worthless if you do not track whether you follow them. Every trade in your journal should be tagged
        with the rules that applied and whether each rule was followed or broken. Over time, this gives you a compliance
        percentage for each rule, which tells you exactly where your discipline is strong and where it breaks down.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        TradeQut makes this process seamless. You define your trading rules once, and when logging each trade you can
        mark which rules you followed and which you broke. The analytics then show your compliance rate per rule, per
        week, and per session, making it easy to identify patterns. Perhaps you follow your position sizing rule
        perfectly but consistently violate your daily trade limit. That specificity is what makes the tracking valuable.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Set compliance targets as part of your trading goals. A goal like "follow all 5 rules on at least 85% of
        trades this month" gives you a concrete metric to work toward. When you hit the target, you know your
        discipline improved. When you miss it, you know exactly which rules need more attention.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How Broken Rules Correlate with Losses</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The most persuasive argument for trading rules comes from your own data. When you separate your trades into two
        groups, those where all rules were followed and those where at least one rule was broken, the performance
        difference is almost always dramatic. Across thousands of trading journals, the pattern holds: rule-following
        trades have higher win rates, better average{' '}
        <Link to="/glossary#pnl" className="text-primary hover:text-primary/80">P&L</Link>, and lower{' '}
        <Link to="/glossary#drawdown" className="text-primary hover:text-primary/80">drawdowns</Link> than
        rule-breaking trades.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This correlation is not coincidence. Broken rules usually happen during emotional states: revenge trading after
        a loss, greed after a winning streak, or impatience during a slow market. These are exactly the conditions that
        produce the worst trading decisions. The rule exists to prevent the trade; breaking the rule exposes you to
        the poor outcome it was designed to avoid.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Reviewing this data monthly reinforces the value of your rules in a way that willpower alone cannot. When you
        see in black and white that your rule-breaking trades cost you $2,400 last month while your rule-following
        trades earned $3,800, the incentive to comply becomes tangible. Data-driven discipline is sustainable discipline.
        Build your rules, track your compliance, and let the numbers do the convincing.
      </p>
    </>
  );
}
