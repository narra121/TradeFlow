import { Link } from 'react-router-dom';

export default function PropTradingChallenges() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How Prop Trading Challenges Work</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Proprietary trading firms like FTMO, MyFundedFX (MFF), and The Funded Trader (TFT) offer traders access to
        funded accounts in exchange for passing a structured evaluation. The model is straightforward: you pay a fee,
        receive a simulated account with specific rules, and if you meet the profit target without violating the rules,
        you receive a funded account where you trade real capital and keep a percentage of the profits, typically
        70 to 90 percent.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Most challenges follow a two-phase structure. Phase 1 requires reaching a profit target (usually 8 to 10% of
        the account) within 30 days. Phase 2 has a smaller target (usually 5%) within 60 days. Both phases enforce
        strict drawdown limits. Some firms offer one-phase evaluations or instant funding options, but the core
        mechanic is always the same: prove you can trade profitably with disciplined{' '}
        <Link to="/glossary#risk-management" className="text-primary hover:text-primary/80">risk management</Link>.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Two Rules That Matter Most</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        While prop firm rule sets vary, two constraints cause more failures than all others combined: the daily
        drawdown limit and the maximum drawdown limit. The daily drawdown limit (typically 4 to 5% of starting
        balance) means that if your account drops by that amount in a single day, your challenge is immediately
        terminated. The maximum drawdown limit (typically 8 to 12% from the starting or highest balance) serves
        as the overall loss cap for the entire challenge.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        These limits are absolute. There is no appeal, no reset, no second chance. If you enter a trade that moves
        against you by more than your daily limit, the challenge ends even if you close the trade a moment later.
        This means that{' '}
        <Link to="/glossary#position-sizing" className="text-primary hover:text-primary/80">position sizing</Link>{' '}
        is the single most critical skill for passing a challenge. A trader who risks 3% of the account on one trade
        can hit the daily limit with just two losses. A trader who risks 0.5% per trade can absorb eight consecutive
        losses and still be within limits.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Understanding the math of your drawdown limits is not optional. Before placing any trade during a challenge,
        you must know exactly how much room you have. If you have already lost 2% for the day and your daily limit
        is 5%, you only have 3% remaining. Your position sizing for the next trade must account for this reduced
        buffer.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Why Most Traders Fail</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Industry estimates suggest that 85 to 95 percent of traders fail prop firm challenges. The failure rate is
        not because the profit targets are unreasonable. An 8% gain in 30 days is achievable with moderate skill.
        Traders fail because they violate the drawdown rules, usually by oversizing positions in an attempt to reach
        the profit target quickly.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The psychological trap is that the challenge fee creates urgency. A trader who paid $500 for a $100,000
        account evaluation feels pressure to make it count, which leads to aggressive trading, which leads to hitting
        the drawdown limit. This is exactly backward. The optimal approach is to treat the challenge fee as a sunk
        cost and trade the account as if it were your own money, using the same conservative{' '}
        <Link to="/blog/build-trading-plan" className="text-primary hover:text-primary/80">trading plan</Link> you
        would use on a personal account.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">How Journaling Prevents Challenge Failures</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        A trading journal is your most valuable tool during a prop firm challenge because it provides real-time
        awareness of your risk exposure. When you log every trade immediately, you always know your current daily
        loss, your distance from the maximum{' '}
        <Link to="/glossary#drawdown" className="text-primary hover:text-primary/80">drawdown</Link> limit, and
        whether your recent behavior pattern suggests approaching tilt.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Beyond real-time tracking, your journal from before the challenge tells you exactly what to expect from
        yourself. What is your actual win rate over the last 200 trades? What is your average{' '}
        <Link to="/glossary#risk-reward-ratio" className="text-primary hover:text-primary/80">risk-to-reward ratio</Link>?
        What is your maximum losing streak? If you know that your worst historical losing streak is 7 trades and your
        risk per trade is 0.75%, your worst expected drawdown is about 5.25%. That fits within most challenge limits.
        Without this data, you are guessing, and guessing during a challenge is how traders lose their evaluation fee.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">A Challenge Journal Strategy: The Daily Checklist</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        During a challenge, your journal routine should be more structured than your normal trading journal. Use a
        daily checklist that covers both pre-session preparation and post-session review.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li><strong className="text-foreground">Pre-session:</strong> Record your current account balance, calculate today's maximum allowable loss (daily drawdown limit minus any unrealized losses), determine your maximum position size based on that allowable loss, and check the economic calendar for news events.</li>
        <li><strong className="text-foreground">During session:</strong> Log each trade immediately with entry price, stop loss, and position size. After each trade, update your running daily P&L. If you hit 50% of your daily limit, reduce your position size by half for the remaining session.</li>
        <li><strong className="text-foreground">Post-session:</strong> Record final daily P&L, mark which{' '}
          <Link to="/blog/why-trading-rules-matter" className="text-primary hover:text-primary/80">trading rules</Link> you followed and broke, note your emotional state, and calculate your remaining buffer to the maximum drawdown limit.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This checklist takes 5 minutes per day and can save hundreds of dollars in failed challenge fees. The
        discipline transfers directly to trading the funded account once you pass.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Passing and Beyond</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Passing the challenge is not the end; it is the beginning. Funded accounts have the same drawdown rules as
        the evaluation, and violating them means losing your funded account. The traders who maintain funded accounts
        long-term are the ones who continue journaling, continue following their rules, and continue reviewing their
        data after they pass.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        TradeQut supports this ongoing discipline with{' '}
        <Link to="/blog/trading-analytics-find-edge" className="text-primary hover:text-primary/80">analytics</Link>{' '}
        that track your equity curve, drawdown levels, and rule compliance over time. You can set goals like
        "maintain maximum drawdown under 4%" and track your progress in real time. The{' '}
        <Link to="/blog/day-trading-journal" className="text-primary hover:text-primary/80">daily review cycle</Link>{' '}
        keeps you accountable, and the data gives you confidence that your approach is sustainable.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The prop trading model rewards exactly what good journaling builds: patience, consistency, risk awareness,
        and data-driven decisions. Start journaling before your next challenge, carry the habit through the evaluation,
        and keep it going once funded. The journal makes the difference between passing once and staying funded permanently.
      </p>
    </>
  );
}
