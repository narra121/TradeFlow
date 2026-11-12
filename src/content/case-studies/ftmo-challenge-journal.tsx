import { A, Callout, H2, P, ScenarioNote, SignupCta, Table, UL } from '../components/ArticleParts';

export default function FtmoChallengeJournal() {
  return (
    <>
      <ScenarioNote>
        <strong>Illustrative scenario.</strong> The trader and all numbers are hypothetical example data. This is not a
        real customer, not a performance claim, and not a statement of any firm&apos;s current rules.
      </ScenarioNote>

      <H2>The question</H2>
      <P>
        A forex trader attempting a prop-firm evaluation has to respect two limits at once: a maximum loss for one day
        and a maximum loss overall. The question for the journal: <em>how close to each limit am I, trade by trade?</em>
      </P>

      <Callout title="Rules differ by firm">
        Daily and overall loss limits, how they are measured (balance or equity, which time zone resets the day) and any
        minimum-days or consistency rules differ between firms and change over time. Copy the numbers from your own
        firm&apos;s current rules page into your journal; do not rely on an article.
      </Callout>

      <H2>The method</H2>
      <UL>
        <li>Create one account in the journal for the evaluation, with its starting balance.</li>
        <li>Enter the firm&apos;s daily and overall limits as rules, using the firm&apos;s own definition.</li>
        <li>Before each trade, compute the money at risk and compare it with the room left to each limit.</li>
        <li>At the end of the day, log whether any limit came within, say, 30% of being hit.</li>
      </UL>

      <H2>Example data</H2>
      <Table
        caption="Hypothetical example data, 100,000 account"
        head={['Day', 'Result', 'Room left to daily limit', 'Room left to overall limit']}
        rows={[
          ['Mon', '-0.6%', 'wide', 'wide'],
          ['Tue', '-2.1%', 'narrow', 'medium'],
          ['Wed', '+0.9%', 'wide', 'medium'],
        ]}
      />
      <P>
        The useful output is not the profit; it is the near-miss list. A day that came close to a limit is a signal to
        shrink size or stop earlier, which you can write as a rule. More in{' '}
        <A to="/blog/prop-trading-challenges">prop trading challenges</A> and{' '}
        <A to="/blog/track-reduce-drawdown">tracking drawdown</A>.
      </P>

      <SignupCta />
    </>
  );
}
