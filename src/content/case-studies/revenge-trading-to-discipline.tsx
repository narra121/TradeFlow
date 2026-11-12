import { A, H2, P, ScenarioNote, SignupCta, Table, UL } from '../components/ArticleParts';

export default function RevengeTradingToDiscipline() {
  return (
    <>
      <ScenarioNote>
        <strong>Illustrative scenario.</strong> The trader and all numbers are hypothetical example data. This is not a
        real customer and not a performance claim; it shows how a journal can surface a behaviour.
      </ScenarioNote>

      <H2>The question</H2>
      <P>
        A swing trader suspects that some trades are taken to win back a loss rather than because a setup appeared. The
        question for the journal: <em>how many of my trades follow a loss within minutes, and how do they end?</em>
      </P>

      <H2>The method</H2>
      <UL>
        <li>Add an emotion tag to every trade (calm, anxious, frustrated, bored) at the time of entry, not afterwards.</li>
        <li>Mark a trade as <em>after-loss</em> when it is entered within a set time of a losing exit.</li>
        <li>Compare the after-loss group with the rest: count, average size, average R.</li>
      </UL>

      <H2>Example data</H2>
      <Table
        caption="Hypothetical example data"
        head={['Group', 'Trades', 'Average size vs normal', 'Average R']}
        rows={[
          ['Not after a loss', '84', '1.0x', '+0.2'],
          ['After a loss, under 30 min', '21', '1.7x', '-0.6'],
        ]}
      />
      <P>
        In this made-up sample the after-loss trades are larger and worse. A common response is a cooling-off rule: after a
        losing trade, no new entry for a fixed time, and no size increase for the rest of the session. The journal then
        counts how often the rule was broken, which is a more honest progress measure than profit.
      </P>
      <P>
        Related: <A to="/blog/trading-psychology-managing-emotions">managing emotions</A> and{' '}
        <A to="/blog/why-trading-rules-matter">why rules matter</A>.
      </P>

      <SignupCta />
    </>
  );
}
