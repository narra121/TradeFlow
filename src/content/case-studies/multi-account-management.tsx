import { A, H2, P, ScenarioNote, SignupCta, Table, UL } from '../components/ArticleParts';

export default function MultiAccountManagement() {
  return (
    <>
      <ScenarioNote>
        <strong>Illustrative scenario.</strong> The trader, accounts and numbers are hypothetical example data. This is not
        a real customer and not a performance claim.
      </ScenarioNote>

      <H2>The question</H2>
      <P>
        A trader runs a personal account and two prop-firm accounts with different rules and currencies. The question for
        the journal: <em>how do I see each account on its own, and all of them together, without mixing them up?</em>
      </P>

      <H2>The method</H2>
      <UL>
        <li>One journal account per real account, each with its own starting balance and currency.</li>
        <li>Rules attached to the account they belong to (a firm&apos;s loss limit applies to that firm&apos;s account only).</li>
        <li>Review per account first; use the combined view for habits (time of day, setups), not for money totals.</li>
        <li>Never add amounts in different currencies into one figure.</li>
      </UL>

      <H2>Example layout</H2>
      <Table
        caption="Hypothetical example data"
        head={['Account', 'Currency', 'Rules attached', 'Reviewed']}
        rows={[
          ['Personal', 'INR', 'Max 3 trades a day', 'Weekly'],
          ['Prop account A', 'USD', 'Firm daily and overall limits', 'Daily'],
          ['Prop account B', 'USD', 'Firm daily and overall limits', 'Daily'],
        ]}
      />
      <P>
        Keeping accounts separate also keeps your numbers honest: a good week on one account does not hide a rule break on
        another. See <A to="/blog/getting-started-tradequt">getting started</A>.
      </P>

      <SignupCta />
    </>
  );
}
