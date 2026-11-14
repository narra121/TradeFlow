import { A, Callout, H2, H3, OL, P, Table, UL } from '../components/ArticleParts';
import { PLAN_LIMITS } from '../product-facts';

const limit = (feature: string) => PLAN_LIMITS.find((r) => r.feature === feature);
const imports = limit('Broker file imports');
const extraction = limit('AI extraction from screenshots/files');

export default function ImportingTradesFromBroker() {
  return (
    <>
      <P>
        Typing every fill by hand is the main reason traders give up on a journal. TradeQut&apos;s <em>Import</em> page takes the
        file your broker already gives you, or screenshots when there is no file, and shows every trade for review before
        anything is saved. This guide covers each route and what to check.
      </P>

      <H2>Supported broker files</H2>
      <Table
        caption="Where to download the file (menu names can differ by app version)"
        head={['Broker', 'File', 'Where to find it']}
        rows={[
          ['Zerodha', 'Console tradebook, CSV or XLSX', 'Console → Reports → Tradebook → segment and date range (at most 365 days per download)'],
          ['Zerodha', 'Console P&L statement, XLSX or CSV', 'Console → Reports → P&L. A per-symbol summary without trade times; the tradebook gives full trades'],
          ['Dhan', 'Trade history, CSV or XLSX', 'Dhan web → Reports → Trade History → date range'],
          ['Upstox', 'Trade report, CSV or XLSX', 'Reports → Trade Report (Tradebook) → segment and date range'],
          ['Angel One', 'Trade history, CSV or XLSX', 'Reports → Trade History (or Tradebook) → date range'],
          ['Groww', 'Order history, XLSX or CSV', 'Profile → Reports → Order History (Stocks or F&O) → date range'],
          ['MetaTrader 4', 'Detailed report, HTML', 'Account History tab → right-click → Save as Detailed Report'],
          ['MetaTrader 5', 'History report, HTML or XLSX', 'Toolbox → History → right-click → Report'],
        ]}
      />
      <P>
        Leave <em>Source</em> on <em>Auto-detect</em> and TradeQut recognises the layout, or pick the broker yourself; each
        broker button shows its export steps. Files can be CSV, XLSX or HTML up to 4 MB.
      </P>

      <H2>How an import works</H2>
      <OL>
        <li>Open <em>Import</em> and choose the account the trades belong to.</li>
        <li>Drop the file on the page, paste it, or choose it from your computer.</li>
        <li>
          Review the table. Each row is marked <em>Ready</em>, <em>Needs a fix</em> (a value is missing or unclear; edit it in
          place) or <em>Already imported</em>.
        </li>
        <li>Import. Only the rows you kept are saved, and the page shows how many.</li>
      </OL>

      <H3>Duplicates</H3>
      <P>
        Every imported trade keeps a reference to the file record it came from. Import the same tradebook again, or an
        overlapping date range, and the trades already in that account are marked <em>Already imported</em> and skipped.
      </P>

      <H3>Charges for Indian brokers</H3>
      <P>
        Tradebooks list fills, not the charges on them. For Zerodha, Dhan, Upstox, Angel One and Groww files, TradeQut estimates
        brokerage, STT, exchange transaction charges, SEBI fee, stamp duty and GST for each trade at the rates in force on the
        trade date, and records the total as the trade&apos;s fees, so P&amp;L is net. Your contract note is the authoritative
        figure. Why these charges matter is explained in <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>.
      </P>

      <H3>MetaTrader times and costs</H3>
      <P>
        MetaTrader reports use the broker&apos;s server time, and commission and swap are separate columns. TradeQut reads both
        and includes them in net P&amp;L. See the <A to="/blog/mt5-trading-journal">MT5 journal guide</A> for what to check.
      </P>

      <H2>Any other broker: CSV or Excel</H2>
      <P>
        Choose <em>Other broker</em> and upload a CSV or Excel export. You match your file&apos;s columns to the trade fields
        (symbol, side, quantity, prices, dates, fees) on the next step. No export at all? Download the CSV template from the
        Import page, fill in your trades and import it the same way.
      </P>

      <H2>Screenshots, when there is no file</H2>
      <P>
        Some prop-firm and broker dashboards have no export. Upload or paste screenshots of the trade list: PNG, JPG or WebP,
        up to 1 MB each and up to 15 at a time. AI extraction (Google Gemini, through OpenRouter) reads the trades, and the review table shows the
        screenshot behind each row so you can compare the numbers before importing.
      </P>
      <UL>
        <li>Capture whole rows with their column headers; do not crop too tightly.</li>
        <li>Use several clear screenshots rather than one zoomed-out image.</li>
        <li>Check prices and dates against the image: extraction can misread a digit.</li>
      </UL>

      <H2>Monthly limits</H2>
      <Table
        caption="Import limits by plan"
        head={['', 'Free trial', 'Pro']}
        rows={[
          ['Broker file imports', imports?.trial ?? '', imports?.pro ?? ''],
          ['AI extraction from screenshots', extraction?.trial ?? '', extraction?.pro ?? ''],
        ]}
      />
      <P>
        The bar under the Import page title shows how many you have left this month. Plans are compared on the{' '}
        <A to="/pricing">pricing page</A>.
      </P>

      <Callout title="Automatic broker sync">
        TradeQut imports files today. Automatic broker sync is planned for Pro and is not available yet.
      </Callout>

      <H2>After the import</H2>
      <P>
        Spot-check three or four trades against your broker&apos;s records: prices, dates, quantity and net P&amp;L. Then add the
        journal fields (strategy, mistakes, broken rules, a key lesson) to the trades you want to learn from. The{' '}
        <A to="/guide#importing-trades">user guide</A> shows the Import page step by step.
      </P>
    </>
  );
}
