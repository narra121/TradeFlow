import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { BROKER_PAGES } from '@/content/brokers';
import { PLAN_LIMITS, PRODUCT_DEFINITION, TRIAL_DAYS, proPrice } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;
const trialImports = PLAN_LIMITS.find((r) => r.feature === 'Broker file imports')?.trial ?? '';

const FAQ = [
  {
    question: 'Is there a trading journal made for Indian markets?',
    answer:
      'Yes. TradeQut reads the trade files of Zerodha, Dhan, Upstox, Angel One and Groww, tells shares, futures and options apart from the symbol, estimates Indian charges on each trade and bills in rupees. Other journals also support Indian brokers; the comparison pages list what we verified about them.',
  },
  {
    question: 'Which Indian brokers can I import into TradeQut?',
    answer:
      'Zerodha (Console tradebook or P&L statement), Dhan, Upstox, Angel One and Groww trade files, plus any broker through a CSV or Excel file where you match the columns. MetaTrader 4 and 5 reports are supported for forex.',
  },
  {
    question: 'Does TradeQut connect to my broker account automatically?',
    answer: 'No. You upload the trade file your broker gives you. Automatic sync is planned, not available.',
  },
  {
    question: 'Does TradeQut include brokerage, STT and other charges?',
    answer:
      "For files from Zerodha, Dhan, Upstox, Angel One and Groww, TradeQut estimates brokerage from the broker's standard plan, and STT, the NSE transaction charge and IPFT contribution, SEBI fee, stamp duty and GST from a dated table of rates. For NSE trades from 1 October 2024 those statutory charges use the rates in force on the trade date; for older trades the transaction charge is an approximation, because NSE then charged it by each broker's monthly volume, and small differences in the SEBI fee and GST are possible. STT on an option exercised at expiry is not included. The total is recorded as the fees of that trade. Your contract note is the authoritative figure.",
  },
  {
    question: 'Can I journal intraday equity trades as well as F&O?',
    answer:
      'Yes. Every trade carries its asset class, so intraday equity, delivery, futures, options and commodity trades sit in one journal. Analytics shows results by hour and by trade number in the day, and the tax report separates intraday equity, F&O, commodity and delivery.',
  },
  {
    question: 'Does TradeQut make a tax P&L report for my CA?',
    answer:
      'Yes, on Pro. For each financial year it splits the charges into STT, exchange charges, SEBI fee and stamp duty, with brokerage, GST and other charges as the remainder, and shows P&L by tax category: intraday equity, F&O, commodity, and short- and long-term delivery. It needs accounts in rupees. TradeQut does not file taxes and this is not tax advice.',
  },
  {
    question: 'Is there a free trial for Indian traders?',
    answer: `Yes. Every account starts with a ${TRIAL_DAYS}-day free trial with every Pro feature and no card. After that Pro is ${inrMonth} a month or ${inrYear} a year; without Pro the journal is read-only, so you can still view and export your trades.`,
  },
];

