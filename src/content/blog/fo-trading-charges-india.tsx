import { A, Disclaimer, H2, P, Sources, Table, UL } from '../components/ArticleParts';

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

      <H2>New STT charges from 1 April 2026</H2>
      <P>
        The Finance Act, 2026, which received the President&apos;s assent on 30 March 2026, raised STT on futures and options. NSE&apos;s circular 02/2026
        (NSE/FATAX/73524, 31 March 2026) applies the new rates to trades executed on or after 1 April 2026; earlier trades keep the old ones. STT on equity
        shares did not change.
      </P>
      <Table
        caption="STT before and from 1 April 2026 (NSE/FATAX/73524; the old rates applied from 1 October 2024 under NSE/FATAX/63809)"
        head={['Transaction', '1 Oct 2024 to 31 Mar 2026', 'From 1 April 2026', 'Payable by']}
        rows={[
          ['Futures sold, on the traded value', '0.02%', '0.05%', 'Seller'],
          ['Options sold, on the premium', '0.10%', '0.15%', 'Seller'],
          ['Options exercised, on the intrinsic value', '0.125%', '0.15%', 'Purchaser'],
          ['Equity shares bought or sold, settled by delivery', '0.1%', '0.1% (no change)', 'Purchaser and seller'],
          ['Equity shares sold intraday, not settled by delivery', '0.025%', '0.025% (no change)', 'Seller'],
        ]}
      />
      <P>
        Since 1 September 2019 the STT on an exercised option has been charged on its intrinsic value, the difference between the settlement price and the
        strike price (NSE/FATAX/41919). What the change means on one trade:
      </P>
      <Table
        caption="STT on one trade before and from 1 April 2026 (hypothetical values)"
        head={['Trade', 'Before', 'From 1 April 2026']}
        rows={[
          ['Futures sold, traded value ₹10,00,000', '0.02% × 10,00,000 = ₹200.00', '0.05% × 10,00,000 = ₹500.00'],
          ['Options sold, premium ₹1,00,000', '0.10% × 1,00,000 = ₹100.00', '0.15% × 1,00,000 = ₹150.00'],
          ['Option exercised, intrinsic value ₹50,000', '0.125% × 50,000 = ₹62.50', '0.15% × 50,000 = ₹75.00'],
        ]}
      />
      <P>
        Every STT rate by trade date, for futures, options, intraday and delivery, with the circular behind each, is on the page{' '}
        <A to="/resources/fo-charges-rates">STT rates by date for F&amp;O, intraday and delivery</A>.
      </P>

      <H2>Rates read from Zerodha&apos;s charges page</H2>
      <Table
        caption="Equity derivatives (NSE), as shown on zerodha.com/charges on 21 November 2026"
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
      <P>
        Brokerage differs between brokers; check your own broker&apos;s charges page and your contract notes (for GTT orders, see{' '}
        <A to="/blog/gtt-order-charges">GTT order charges by broker</A>). The NSE transaction charge of 0.03553% on options
        premium is NSE&apos;s total for each side. From 1 March 2026 it is a transaction charge of 0.0355299% plus an IPFT contribution of 0.0000001% (NSE/FA/73061);
        from 1 October 2024 to 28 February 2026 it was 0.03503% (NSE/FA/64232) plus a separate 0.0005% IPFT contribution, the same 0.03553% in total. Every
        rate by trade date, with its circular, is in <A to="/resources/fo-charges-rates">the F&amp;O charges and STT rate history</A>.
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
          { label: 'Zerodha: brokerage and charges', url: 'https://zerodha.com/charges', checked: '2026-11-21' },
          {
            label: 'NSE circular 02/2026 (NSE/FATAX/73524): changes in rates of Securities Transaction Tax, 31 March 2026',
            url: 'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf',
            checked: '2026-11-21',
          },
          {
            label: 'NSE circular 2/2024 (NSE/FATAX/63809): changes in rates of Securities Transaction Tax, 9 September 2024',
            url: 'https://nsearchives.nseindia.com/content/circulars/FATAX63809.pdf',
            checked: '2026-11-21',
          },
          {
            label: 'NSE circular 2/2019 (NSE/FATAX/41919): STT on exercised options on the intrinsic value, 20 August 2019',
            url: 'https://nsearchives.nseindia.com/content/circulars/FATAX41919.pdf',
            checked: '2026-11-21',
          },
          {
            label: 'NSE circular NSE/FA/64232: revision in transaction charges, 27 September 2024',
            url: 'https://nsearchives.nseindia.com/content/circulars/FA64232.pdf',
            checked: '2026-11-21',
          },
          {
            label: 'NSE circular NSE/FA/73061: revision in transaction charges, 27 February 2026',
            url: 'https://nsearchives.nseindia.com/content/circulars/FA73061.pdf',
            checked: '2026-11-21',
          },
        ]}
      />
      <Disclaimer />
    </>
  );
}
