import { Fragment } from 'react';
import { checkedOn } from '@/content/alternatives';
import { GTT_BROKERS, GTT_CHECKED, type GttBroker, type GttCell } from '../gtt-charges';
import { A, Callout, Disclaimer, H2, H3, OL, P, Sources, Table, UL, type Source } from '../components/ArticleParts';

/** Pages quoted in the running text below the tables. */
const TEXT_SOURCES: Source[] = [
  {
    label: 'Zerodha: What is After Market Order (AMO) & its timings?',
    url: 'https://support.zerodha.com/category/trading-and-markets/charts-and-orders/order/articles/auto-amo',
    checked: GTT_CHECKED,
  },
  {
    label: 'Zerodha: What are stoploss orders and how to use them?',
    url: 'https://support.zerodha.com/category/trading-and-markets/charts-and-orders/order/articles/what-are-stop-loss-orders-and-how-to-use-them',
    checked: GTT_CHECKED,
  },
  {
    label: 'Zerodha: What does Day, Immediate and Minutes validity mean?',
    url: 'https://support.zerodha.com/category/trading-and-markets/charts-and-orders/order/articles/what-does-ioc-in-the-order-window-mean',
    checked: GTT_CHECKED,
  },
  {
    label: 'ICICI Direct: How are GTT orders different from stop-loss orders?',
    url: 'https://www.icicidirect.com/faqs/fno/how-are-gtt-orders-different-from-stop-loss-orders',
    checked: GTT_CHECKED,
  },
];

const ALL_SOURCES: Source[] = [
  ...GTT_BROKERS.flatMap((b) => b.sources.map((s) => ({ label: s.label, url: s.url, checked: s.checked }))),
  ...TEXT_SOURCES,
].filter((s, i, all) => all.findIndex((x) => x.url === s.url) === i);

function BrokerCell({ b }: { b: GttBroker }) {
  return (
    <>
      <span className="block font-semibold text-foreground">{b.broker}</span>
      {b.feature !== 'GTT' && <span className="block">{b.feature}</span>}
      <span className="block text-xs">
        Read {checkedOn(GTT_CHECKED)}:{' '}
        {b.sources.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 && ', '}
            <A to={s.url}>{s.short}</A>
          </Fragment>
        ))}
      </span>
    </>
  );
}

// On phones the tables scroll sideways instead of squeezing each column to a word or two per line.
const text = (c: GttCell) => <span className="block max-md:min-w-[9rem]">{c.text}</span>;

