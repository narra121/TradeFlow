import { Link } from 'react-router-dom';

export default function MultiAccountManagement() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Challenge</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        David had been trading forex full-time for two years, primarily scalping and day trading
        EUR/USD, GBP/JPY, and AUD/USD. After proving his consistency, he passed evaluations at two
        prop firms &mdash; FTMO ($100,000 account) and MyForexFunds ($50,000 account) &mdash; while
        continuing to trade his personal $12,000 account at a retail broker.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Managing three accounts quickly became chaotic. He tracked each account in a separate Google
        Sheet, which meant triple the data entry and no unified view of his overall performance. He
        could not easily answer basic questions: What was his combined{' '}
        <Link to="/glossary" className="text-primary hover:underline">win rate</Link> this month?
        Which account was performing best? Was his GBP/JPY strategy working better on the funded
        accounts or his personal one?
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Worse, he occasionally confused his risk parameters. The FTMO account had a 5% daily drawdown
        limit, MyForexFunds had a 5% max loss rule, and his personal account had no external limits.
        Twice in one month, he nearly breached a funded account rule because he was mentally tracking
        the wrong risk threshold.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Solution</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        David consolidated everything into a single journal with multi-account support. He set up
        three accounts &mdash; FTMO 100K, MFF 50K, and Personal &mdash; each with its own starting
        balance, currency, and risk parameters. Every trade was tagged to the specific account it
        belonged to, and he could switch between accounts or view them all combined using a single
        dropdown filter.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The setup took about 30 minutes. He entered each account with its starting balance, then
        imported his existing trades from CSV exports. From that point forward, each trade logged
        automatically rolled up into the correct account's{' '}
        <Link to="/glossary" className="text-primary hover:underline">profit factor</Link>,{' '}
        drawdown, and running balance.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Discovery</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After two months of unified tracking, David noticed something unexpected. His personal
        account had a 61% win rate and a 2.3 profit factor, while his FTMO account sat at 48% with a
        1.2 profit factor. The MyForexFunds account was in between at 52% and 1.5.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The per-account analytics revealed the cause. On funded accounts, David was taking profit too
        early &mdash; closing winners at 1:1 reward-to-risk instead of letting them run to his
        planned 2:1 or 3:1 targets. His journal notes told the story: &quot;Closed early, didn't want
        to give back profits on FTMO,&quot; and &quot;Took the safe exit, drawdown limit too
        close.&quot; The fear of violating drawdown rules was causing him to cut winners short, which
        destroyed his risk-reward ratio on funded capital.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        On his personal account, where no external rules existed, he traded his strategy as designed
        &mdash; letting winners run to the full target. The same EUR/USD breakout setup that averaged
        +42 pips on his personal account averaged only +18 pips on his funded accounts.
      </p>

      <div className="bg-card rounded-xl border border-border/50 p-6 my-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Results at a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Accounts Tracked</p>
            <p className="text-lg font-semibold text-foreground">3 in 1 journal</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Data Entry Time</p>
            <p className="text-lg font-semibold text-foreground">45 min &rarr; 15 min/day</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">FTMO Profit Factor</p>
            <p className="text-lg font-semibold text-foreground">1.2 &rarr; 1.8</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">MFF Profit Factor</p>
            <p className="text-lg font-semibold text-foreground">1.5 &rarr; 1.9</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rule Violations</p>
            <p className="text-lg font-semibold text-foreground">2/month &rarr; 0</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Combined Monthly Return</p>
            <p className="text-lg font-semibold text-foreground">+4.2% avg</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Results</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        David addressed the early-exit problem by adding a{' '}
        <Link to="/glossary" className="text-primary hover:underline">trading rule</Link>{' '}
        to his funded accounts: &quot;Hold to minimum 1.5R target unless stop is hit.&quot; He
        tracked compliance in his journal. Within six weeks, his FTMO profit factor improved from 1.2
        to 1.8, and his MyForexFunds account went from 1.5 to 1.9.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The unified journal also eliminated the confusion around risk parameters. He could see each
        account's current drawdown at a glance and never again came close to breaching a funded
        account rule. His daily journaling time dropped from 45 minutes (across three spreadsheets)
        to about 15 minutes.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Six months in, David received his first FTMO payout of $6,400 and his third consecutive
        MyForexFunds payout. His personal account grew 31% over the same period. He attributes the
        improvement directly to having per-account visibility in a single place.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Key Takeaway</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Multi-account management is not just about convenience &mdash; it is about cross-account
        analysis. Without a unified view, David could not compare his behavior across funded and
        personal accounts. The journal made the performance gap visible and gave him the data to fix
        it. For any trader managing multiple accounts, the ability to filter analytics by account
        while maintaining an overall portfolio view is not a nice-to-have &mdash; it is essential for
        identifying behavioral differences you would never spot with separate tracking systems.
      </p>
    </>
  );
}
