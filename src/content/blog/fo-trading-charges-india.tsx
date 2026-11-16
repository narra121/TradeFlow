import { A, Callout, Disclaimer, H2, P, Sources, Table, UL } from '../components/ArticleParts';

export default function FoTradingChargesIndia() {
  return (
    <>
      <H2>The charges on one F&amp;O trade</H2>
      <P>
        Every executed F&amp;O order pays several charges on top of the price. They are small per trade and large over a
        year, which is why a journal should record <strong>net</strong> P&amp;L, not just price difference.
      </P>
      <UL>
        <li>
          <strong>Brokerage</strong>: set by your broker. At Zerodha it is a flat ₹20 per executed order for options, and
          the lower of 0.03% or ₹20 per executed order for futures.
        </li>
        <li>
          <strong>STT (securities transaction tax)</strong>: charged by the government, on the sell side for futures and
          options (and on intrinsic value for exercised options).
        </li>
        <li>
          <strong>Exchange transaction charges</strong>: charged by the exchange on turnover (premium turnover for options).
        </li>
        <li>
          <strong>SEBI turnover fee</strong>: ₹10 per crore of turnover.
        </li>
        <li>
          <strong>GST</strong>: 18% on brokerage + SEBI charges + exchange transaction charges (not on STT or stamp duty).
        </li>
        <li>
          <strong>Stamp duty</strong>: on the buy side only.
        </li>
      </UL>

      <H2>Rates read from Zerodha&apos;s charges page</H2>
      <Table
        caption="Equity derivatives (NSE), as shown on zerodha.com/charges on 12 November 2026"
        head={['Charge', 'Futures', 'Options']}
        rows={[
          ['Brokerage', '0.03% or ₹20 per executed order, whichever is lower', '₹20 per executed order'],
          ['STT', '0.05% on the sell side', '0.15% on the sell side (on premium); 0.15% of intrinsic value if bought and exercised'],
          ['NSE transaction charges', '0.00183%', '0.03553% (on premium)'],
          ['SEBI charges', '₹10 per crore', '₹10 per crore'],
          ['Stamp duty', '0.002% on the buy side', '0.003% on the buy side'],
          ['GST', '18% on brokerage + SEBI + transaction charges', 'Same'],
        ]}
      />
      <Callout title="STT changed on 1 April 2026">
        The Finance Act, 2026 raised STT on derivatives for trades on or after 1 April 2026: futures from 0.02% to 0.05%,
        options premium from 0.10% to 0.15%, and exercised options from 0.125% to 0.15% (NSE circular 02/2026, 31 March
        2026). Trades before that date were charged at the old rates. Brokerage differs between
        brokers; check your own broker&apos;s charges page and your contract notes.
      </Callout>
      <P>
        The NSE transaction charges in that table apply to trades from 1 March 2026; earlier trades paid 0.03503% on options premium plus a separate 0.0005% IPFT
        contribution, and every rate by trade date, with its circular, is in{' '}
        <A to="/resources/fo-charges-rates">the F&amp;O charges and STT rate history</A>.
      </P>

      <H2>Worked example: one options round trip</H2>
      <P>
        Hypothetical trade: buy 100 units of an option at ₹100 and sell them at ₹110, using the Zerodha rates above.
      </P>
      <Table
        caption="Hypothetical example"
        head={['Item', 'Calculation', 'Amount (₹)']}
        rows={[
          ['Gross P&L', '(110 − 100) × 100', '1,000.00'],
          ['Brokerage', '₹20 buy + ₹20 sell', '40.00'],
          ['STT', '0.15% × sell value 11,000', '16.50'],
          ['NSE transaction charges', '0.03553% × turnover 21,000', '7.46'],
          ['SEBI charges', '₹10 per crore × 21,000', '0.02'],
          ['GST', '18% × (40 + 7.46 + 0.02)', '8.55'],
          ['Stamp duty', '0.003% × buy value 10,000', '0.30'],
          ['Total charges', '', '72.83'],
          ['Net P&L', '1,000.00 − 72.83', '927.17'],
        ]}
      />
      <P>
        Here charges took about 7% of the gross profit. On a ₹5 gain instead of ₹10 they would take about 15%. That is why
        scalpers and high-frequency option sellers should look at net numbers per setup in{' '}
        <A to="/trading-journal-india">their journal</A>. SEBI measures losses after transaction costs for all individual
        F&amp;O traders; its figures are in <A to="/sebi-fo-study">the SEBI F&amp;O study, with sources</A>.
      </P>

      <H2>What to record</H2>
      <UL>
        <li>Charges per trade (or per day if your broker only gives a daily total), in a separate column from price P&amp;L.</li>
        <li>The date, because STT and other rates change over time.</li>
        <li>Your gross and net P&amp;L, so you can see how much charges cost over a month.</li>
      </UL>
      <P>
        In TradeQut, trades imported from Indian brokers carry estimated charges. Pro includes a tax report for each financial year: the charges split into STT, exchange charges, SEBI fee and stamp duty, with brokerage, GST and other charges as the remainder, and P&amp;L by tax category (intraday equity, F&amp;O, commodity, short- and long-term delivery) to take to your CA. TradeQut does not
        file taxes and this is not tax advice; speak to a chartered accountant for ITR treatment of F&amp;O income.
      </P>

      <Sources
        items={[
          { label: 'Zerodha: brokerage and charges', url: 'https://zerodha.com/charges', checked: '2026-11-12' },
          {
            label: 'NSE circular 02/2026 (NSE/FATAX/73524): changes in rates of Securities Transaction Tax, 31 March 2026',
            url: 'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf',
            checked: '2026-11-12',
          },
          {
            label: 'NSE circular NSE/FA/73061: revision in transaction charges, 27 February 2026',
            url: 'https://nsearchives.nseindia.com/content/circulars/FA73061.pdf',
            checked: '2026-11-15',
          },
          {
            label: 'Business Today: STT hike on F&O from April 1',
            url: 'https://www.businesstoday.in/markets/story/stt-hike-on-fo-trades-to-take-effect-from-april-1-trading-costs-to-rise-522428-2026-03-26',
            checked: '2026-11-11',
          },
          {
            label: 'Upstox: how the STT hike affects traders',
            url: 'https://upstox.com/news/personal-finance/tax/explained-how-the-stt-hike-on-equity-futures-and-options-affects-traders-and-investors/article-189260',
            checked: '2026-11-11',
          },
        ]}
      />
      <Disclaimer />
    </>
  );
}
