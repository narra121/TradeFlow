import { A, Callout, Disclaimer, H2, OL, P, Table } from '../components/ArticleParts';

const code = 'rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground';
const download =
  'inline-flex h-10 max-md:h-11 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-medium';
const downloadPrimary = `${download} bg-primary text-primary-foreground hover:bg-primary/90`;
const downloadSecondary = `${download} border border-primary/40 text-primary hover:bg-primary/5`;

export default function TradingJournalExcelTemplate() {
  return (
    <>
      <H2 id="download">Free NSE F&amp;O template: download</H2>
      <P>
        A ready-made workbook for NSE futures and options trades. Type each trade once; quantity, turnover, estimated
        charges, net P&amp;L and weekday are calculated by formulas, and a summary sheet shows the results by setup and by
        weekday.
      </P>
      <div className="mb-4 flex flex-wrap gap-3">
        <a href="/templates/tradequt-fo-trading-journal.xlsx" download className={downloadPrimary}>
          Download Excel (.xlsx)
        </a>
        <a href="/templates/tradequt-fo-trading-journal.csv" download className={downloadSecondary}>
          Download CSV
        </a>
      </div>
      <P>
        The .xlsx opens in Excel and keeps its formulas. The CSV has the same 24 columns and the five sample rows as plain
        values, for tools that read CSV.
      </P>

      <H2>What is in the workbook</H2>
      <Table
        head={['Sheet', 'What it holds']}
        rows={[
          [
            'Journal',
            'One row per round trip, 24 columns plus two working columns, formulas filled down to row 501 and five labelled sample rows',
          ],
          [
            'Rates',
            'The charge rates for NSE futures and options, each with its effective date and source note, and a choice of broker plan for futures brokerage',
          ],
          ['Summary', 'Trades, wins, win rate, gross P&L, charges and net P&L overall, by setup and by weekday'],
          ['Instructions', 'How to use the file, what each column means and what it does not cover'],
        ]}
      />
      <P>
        You type the date, underlying, expiry, strike, CE/PE/FUT, side (buy or sell), lots, lot size, entry price, exit price,
        setup and a mistake or note. The sheet calculates quantity, gross P&amp;L, turnover, brokerage, STT, exchange charge,
        SEBI fee, stamp duty, GST, total charges, net P&amp;L and weekday.
      </P>

      <H2>How to use it</H2>
      <OL>
        <li>Download the .xlsx file above (or the CSV for plain values).</li>
        <li>Clear the input cells of the shaded sample rows and enter your own trades, one row per closed trade.</li>
        <li>Choose your broker plan on the Rates sheet so the futures brokerage matches.</li>
        <li>Type the setup names you use on the Summary sheet; the Journal offers them as a drop-down.</li>
        <li>Read the Summary sheet after each batch of trades.</li>
      </OL>

      <H2>How the charges are estimated</H2>
      <P>
        Each row is one round trip: an entry order and an exit order. Brokerage is charged per order, STT on the sell value,
        stamp duty on the buy value, the exchange charge (with NSE&apos;s IPFT contribution) and SEBI fee on turnover, and GST on
        brokerage plus the exchange transaction charge and SEBI fee. The Rates sheet lists every rate with its effective date and source note. The rate set applies
        from 1 April 2026, when STT on derivatives changed (see{' '}
        <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>), and was last checked on 16 November 2026.
      </P>
      <Callout title="Estimates: check your contract note">
        Your broker&apos;s contract note is the authority. Amounts can differ because of rounding, a position built from
        several orders, another broker plan or a rate change, and trades before 1 April 2026 paid different STT. The
        workbook does not cover BSE, currency or commodity derivatives, depository charges, STT on exercised options, other
        broker fees or income tax. The sample rows use made-up prices.
      </Callout>
      <P>
        Typing every trade gets slow. TradeQut can import the trade file from Zerodha, Upstox, Dhan, Angel One or Groww and
        estimate the charges for each trade: see the <A to="/fo-trading-journal">F&amp;O trading journal</A> or the{' '}
        <A to="/zerodha-trading-journal">Zerodha import</A>. To build a sheet for any market yourself, the columns and
        formulas follow.
      </P>

      <H2>The columns</H2>
      <P>Create a sheet with one row per closed trade and these columns (row 1 holds the headers).</P>
      <Table
        head={['Column', 'Header', 'What goes in it']}
        rows={[
          ['A', 'Date', 'Exit date'],
          ['B', 'Symbol', 'Instrument, for example NIFTY 24500 CE or EURUSD'],
          ['C', 'Setup', 'One name from a short list you keep'],
          ['D', 'Direction', 'Long or Short'],
          ['E', 'Entry', 'Average entry price'],
          ['F', 'Exit', 'Average exit price'],
          ['G', 'Quantity', 'Units, not lots (lot sizes change)'],
          ['H', 'Fees', 'Total charges for the trade'],
          ['I', 'Risk', 'Money lost if the stop is hit, before fees'],
          ['J', 'Net P&L', 'Formula below'],
          ['K', 'R', 'Net P&L divided by risk'],
          ['L', 'Mistake', 'Blank, or one tag such as "chased entry"'],
        ]}
      />

      <H2>The formulas (row 2)</H2>
      <Table
        head={['Cell', 'Formula']}
        rows={[
          ['J2 (net P&L)', <code key="j" className={code}>=IF(D2="Long",1,-1)*(F2-E2)*G2-H2</code>],
          ['K2 (R)', <code key="k" className={code}>=J2/I2</code>],
        ]}
      />
      <P>Copy J2 and K2 down the sheet. Then add a summary block anywhere (here for rows 2 to 500):</P>
      <Table
        head={['Metric', 'Formula']}
        rows={[
          ['Trades', <code key="a" className={code}>=COUNT(J2:J500)</code>],
          ['Win rate', <code key="b" className={code}>=COUNTIF(J2:J500,"&gt;0")/COUNT(J2:J500)</code>],
          ['Profit factor', <code key="c" className={code}>=SUMIF(J2:J500,"&gt;0")/ABS(SUMIF(J2:J500,"&lt;0"))</code>],
          ['Expectancy (R)', <code key="d" className={code}>=AVERAGE(K2:K500)</code>],
          ['Net P&L', <code key="e" className={code}>=SUM(J2:J500)</code>],
        ]}
      />
      <Callout title="Check the formulas before you trust them">
        Enter three trades by hand and compare the sheet with a calculator. Short trades should make money when the exit is
        below the entry; the <code className={code}>IF</code> handles this. Leave Risk filled for every trade or R will
        divide by zero.
      </Callout>

      <H2>Where a sheet starts to hurt</H2>
      <P>
        Typing every fill takes time, charges are easy to forget, and slicing by setup or hour needs pivot tables. When that
        happens, import your broker file into a journal instead:{' '}
        <A to="/blog/best-free-trading-journal">compare free options</A>, or see{' '}
        <A to="/blog/trading-journal-template">what each entry should include</A>.
      </P>
      <Disclaimer />
    </>
  );
}
