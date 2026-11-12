import { A, Callout, Disclaimer, H2, P, UL } from '../components/ArticleParts';

export default function PositionSizingFixedRisk() {
  return (
    <>
      <H2>The idea</H2>
      <P>
        Fixed-risk sizing decides the <em>money you are willing to lose</em> first, then works out the size that makes the
        stop equal to that amount. The same loss per trade, whatever the distance to the stop.
      </P>
      <div className="mb-6 rounded-lg border border-border bg-card p-4 text-center font-mono text-foreground">
        Size = risk amount ÷ (distance to stop × value per unit of price)
      </div>

      <H2>Example: shares in India</H2>
      <P>
        Hypothetical: capital ₹5,00,000, risk 1% per trade = ₹5,000. Buy at ₹250 with a stop at ₹240: distance ₹10 per
        share. Size = 5,000 ÷ 10 = <strong>500 shares</strong>. If the stop is hit you lose about ₹5,000 plus charges and
        slippage.
      </P>

      <H2>Example: forex lots</H2>
      <P>
        Hypothetical: account $10,000, risk 1% = $100. EURUSD stop 20 pips away; on a standard lot one pip is worth about
        $10 for a USD account. Size = 100 ÷ (20 × 10) = <strong>0.5 lots</strong>. Pip values change with the pair and the
        account currency; use the <A to="/resources/position-size">position size calculator</A> or{' '}
        <A to="/resources/pip-calculator">pip value calculator</A>.
      </P>

      <H2>Rules to keep it honest</H2>
      <UL>
        <li>Compute the size before entry, from the stop you will actually use.</li>
        <li>Round down, not up, to whole units or the lot step your broker allows.</li>
        <li>Count fees and likely slippage as part of the risk on small stops.</li>
        <li>Never widen the stop after entry to keep the size; that raises the real risk.</li>
        <li>Record the planned risk on every trade so you can compute <A to="/blog/r-multiple-explained">R multiples</A> later.</li>
      </UL>
      <Callout title="Choosing the percentage">
        The percentage is your decision, not a recommendation. A journal helps you check whether the loss per trade stayed
        close to your plan; large deviations show where rules were broken.
      </Callout>
      <Disclaimer />
    </>
  );
}
