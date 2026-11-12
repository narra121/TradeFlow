import { A, Callout, Disclaimer, H2, P, Table, UL } from '../components/ArticleParts';

export default function RMultipleExplained() {
  return (
    <>
      <H2>The definition</H2>
      <P>
        <strong>1R is the amount you lose if your stop is hit.</strong> A trade&apos;s R multiple is its result divided by
        that planned risk:
      </P>
      <div className="mb-6 rounded-lg border border-border bg-card p-4 text-center font-mono text-foreground">
        R multiple = (exit price − entry price) ÷ (entry price − stop price) for a long trade
      </div>
      <P>
        Using R makes trades comparable. A ₹500 win on a ₹250 risk and a $50 win on a $25 risk are both +2R, whatever the
        market or the currency.
      </P>

      <H2>Worked example</H2>
      <P>
        Hypothetical long trade on EURUSD: entry 1.0850, stop 1.0830, exit 1.0884. Risk per unit is 1.0850 − 1.0830 =
        0.0020. The result per unit is 1.0884 − 1.0850 = 0.0034. R = 0.0034 ÷ 0.0020 = <strong>+1.7R</strong>.
      </P>
      <Table
        caption="Hypothetical results in R"
        head={['Trade', 'Result', 'R']}
        rows={[
          ['1', 'Stopped out', '−1.0R'],
          ['2', 'Exit at 1.7 times the risk', '+1.7R'],
          ['3', 'Moved the stop and exited early', '+0.3R'],
          ['4', 'Held past the stop', '−2.4R'],
        ]}
      />
      <P>
        Trade 4 is the interesting one: a loss bigger than 1R means the stop plan was not followed. R makes that visible
        even when the money amount looks small.
      </P>

      <H2>What to do with it</H2>
      <UL>
        <li>Record the planned stop before entry; without it you cannot compute R honestly afterwards.</li>
        <li>
          Average the R of all trades to get <A to="/glossary#expectancy">expectancy</A>; see{' '}
          <A to="/blog/trading-expectancy-formula">the expectancy formula</A>.
        </li>
        <li>Look at the worst R values first: they show where rules were broken.</li>
        <li>Use R to size trades consistently; see <A to="/blog/position-sizing-fixed-risk">fixed-risk position sizing</A>.</li>
      </UL>
      <Callout title="Fees and slippage">
        Compute R from net P&amp;L (after fees) and from the actual fills, not the planned prices, if you want the number
        you really earned.
      </Callout>
      <Disclaimer />
    </>
  );
}
