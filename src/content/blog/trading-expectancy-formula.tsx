import { A, Callout, Disclaimer, H2, P, Table } from '../components/ArticleParts';

export default function TradingExpectancyFormula() {
  return (
    <>
      <H2>The formula</H2>
      <P>
        Expectancy is the average result per trade. In R multiples (see <A to="/blog/r-multiple-explained">R explained</A>):
      </P>
      <div className="mb-6 rounded-lg border border-border bg-card p-4 text-center font-mono text-foreground">
        Expectancy = (win rate × average win in R) − (loss rate × average loss in R)
      </div>
      <P>
        You get the same number by averaging the R of every trade, which is how a journal computes it. The formula above
        shows what drives it.
      </P>

      <H2>Worked examples</H2>
      <Table
        caption="Hypothetical numbers"
        head={['Win rate', 'Average win', 'Average loss', 'Expectancy per trade']}
        rows={[
          ['40%', '2.0R', '1.0R', '0.4 × 2.0 − 0.6 × 1.0 = +0.2R'],
          ['50%', '1.0R', '1.0R', '0.5 × 1.0 − 0.5 × 1.0 = 0.0R'],
          ['35%', '3.0R', '1.0R', '0.35 × 3.0 − 0.65 × 1.0 = +0.4R'],
        ]}
      />
      <P>
        A 35% win rate with 3R winners beats a 50% win rate with 1R winners. That is why{' '}
        <A to="/blog/win-rate-vs-profit-factor">win rate alone misleads</A>.
      </P>

      <H2>Using it responsibly</H2>
      <Callout title="Small samples lie">
        Expectancy from 20 trades can swing widely. Use at least 100 trades per setup before treating the number as a
        measure, and compute it for each setup separately. Past expectancy does not guarantee future results.
      </Callout>
      <P>
        Include fees in each trade&apos;s R, or a thin positive expectancy can turn negative. Compare the number month by
        month and look at which setups drag it down. The <A to="/glossary#expectancy">glossary entry</A> has the short
        definition.
      </P>
      <Disclaimer />
    </>
  );
}
