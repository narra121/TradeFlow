import { A, Callout, Disclaimer, H2, OL, P, Sources, UL } from '../components/ArticleParts';

export default function ZerodhaTradebookPnl() {
  return (
    <>
      <H2>Download the tradebook</H2>
      <OL>
        <li>Sign in to Zerodha Console (console.zerodha.com) with your Kite credentials.</li>
        <li>
          Open <em>Reports &rarr; Tradebook</em>.
        </li>
        <li>Select the segment (for example Equity or F&amp;O), choose a date range and click the arrow button.</li>
        <li>Download the result; the control beside the Download button lets you choose XLSX or CSV.</li>
      </OL>
      <Callout title="365-day limit">
        Zerodha lets you download at most 365 days per export. For a longer history, download one file per period and
        import them one after another. Menu labels can change; Zerodha&apos;s support page is the reference.
      </Callout>

      <H2>What the tradebook is, and is not</H2>
      <P>
        The tradebook is a list of <strong>executions</strong>: each row is one fill with a symbol, date, buy or sell,
        quantity, price and order and trade IDs. It is not a list of closed trades with profit, and it does not contain
        charges. Check the columns of your own file before relying on any of them.
      </P>
      <UL>
        <li>To get profit per trade, buys must be matched with sells of the same instrument (first in, first out is the common rule).</li>
        <li>Partial fills show as several rows that belong to one order; group them by order ID.</li>
        <li>Charges come from your contract notes or Console&apos;s P&amp;L report, not from the tradebook.</li>
      </UL>

      <H2>Turn executions into a P&amp;L you can trust</H2>
      <OL>
        <li>Import the file into your journal so that each round trip becomes one trade with an entry and an exit.</li>
        <li>Compare the journal&apos;s total for a month with Console&apos;s own P&amp;L report. They should agree before charges; differences point to missing rows or unmatched legs.</li>
        <li>Add charges (see <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>) to get net P&amp;L.</li>
        <li>Tag setups and mistakes while the day is fresh; the file cannot tell you why you traded.</li>
      </OL>
      <P>
        TradeQut reads the Zerodha tradebook CSV or XLSX and skips trades you already imported, so overlapping date ranges
        are safe. See <A to="/trading-journal-india">the journal for Indian traders</A>.
      </P>

      <Sources
        items={[
          {
            label: 'Zerodha Support: where to see the trades taken for a period',
            url: 'https://support.zerodha.com/category/console/reports/articles/where-can-i-see-all-the-trades-i-ve-taken-for-a-particular-period',
            checked: '2026-11-11',
          },
        ]}
      />
      <Disclaimer />
    </>
  );
}