export default function TradingJournalIndiaPage() {
  const page = getSeoPage('/trading-journal-india');
  return (
    <ContentPageShell
      title={page.title}
      description={page.description}
      path={page.path}
      jsonLd={seoPageSchema(page, [], FAQ)}
    >
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
        Trading journal for Indian traders: F&amp;O, intraday and delivery
      </h1>
      <ShortAnswer>
        TradeQut imports your {BROKER_PAGES.map((b) => b.name).join(', ')} trade file, records each trade with fees, and shows
        which strategies, hours and broken rules make or lose money, net of charges. Pricing is in INR: {inrMonth} a month or{' '}
        {inrYear} a year, after a {TRIAL_DAYS}-day trial.
      </ShortAnswer>
      <P>{PRODUCT_DEFINITION}</P>

      <H2>Import from your Indian broker</H2>
      <P>
        Download the trade report from your broker and drop it on the Import page. TradeQut detects the broker, shows every
        trade for review before saving, and skips trades that were already imported into that account. Each broker has a
        page with the export steps and the columns TradeQut reads:
      </P>
      <UL>
        {BROKER_PAGES.map((b) => (
          <li key={b.id}>
            <A to={b.path}>{b.name} trading journal</A>: import the {b.fileName}
          </li>
        ))}
      </UL>
      <P>
        Example for Zerodha: in Console go to <em>Reports &rarr; Tradebook</em>, choose the segment and a date range, then
        download as CSV or XLSX. Zerodha allows at most 365 days per download. A step-by-step version is in{' '}
        <A to="/blog/zerodha-tradebook-pnl">the Zerodha tradebook guide</A>. Any other broker works through a CSV or Excel
        file where you match the columns, and when there is no export at all you can{' '}
        <A to="/import-trades-from-screenshot">import trades from a screenshot</A>. Trading forex as well? See the{' '}
        <A to="/forex-trading-journal">forex trading journal</A> (MT4 and MT5 report import).
      </P>

      <H2>See what trading really cost</H2>
      <OL>
        <li>
          Tradebooks list fills, not charges, so TradeQut estimates brokerage, STT, exchange charges, SEBI fee, stamp duty and
          GST for each trade from a dated table of rates: exact to the trade date for NSE trades from 1 October 2024, an
          approximation of the transaction charge before that, and without STT on options exercised at expiry. P&amp;L is
          shown net of them; your contract note stays the final word.
        </li>
        <li>
          Analytics shows results by strategy, session, weekday and hour, and what each mistake and broken rule cost. For
          options it also splits calls from puts and expiry day from other days; see the{' '}
          <A to="/fo-trading-journal">F&amp;O trading journal</A> and the{' '}
          <A to="/blog/options-trading-journal-india">options journal fields</A>.
        </li>
        <li>
          Write your rules (for example, no new trade after two losses) and mark the ones a trade broke. Goals &amp; rules
          shows each rule week by week and what the breaks cost.
        </li>
      </OL>
      <P>
        What the charges are, and how STT on futures and options rose on 1 April 2026, is explained in{' '}
        <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>. Pro includes a tax report for each financial year: the charges split into STT, exchange charges, SEBI fee and stamp duty, with brokerage, GST and other charges as the remainder, and P&amp;L by tax category (intraday equity, F&amp;O, commodity, short- and long-term delivery) to take to your CA. TradeQut does not file taxes and
        this is not tax advice.
      </P>

      <H2>What it does for each kind of trading</H2>
      <Table
        caption="By what you trade"
        head={['If you trade', 'What you get']}
        rows={[
          ['Nifty and Bank Nifty options', 'Strike, expiry and call or put read from the symbol; results by calls and puts and by expiry day'],
          ['Futures', 'Each contract as a trade with its estimated charges, including the higher STT from 1 April 2026'],
          ['Intraday equity', 'Results by hour, by trade number in the day and by holding time of winners against losers'],
          ['Delivery and swing trades', 'One journal across accounts, with strategy, notes, tags and chart screenshots on each trade'],
          ['More than one broker', 'A separate account per broker, viewed together or apart'],
        ]}
      />

      <H2>What TradeQut does not do</H2>
      <UL>
        <li>It does not connect to your broker. You upload files; automatic sync is planned, not available.</li>
        <li>It gives no tips, signals or strike recommendations, and it is not a SEBI-registered investment adviser.</li>
        <li>It has no native mobile app. It is a web app that works in desktop and mobile browsers.</li>
        <li>Its charges are estimates from published rates, not a copy of your contract note.</li>
      </UL>

      <H2>How it compares</H2>
      <P>
        Other journals serve Indian traders too. TradesViz has a free plan and imports the Zerodha tradebook; TradeZella
        syncs with brokers automatically and prices in dollars. Each comparison gives the date the other product&apos;s
        pages were read, says what could not be verified and where that product is stronger: <A to="/alternatives/tradesviz">TradesViz</A>,{' '}
        <A to="/alternatives/tradezella">TradeZella</A>, <A to="/alternatives/tradervue">Tradervue</A>,{' '}
        <A to="/alternatives/edgewonk">Edgewonk</A> and <A to="/alternatives/tradersync">TraderSync</A>.
      </P>

      <H2>What it costs</H2>
      <P>
        A {TRIAL_DAYS}-day free trial with every Pro feature and no card, including broker file imports ({trialImports.toLowerCase()}).
        Then Pro: {inrMonth} a month or {inrYear} a year; without it the journal is read-only. Details on the{' '}
        <A to="/pricing">pricing page</A>. Comparing journals? See{' '}
        <A to="/alternatives">the alternatives</A>.
      </P>

      <Faq items={FAQ} />
      <Sources
        items={[
          { label: 'Zerodha Support: Tradebook in Console', url: 'https://support.zerodha.com/category/console/reports/articles/where-can-i-see-all-the-trades-i-ve-taken-for-a-particular-period', checked: '2026-11-11' },
          { label: 'NSE circular 02/2026 (NSE/FATAX/73524): changes in rates of Securities Transaction Tax, 31 March 2026', url: 'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf', checked: '2026-11-12' },
        ]}
      />
      <Disclaimer />
      <SignupCta />
    </ContentPageShell>
  );
}
