import { A, H2, P, ScenarioNote, SignupCta, Table, UL } from '../components/ArticleParts';

export default function DayTraderWinRate() {
  return (
    <>
      <ScenarioNote>
        <strong>Illustrative scenario.</strong> The trader, the trades and every number below are hypothetical example
        data. This is not a real customer and not a performance claim; it shows the method.
      </ScenarioNote>

      <H2>The question</H2>
      <P>
        A day trader of US stocks has a win rate that looks fine on some days and awful on others, and cannot say why.
        The question for the journal: <em>does the time of day I enter change my results?</em>
      </P>

      <H2>The method</H2>
      <UL>
        <li>Log the entry time, the setup, a 1&ndash;5 setup-quality score and a one-line reason on every trade.</li>
        <li>After at least 100 trades, group the trades by entry window and compare win rate and average R in each.</li>
        <li>Look at the count in each window before the percentage: a window with 12 trades says little.</li>
      </UL>

      <H2>Example data</H2>
      <Table
        caption="Hypothetical example data"
        head={['Entry window (ET)', 'Trades', 'Win rate', 'Average R']}
        rows={[
          ['9:30 - 11:30', '58', '55%', '+0.4'],
          ['11:30 - 14:00', '49', '30%', '-0.3'],
          ['14:00 - 16:00', '40', '48%', '+0.2'],
        ]}
      />
      <P>
        In this made-up sample the midday window has the weakest numbers, and the journal notes from those trades repeat
        the same phrases (&ldquo;bored&rdquo;, &ldquo;one more&rdquo;). Read the two together: the numbers say{' '}
        <em>where</em>, the notes say <em>why</em>.
      </P>

      <H2>Turning it into a rule</H2>
      <P>
        A finding only helps if it becomes a rule the journal can check, for example &ldquo;no new entries between 11:30
        and 14:00&rdquo;. Review the rule after another 100 trades, because a pattern in one sample can disappear in the
        next. See <A to="/blog/trading-metrics-that-matter">the metrics that matter</A> and{' '}
        <A to="/blog/why-trading-rules-matter">why rules matter</A>.
      </P>

      <SignupCta />
    </>
  );
}
