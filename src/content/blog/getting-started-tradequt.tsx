import { A, Callout, H2, OL, P, UL } from '../components/ArticleParts';
import { TRIAL_DAYS } from '../product-facts';

export default function GettingStartedTradeQut() {
  return (
    <>
      <P>
        The first month decides whether a journal becomes a habit. This plan takes you from sign-up to a first review of your
        own numbers in four weeks, using the screens TradeQut has today. Screen names are in <em>italics</em>; the{' '}
        <A to="/guide">user guide</A> has a screenshot of each one.
      </P>

      <H2>Week 1: set up in about ten minutes</H2>
      <OL>
        <li>
          Create an account with your email or Google. Every new account starts with a {TRIAL_DAYS}-day free trial with every Pro feature and no
          card; when it ends nothing is charged and your journal becomes read-only until you upgrade.
        </li>
        <li>
          Open <em>Accounts</em> and choose <em>Add account</em> for each real trading account: a name, the broker, the type
          and its currency. One row per real account keeps the numbers honest, because amounts in different currencies are
          never added together.
        </li>
        <li>
          Open <em>Settings › Trade options</em> and trim the pick lists for strategies, sessions and mistakes to the ones you
          actually use. Short lists get filled in; long ones get skipped.
        </li>
        <li>
          Open <em>Goals &amp; rules</em> and write three to five rules you can check after the fact, such as &ldquo;stop loss
          set before entry&rdquo; or &ldquo;no new trade after two losses in a row&rdquo;.
        </li>
      </OL>

      <H2>Weeks 1 and 2: get every trade in</H2>
      <P>Consistency matters more than detail in the first two weeks. Use whichever route is faster for you:</P>
      <UL>
        <li>
          <strong>Import</strong>: download the trade file from your broker (Zerodha, Dhan, Upstox, Angel One, Groww, or a
          MetaTrader 4 or 5 report) and drop it on the <em>Import</em> page. You review every trade before it is saved, and
          trades already imported are skipped. See{' '}
          <A to="/blog/importing-trades-from-broker">importing trades from your broker</A>.
        </li>
        <li>
          <strong>Screenshots</strong>: if a broker or prop-firm dashboard has no export, upload screenshots of the trade list
          and AI extraction reads the trades for you to check.
        </li>
        <li>
          <strong>By hand</strong>: <em>Add trade</em> in the top bar opens the trade pane beside the page you are on.
        </li>
      </UL>
      <P>
        Then add the journal fields while the trade is fresh: strategy, session, mistakes, broken rules and a one-line key
        lesson. These fields are what the later reports are built from. The{' '}
        <A to="/blog/trading-journal-template">trading journal template</A> explains what each one is for.
      </P>

      <H2>Weeks 2 and 3: read your first numbers</H2>
      <P>
        Once you have 20 or more trades, open <em>Analytics</em>. <em>Overview</em> shows net P&amp;L, win rate, profit factor
        and drawdown for the account and period you picked. The other tabs break the same trades down:
      </P>
      <UL>
        <li>
          <em>Edge</em> and <em>Timing</em>: results by strategy, session, weekday and hour, each with its number of trades.
        </li>
        <li>
          <em>Risk</em>: R distribution, drawdown and streaks.
        </li>
        <li>
          <em>Behaviour</em>: what each mistake and each broken rule cost.
        </li>
      </UL>
      <P>
        The trial and Pro show every breakdown in full, and so does a read-only journal after the trial. Read the trade
        count beside every figure: a segment with six trades says very little. Write down what you notice, but do not change
        how you trade on a small sample.
      </P>

      <H2>Weeks 3 and 4: set limits and review weekly</H2>
      <UL>
        <li>
          In <em>Goals &amp; rules</em>, set weekly or monthly limits you control: a maximum number of trades and a maximum
          drawdown. The dashboard shows where you stand against them every day.
        </li>
        <li>
          Mark the rules a trade broke in its <em>Broken rules</em> field. The rules table then shows each rule for this week,
          what the breaks cost, the last eight weeks and your current streak.
        </li>
        <li>
          Block 20 to 30 minutes once a week for a <A to="/blog/how-to-review-trades">weekly review</A>. <em>Insights</em> can
          write an AI report of the period from your own trades, and its <em>Chat</em> tab answers questions about them. Neither
          suggests trades.
        </li>
      </UL>

      <Callout title="What the first month gives you">
        A record of how you actually trade: which strategies and hours carry your results, which mistakes repeat, and which
        rules you break under pressure. Decide what to change from that record, one change at a time, and check the next month
        whether it helped.
      </Callout>

      <P>
        Ready to start? <A to="/signup">Create a free journal</A>, or compare the plans on the{' '}
        <A to="/pricing">pricing page</A>.
      </P>
    </>
  );
}
