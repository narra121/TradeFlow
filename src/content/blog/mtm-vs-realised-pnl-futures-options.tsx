import { A, Callout, Disclaimer, H2, OL, P, Sources, Table, UL } from '../components/ArticleParts';
import { MtmCalculator } from '../components/MtmCalculator';

export default function MtmVsRealisedPnlFuturesOptions() {
  return (
    <>
      <P>
        One futures position can show three different profit and loss figures: the P&amp;L on your broker&apos;s positions
        page, the credit or debit for the day on the funds page, and the realised P&amp;L once you close. They measure the
        same trade from different starting points. Added up they agree; day by day they do not.
      </P>

      <H2>The three views</H2>
      <UL>
        <li>
          <strong>P&amp;L from entry price</strong> = (price − entry price) × quantity, with the sign reversed for a short
          position. It shows how far the position is from where you got in. Zerodha&apos;s Kite positions page shows this
          for futures and options, matched first in, first out.
        </li>
        <li>
          <strong>Daily mark-to-market (MTM)</strong>: at the end of each day every open futures position is marked to that
          day&apos;s settlement price. The day&apos;s MTM = (today&apos;s settlement − previous settlement) × quantity. On
          the first day the reference is your trade price, because there is no earlier settlement.
        </li>
        <li>
          <strong>Realised P&amp;L</strong> is booked when you square off: (exit price − entry price) × quantity, before
          charges.
        </li>
      </UL>
      <P>
        NSE Clearing&apos;s settlement page describes the daily step: after each day&apos;s settlement all open futures
        positions are reset to the daily settlement price, and the mark-to-market profits and losses are collected and
        settled every day (pay-in and pay-out on T+1, where T is the trade day). The clearing corporation deals with
        clearing members, who collect from trading members and their clients, so what your own ledger shows is set by your
        broker.
      </P>
      <Callout title="The settlement price is not the last traded price">
        NSE Clearing bases the daily settlement price of a futures contract on the volume-weighted average price of the
        last 30 minutes of trading, or another price decided by the relevant authority, and uses a theoretical price for a
        contract that did not trade in that window. Use the settlement prices your broker or the exchange publishes, not
        the price you last saw on screen.
      </Callout>

      <H2>One position, three ways: a worked example</H2>
      <P>
        Hypothetical, with made-up prices and lot size: you buy 2 lots of an index futures contract with a lot size of 50,
        so 100 units, at 24,150.00 on day 1. You hold through three day-ends, with settlement prices of 24,185.50, 24,120.25
        and 24,060.00, and square off on day 4 at 24,095.50.
      </P>
      <Table
        caption="Hypothetical long position of 100 units, amounts in ₹, before charges"
        head={['Day', 'Price', 'P&L from entry', 'Day’s MTM', 'MTM total so far']}
        rows={[
          ['Day 1 settlement', '24,185.50', '+3,550.00', '+3,550.00', '+3,550.00'],
          ['Day 2 settlement', '24,120.25', '−2,975.00', '−6,525.00', '−2,975.00'],
          ['Day 3 settlement', '24,060.00', '−9,000.00', '−6,025.00', '−9,000.00'],
          ['Exit, day 4', '24,095.50', '−5,450.00', '+3,550.00', '−5,450.00'],
        ]}
      />
      <P>
        Read across the table. The daily MTM entries (+3,550, −6,525, −6,025, +3,550) look nothing like the P&amp;L from
        entry (+3,550, −2,975, −9,000, −5,450), yet the running total of the daily entries equals the P&amp;L from entry on
        every row, and the last total is the realised P&amp;L: (24,095.50 − 24,150.00) × 100 = −5,450.00. On day 2 the
        day&apos;s MTM is −6,525 while the position is only −2,975 from entry, because day 1&apos;s +3,550 had already been
        settled. For a short position every sign reverses: a falling settlement price gives credits.
      </P>

      <H2>Try it with your own numbers</H2>
      <P>
        Enter a quantity, an entry price, up to five day-end settlement prices and an exit price. The calculator has no data
        feed and does not know your broker&apos;s figures; it applies the three formulas above, before charges.
      </P>
      <MtmCalculator />

      <H2>Options: premium settles on the trade</H2>
      <P>
        NSE Clearing&apos;s page describes options differently. Under options it lists daily premium settlement: the premium
        payable and receivable positions are netted at the client level at the end of each day and settled on T+1. Daily
        mark-to-market appears under futures, and the page describes none for open option positions. Zerodha&apos;s reply says
        the same of short options, that there is &ldquo;no M2M like futures&rdquo;, and adds that the margin needed to hold a
        short option can rise as it moves against you. This page describes margin and does not calculate it.
      </P>
      <Table
        caption="Hypothetical short option position of 100 units, amounts in ₹, before charges"
        head={['Day', 'What happens', 'P&L from entry', 'Premium settled on the trade']}
        rows={[
          ['Day 1', 'Sell 100 at 120.00', '0.00', '+12,000.00 received'],
          ['Day 2', 'Option trades at 100.00, no trade by you', '+2,000.00', 'None: no daily MTM entry'],
          ['Day 3', 'Buy back 100 at 80.00', '+4,000.00 (realised)', '−8,000.00 paid'],
        ]}
      />
      <P>
        The two premium movements, +12,000 and −8,000, add up to the realised +4,000 = (120.00 − 80.00) × 100. In between,
        the +2,000 on day 2 exists only as a figure from your entry price. How a broker&apos;s funds page treats an open
        option&apos;s loss is the broker&apos;s own description: Zerodha&apos;s support page says MTM losses from open F&amp;O
        positions reduce the available balance, and that you cannot use the benefit of MTM profits in your available margin.
      </P>

      <H2>Why a positions page and a funds page can disagree</H2>
      <P>
        Zerodha&apos;s reply on TradingQnA (11 June 2020) gives the cause for Kite: the positions page shows P&amp;L from
        your entry price, while the Console ledger behind the funds page records one credit or debit for every day you held an
        open futures position. It adds that other platforms can base the P&amp;L on the previous settlement price, and that
        Kite offers entry price by popular request. So the difference is a choice of reference price, and brokers differ. It
        is not an error in either figure.
      </P>

      <H2>Reconcile one futures position by hand</H2>
      <OL>
        <li>Write down the direction, quantity (lots × lot size), entry price and exit price.</li>
        <li>List the settlement price for each day-end the position was open.</li>
        <li>
          For each day, multiply (settlement − previous reference) by the quantity. The first reference is the entry price,
          then each previous settlement.
        </li>
        <li>Add the exit-day figure, (exit price − last settlement) × quantity, to the daily figures and add them all up.</li>
        <li>Compare with (exit price − entry price) × quantity. Before charges the two match.</li>
      </OL>

      <H2>In TradeQut</H2>
      <P>
        TradeQut turns the fills in an imported tradebook into round trips: buys and sells of the same contract are matched
        first in, first out, from flat to flat, and each closed round trip carries its entry price, exit price and gross
        P&amp;L; for Indian brokers it also carries estimated charges (see{' '}
        <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>). That is realised P&amp;L per round trip. A
        tradebook has no settlement prices, so the import records no daily MTM, and positions still open at the end of the
        file are skipped. For a futures position held over several days, the round trip&apos;s gross P&amp;L is the sum of
        its daily MTM entries, as in the table above. See{' '}
        <A to="/blog/zerodha-tradebook-pnl">how to analyse a Zerodha tradebook</A> and the{' '}
        <A to="/zerodha-trading-journal">Zerodha trading journal</A>.
      </P>

      <Callout title="What this page has not verified">
        <UL>
          <li>
            How Kite or any other broker app shows these figures today. Zerodha&apos;s reply is from June 2020 and its support
            page is undated; both were read on 15 November 2026. Where this page describes a broker, it is as described by
            that broker, and brokers differ.
          </li>
          <li>First in, first out matching for F&amp;O is Zerodha&apos;s convention, not something the NSE Clearing page sets.</li>
          <li>
            The NSE Clearing page is undated and describes clearing members, not how a broker settles with you. Check your
            contract note and ledger for your own figures.
          </li>
        </UL>
      </Callout>

      <Sources
        items={[
          {
            label: 'NSE Clearing: settlement mechanism for equity derivatives (daily MTM, daily premium settlement)',
            url: 'https://www.nseclearing.in/clearing-settlement/equity-derivatives/settlement-mechanism',
            checked: '2026-11-15',
          },
          {
            label: 'Zerodha TradingQnA: why the P&L on the positions page does not match the funds page (11 June 2020)',
            url: 'https://tradingqna.com/t/why-does-the-p-l-on-the-position-page-not-match-the-unrealised-realised-gains-on-funds-page-on-kite/80710',
            checked: '2026-11-15',
          },
          {
            label: 'Zerodha Support: realised and unrealised profit on the Kite funds page',
            url: 'https://support.zerodha.com/category/console/portfolio/holdings/articles/kite-funds-page-profit',
            checked: '2026-11-15',
          },
        ]}
      />
      <Disclaimer />
    </>
  );
}
