import { A, Callout, Disclaimer, H2, P, Table, UL } from '../components/ArticleParts';

export default function OptionsTradingJournalIndia() {
  return (
    <>
      <H2>Why options need more fields than shares</H2>
      <P>
        A share trade is a symbol, a price and a quantity. An options trade is also a strike, an expiry, a call or a put,
        often several legs, and a premium that decays. If your journal only stores a symbol and a profit, you cannot ask
        the questions that matter, such as &ldquo;do I lose more on expiry day?&rdquo;.
      </P>

      <H2>Fields to record</H2>
      <Table
        head={['Field', 'Why it matters']}
        rows={[
          ['Underlying and instrument', 'NIFTY, BANKNIFTY, a stock; option or future'],
          ['Expiry and strike', 'Lets you group by days to expiry and by distance from the money'],
          ['Call or put, buy or sell', 'Option buyers and sellers have very different risk'],
          ['Quantity in units', 'Lot sizes are revised by the exchanges, so store units and compute lots when needed'],
          ['Entry and exit premium', 'The price you actually paid and received'],
          ['Planned stop and target', 'Without a plan there is no R multiple'],
          ['Structure', 'Single leg, spread, straddle: a spread is one trade, not two'],
          ['Charges', 'Brokerage, STT and the rest'],
          ['Setup and reason', 'One name from a short list, and one sentence'],
          ['Mistake tag', 'Blank, or one tag such as "no stop" or "added to loser"'],
        ]}
      />

      <H2>Questions the data can answer</H2>
      <UL>
        <li>Net P&amp;L by weekday and by days to expiry: are expiry-day trades worth their risk?</li>
        <li>Average R for buyers versus sellers of options, and for single legs versus spreads.</li>
        <li>How much did charges take from gross P&amp;L this month? See <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>.</li>
        <li>How often did you trade after two losses in a row?</li>
      </UL>
      <Callout title="Judge by many trades, not a few">
        A single week of option trades can be dominated by one or two outcomes. Compare groups only when each has enough
        trades, and re-check after the next batch.
      </Callout>

      <P>
        Get the data in without retyping: import your <A to="/blog/zerodha-tradebook-pnl">Zerodha tradebook</A> or the file
        from another broker, then add setups and mistakes. See the{' '}
        <A to="/trading-journal-india">journal for Indian F&amp;O traders</A>.
      </P>
      <Disclaimer />
    </>
  );
}
