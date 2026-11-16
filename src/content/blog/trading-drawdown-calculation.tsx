import { A, Callout, Disclaimer, H2, P, Table, UL } from '../components/ArticleParts';

export default function TradingDrawdownCalculation() {
  return (
    <>
      <H2>The calculation</H2>
      <P>
        Drawdown is the fall from a peak in account equity to a later low, usually shown as a percentage of the peak.
      </P>
      <div className="mb-6 rounded-lg border border-border bg-card p-4 text-center font-mono text-foreground">
        Drawdown % = (peak equity − current equity) ÷ peak equity
      </div>
      <P>
        Hypothetical: equity peaks at 1,10,000 and falls to 99,000. Drawdown = (110,000 − 99,000) ÷ 110,000 = 10%.
        <strong> Maximum drawdown</strong> is the largest such fall over the whole period you measure.
      </P>

      <H2>Why recovery is harder than the fall</H2>
      <P>After a fall you need a larger gain on the lower balance to get back to the peak: gain needed = 1 ÷ (1 − drawdown) − 1.</P>
      <Table
        caption="Gain needed to recover"
        head={['Drawdown', 'Gain needed']}
        rows={[
          ['10%', '11.1%'],
          ['20%', '25.0%'],
          ['30%', '42.9%'],
          ['50%', '100%'],
        ]}
      />

      <H2>Balance or equity, and why firms differ</H2>
      <UL>
        <li>Equity includes open positions; balance does not. A drawdown measured on equity can be deeper than on balance.</li>
        <li>
          Funded-account rules define their own daily and overall limits, including the reference point and the time zone
          that resets the day. Use your firm&apos;s current rules, not a general formula.
        </li>
        <li>Journals usually compute drawdown from closed-trade equity; open-position swings are not in the history.</li>
        <li>
          Open futures add a wrinkle: a broker&apos;s ledger can record a daily mark-to-market entry while the position is
          open, which is not the realised P&amp;L booked at exit; see{' '}
          <A to="/blog/mtm-vs-realised-pnl-futures-options">MTM vs realised P&amp;L in futures and options</A>.
        </li>
      </UL>

      <H2>How to use it in a journal</H2>
      <P>
        Plot the equity curve, mark the peak and the low, and read the trades in between: which setups, hours and rule
        breaks sit inside the worst stretch? Set a rule for what you do at a given drawdown (for example, halve size until
        a new peak) before you need it. More in <A to="/blog/track-reduce-drawdown">tracking and reducing drawdown</A> and
        the <A to="/glossary#maximum-drawdown">glossary</A>.
      </P>
      <Callout title="One number is not the story">
        Two accounts can have the same maximum drawdown with very different recovery times. Look at how long the drawdown
        lasted as well as how deep it was.
      </Callout>
      <Disclaimer />
    </>
  );
}
