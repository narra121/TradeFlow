import { A, Disclaimer, H2, P, Sources, Table, UL } from '../components/ArticleParts';

export default function BestFreeTradingJournal() {
  return (
    <>
      <H2>What &ldquo;free&rdquo; should include</H2>
      <P>
        Free tools differ in what they cap. Before choosing, check four limits: how many trades or executions you can
        import each month, how many trading accounts you can keep, which asset classes are allowed, and whether the
        review tools you need (tags, notes, rules, analytics) are behind a paid plan.
      </P>

      <H2>Options compared</H2>
      <Table
        caption="Facts read from vendor pages on 11 November 2026"
        head={['Option', 'Free tier', 'Main limits', 'Best when']}
        rows={[
          [
            'Spreadsheet (Excel or Google Sheets)',
            'Always free',
            'You build the formulas and import by hand',
            'You trade a few times a week and like control',
          ],
          [
            'TradesViz Basic',
            'Free forever, no card',
            '3,000 executions a month, 1 account, stocks only, P&L-only calendar data',
            'You want charting and a mature importer list',
          ],
          [
            'TradeQut Free',
            'Free, unlimited manual trades',
            '2 trading accounts, 3 broker file imports a month, advanced analytics previewed only',
            'You want rules, review notes and Indian broker files',
          ],
          [
            'TradeZella',
            'No free plan advertised',
            'Paid plans from $35 a month',
            'You want automatic sync and will pay',
          ],
        ]}
      />
      <P>
        Tradervue also has a free tier with a small monthly trade limit; read the limit on its plans page before deciding,
        because third-party sites disagree on the number.
      </P>

      <H2>How to choose in 30 minutes</H2>
      <UL>
        <li>Take one month of your own broker file.</li>
        <li>Import it into two free tools and a spreadsheet.</li>
        <li>Check that total P&amp;L matches your broker&apos;s own report in each.</li>
        <li>Try to answer one real question, such as &ldquo;which setup lost the most?&rdquo;. The tool that answers it fastest wins.</li>
      </UL>
      <P>
        A spreadsheet is a good start (see the <A to="/blog/trading-journal-excel-template">Excel template guide</A>). A
        journal pays for itself when importing and review habits become the bottleneck. Compare more in{' '}
        <A to="/alternatives">TradeQut alternatives</A> or look at <A to="/pricing">TradeQut&apos;s Free plan</A>.
      </P>

      <Sources
        items={[
          { label: 'TradesViz pricing', url: 'https://www.tradesviz.com/pricing/', checked: '2026-11-12' },
          { label: 'TradeZella pricing', url: 'https://www.tradezella.com/pricing', checked: '2026-11-12' },
        ]}
      />
      <Disclaimer>
        TradeQut is one of the products in this comparison. We state each tool&apos;s limits as shown on its own page; vendors
        change plans, so confirm before you rely on a number. Not investment advice.
      </Disclaimer>
    </>
  );
}