export default function GttOrderCharges() {
  const notes = GTT_BROKERS.filter((b) => b.note);
  return (
    <>
      <P>
        A GTT is a standing instruction your broker holds: when the last traded price reaches your trigger, the broker sends an order to the exchange for
        you. The tables below record what ten brokers say on their own websites about the cost, validity and limits of that instruction, read on{' '}
        {checkedOn(GTT_CHECKED)}. Each row links the broker&apos;s pages it was copied from; where those pages do not answer a question, the cell says so.
      </P>

      <H2>GTT charges by broker</H2>
      <Table
        caption={`GTT charges, validity and availability by broker, from each broker’s own pages (read ${checkedOn(GTT_CHECKED)})`}
        head={['Broker', 'To place a GTT', 'When it triggers and executes', 'Validity', 'Where available']}
        rows={GTT_BROKERS.map((b) => [<BrokerCell key={b.id} b={b} />, text(b.placing), text(b.onExecution), text(b.validity), text(b.availability)])}
      />
      <P>
        Seven of the ten say placing a GTT costs nothing extra: Zerodha, Groww, Upstox, Fyers and mStock without qualification, Angel One
        &ldquo;usually&rdquo; and ICICI Direct &ldquo;typically&rdquo;. On execution, the eight that answer charge their standard brokerage or fees, and
        Groww, Upstox and Fyers say the charges are the same as on a regular order. The one GTT-specific charge is Kotak Neo&apos;s: from 18 Apr 2026, a
        GTT placed by a dealer and executed from T+1 pays at least ₹10 brokerage. Dhan&apos;s Forever Order pages and 5paisa&apos;s VTT pages read for this
        article do not mention charges.
      </P>

      <H2>Order types, limits and corporate actions</H2>
      <Table
        caption={`GTT order types, limits and corporate-action rules by broker (read ${checkedOn(GTT_CHECKED)})`}
        head={['Broker', 'Order types', 'GTTs allowed at a time', 'After a corporate action']}
        rows={GTT_BROKERS.map((b) => [b.broker, text(b.orderTypes), text(b.activeCap), text(b.corporateAction)])}
      />
      <H3>Where a broker&apos;s own pages disagree or are dated</H3>
      <OL>
        {notes.map((b) => (
          <li key={b.id}>{b.note!.text}</li>
        ))}
      </OL>

      <H2>If a GTT never triggers</H2>
      <P>
        None of the brokers&apos; pages read for this article describes a charge for a GTT that never triggers, expires or is cancelled. The charges they
        list attach to the order a GTT sends: Groww lists them under &ldquo;If the order gets executed&rdquo;, ICICI Direct says standard fees apply
        &ldquo;once the order is executed&rdquo;, Zerodha says normal brokerage applies &ldquo;once the GTT is triggered&rdquo;, and a FYERS Team reply says
        there are no charges for the GTT itself &ldquo;neither before nor after it gets triggered&rdquo;.
      </P>
      <P>
        A trigger works once. Zerodha, Upstox, Angel One and mStock say that an order a GTT sends and that does not execute that day is cancelled at the end
        of the session, and Fyers that the GTT is cancelled; you place a new GTT if you still want one.
      </P>

      <H2>Validity: what a one-year GTT means</H2>
      <P>
        A one-year GTT is a trigger that waits up to a year. Every broker in the table gives up to one year or 365 days, and those that say from when count
        from the day you place it (Angel One: &ldquo;consecutive calendar days&rdquo;). If the price never reaches the trigger in that time, the GTT expires and you place a new one.
        For F&amp;O, Zerodha, Groww, Upstox, Angel One, Kotak Neo, ICICI Direct and Fyers end the GTT when the contract expires. Two brokers give
        intraday GTTs a shorter life: Upstox&apos;s validity page says an intraday GTT lapses at the end of the session, about 3:15 PM, and at Dhan an intraday Forever Order ends
        with the day.
      </P>

      <H2>The limit price</H2>
      <P>
        The trigger decides when the order goes to the exchange; the limit price is the price of the limit order it sends, so it sets the worst price that
        order can fill at. Zerodha&apos;s example: with Reliance at ₹1,337, a buy GTT with a ₹1,300 trigger and a ₹1,305 limit places a buy limit order at
        ₹1,305 when the price drops to ₹1,300. Zerodha suggests keeping the limit above the trigger for a buy GTT and below it for a sell GTT, or using a
        market order, which it sends with market protection.
      </P>
      <UL>
        <li>Angel One accepts limit orders only as GTT orders.</li>
        <li>Groww makes the limit price optional; without one, it places a market order when the trigger is reached.</li>
        <li>Upstox places triggered orders as limit orders with a percentage of protection over the trigger price (market price protection).</li>
        <li>Kotak Neo and ICICI Direct describe the order a GTT sends as a limit order.</li>
      </UL>
      <P>
        A price gap can trigger a GTT beyond its limit. Zerodha&apos;s example: a buy GTT with a ₹100 trigger and a ₹102 limit, on a stock that closes at
        ₹90 and opens at ₹110, triggers at the open and is placed at ₹102; if it does not execute by the end of the day, it is cancelled like a normal
        order.
      </P>

      <H2>GTT, AMO and stop-loss orders</H2>
      <P>They answer different questions, so neither is better in general. Zerodha&apos;s support pages describe all three:</P>
      <UL>
        <li>
          <strong>AMO (after market order)</strong> is an order placed outside market hours. Zerodha sends it to the exchange when the market opens, at
          9:00 AM for equity market and limit orders and 9:15 AM for F&amp;O, and considers the next trading day&apos;s opening price for execution. It is
          waiting for the open.
        </li>
        <li>
          <strong>A stop-loss order</strong> is a regular order with a trigger price: when the price reaches the trigger, a limit order (SL) or a market
          order (SL-M) goes to the exchange. At Zerodha a regular order&apos;s validity is Day, Immediate or Minutes, and a Day order stays open until it
          executes or the market closes, so it does not carry over to the next session.
        </li>
        <li>
          <strong>A GTT</strong> is waiting for a price: it sits on the broker&apos;s system for up to a year and sends an order only if the price reaches the
          trigger, on whichever day that happens. You can place or change one at any time, but Zerodha activates triggers only during market hours, and it
          points to GTT for &ldquo;long-standing target and stoploss orders with a validity of 1 year&rdquo;.
        </li>
      </UL>
      <P>
        ICICI Direct puts the difference this way: GTT orders can be used for entry and exit, while stop-loss orders are for limiting losses, though a GTT
        placed on an open position can act as a stop-loss. One practical limit: Zerodha does not accept an AMO with the GTT stop-loss or target option
        selected in the order window.
      </P>

      <H2>Corporate actions and expiry</H2>
      <P>
        A split, bonus, large dividend or merger moves a stock&apos;s price without a trade, so a trigger set before the ex-date could fire at an unadjusted
        price; Fyers cancels GTTs before the ex-date &ldquo;to avoid misfires&rdquo;. All ten brokers address it (mStock in its Good Till Date policy), and each
        cancels at least some affected orders; the second table has every rule. The details differ:
      </P>
      <UL>
        <li>
          <strong>When:</strong> Upstox and Angel One cancel one day before the ex-date, ICICI Direct two days before, Zerodha on the ex-date after a notice
          the day before, and Fyers before the ex-date.
        </li>
        <li>
          <strong>Which actions:</strong> Zerodha counts dividends above 2% of the price, Upstox and ICICI Direct above 5%; Groww and Dhan cancel every GTT on
          the affected stock.
        </li>
        <li>
          <strong>Notice:</strong> Dhan notifies at least two days before the ex-date, 5paisa at least one trading day before, and ICICI Direct sends an
          email with the reason.
        </li>
      </UL>
      <P>Zerodha, Groww and Fyers say to place a new GTT after the corporate action if you still want one.</P>
      <P>
        An F&amp;O GTT ends with its contract: at Zerodha, pending GTTs for a contract are invalidated one day after it expires, and GTTs on index F&amp;O
        contracts are cancelled whenever the contract&apos;s lot size changes. Zerodha also warns that a GTT which opens a position in a stock F&amp;O
        contract can leave you with a physical delivery obligation if the contract expires with the position open.
      </P>

      <H2>Charges once a GTT executes</H2>
      <P>
        A GTT that executes is an ordinary trade, so the statutory charges apply as on any order. Groww&apos;s GTT page lists STT, stamp duty, exchange
        transaction charges, SEBI turnover charges and the Investor Protection Fund Trust charge, plus GST; Upstox&apos;s lists brokerage, transaction
        charges, STT, GST and other regulatory charges. For the rates, see{' '}
        <A to="/blog/fo-trading-charges-india">New STT charges from 1 April 2026</A> in the F&amp;O trading charges article, and{' '}
        <A to="/resources/fo-charges-rates">STT rates 2026: F&amp;O, intraday and delivery</A>.
      </P>

      <Callout title="These terms change">
        Kotak Neo changed its GTT brokerage on 18 Apr 2026, Zerodha&apos;s terms say its GTT pricing can change after prior notice, and Upstox and Angel One
        reserve the right to change their GTT terms without notice. Check the broker&apos;s linked page before you rely on a cell in these tables.
      </Callout>

      <Sources items={ALL_SOURCES} />
      <Disclaimer />
    </>
  );
}
