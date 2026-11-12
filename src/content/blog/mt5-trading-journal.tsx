import { A, Callout, Disclaimer, H2, OL, P, Sources, UL } from '../components/ArticleParts';

export default function Mt5TradingJournal() {
  return (
    <>
      <H2>Get your history out of MetaTrader</H2>
      <OL>
        <li>Open the terminal&apos;s Toolbox (View &rarr; Toolbox, or Ctrl+T) and go to the History tab.</li>
        <li>Choose the period you want (for example all history or the last month).</li>
        <li>Right-click inside the list and choose <em>Report</em>. MetaTrader 5&apos;s help describes the report as an HTML file.</li>
        <li>Some builds also offer XLSX; use it if your journal imports spreadsheets.</li>
      </OL>
      <P>
        MetaTrader 4 has a similar account history tab with a report option. Menu names differ between versions and brokers,
        so follow your own terminal&apos;s menu.
      </P>

      <H2>What to check in the file</H2>
      <UL>
        <li>
          <strong>Time zone</strong>: times in the history are in your broker&apos;s server time, not your local time. Convert
          before you analyse sessions or hours.
        </li>
        <li>
          <strong>Commission and swap</strong>: they are separate columns; net P&amp;L is profit plus commission plus swap.
        </li>
        <li>
          <strong>Partial closes</strong>: a position closed in parts appears as several rows. Group them as one trade if you
          want one result per decision.
        </li>
      </UL>

      <H2>What forex and prop traders should journal</H2>
      <UL>
        <li>Pair, direction, stop, target, and the risk in money at the stop (not just pips).</li>
        <li>Session of entry, using one fixed time zone.</li>
        <li>Daily and overall loss against your firm&apos;s limits if you trade a funded account.</li>
        <li>A mistake tag and one line on why you took the trade.</li>
      </UL>
      <Callout title="Prop-firm rules differ">
        How a firm measures its daily and overall loss limits (balance or equity, which time zone resets the day) and any
        consistency rules differ and change. Write your firm&apos;s current rules into your journal from its own page.
      </Callout>
      <P>
        TradeQut imports MetaTrader 4 and 5 reports. Read{' '}
        <A to="/blog/prop-trading-challenges">prop trading challenges</A> and{' '}
        <A to="/blog/forex-trading-journal">what forex traders should track</A> next.
      </P>

      <Sources
        items={[
          {
            label: 'MetaTrader 5 Help: Trading Report',
            url: 'https://www.metatrader5.com/en/terminal/help/trading_advanced/history_report',
            checked: '2026-11-11',
          },
        ]}
      />
      <Disclaimer />
    </>
  );
}
