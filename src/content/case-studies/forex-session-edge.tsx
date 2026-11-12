import { A, Callout, H2, P, ScenarioNote, SignupCta, Table, UL } from '../components/ArticleParts';

export default function ForexSessionEdge() {
  return (
    <>
      <ScenarioNote>
        <strong>Illustrative scenario.</strong> The trader and all numbers are hypothetical example data. This is not a
        real customer and not a performance claim.
      </ScenarioNote>

      <H2>The question</H2>
      <P>
        A forex trader has a flat equity curve over several months. The question for the journal:{' '}
        <em>do my results differ by trading session, and is the difference large enough to trust?</em>
      </P>

      <H2>The method</H2>
      <UL>
        <li>Tag every trade with the session of entry (Asia, London, New York, overlap) using one fixed time zone.</li>
        <li>Compare trades, win rate, average R and total pips per session.</li>
        <li>Check the sample size before acting: a handful of trades can look like a pattern by chance.</li>
      </UL>

      <H2>Example data</H2>
      <Table
        caption="Hypothetical example data"
        head={['Session', 'Trades', 'Win rate', 'Average R']}
        rows={[
          ['Asia', '31', '35%', '-0.3'],
          ['London', '64', '47%', '+0.1'],
          ['London / New York overlap', '37', '57%', '+0.4'],
          ['New York', '28', '39%', '-0.1'],
        ]}
      />
      <Callout title="Why this is not proof">
        With a few dozen trades per row, differences of this size can appear by chance. Treat a result as a hypothesis:
        trade the same way for another sample and see whether it repeats before changing size or hours.
      </Callout>
      <P>
        See <A to="/blog/forex-trading-journal">what forex traders should track</A> and the{' '}
        <A to="/resources/pip-calculator">pip value calculator</A>.
      </P>

      <SignupCta />
    </>
  );
}
