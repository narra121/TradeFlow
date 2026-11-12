import { A, Callout, Disclaimer, H2, P, Table } from '../components/ArticleParts';

const code = 'rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground';

export default function TradingJournalExcelTemplate() {
  return (
    <>
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
