import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Sources, UL } from '@/content/components/ArticleParts';
import { IMPORT_SOURCES, PLAN_LIMITS, PRODUCT_DEFINITION, TRIAL_DAYS, proPrice } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;
const freeImports = PLAN_LIMITS.find((r) => r.feature === 'Broker file imports')?.free ?? '3 per month';

const FAQ = [
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
      'For files from Zerodha, Dhan, Upstox, Angel One and Groww, TradeQut estimates brokerage, STT, exchange transaction charges, SEBI fee, stamp duty and GST for each trade at the rates in force on the trade date, and records them as the fees of that trade. Your contract note is the authoritative figure.',
  },
  {
    question: 'Does TradeQut make a tax P&L report for my CA?',
    answer:
      'Yes, on Pro. For each financial year it splits the charges into STT, exchange charges, SEBI fee and stamp duty, with brokerage, GST and other charges as the remainder, and shows P&L by tax category: intraday equity, F&O, commodity, and short- and long-term delivery. It needs accounts in rupees. TradeQut does not file taxes and this is not tax advice.',
  },
  {
    question: 'Is there a free plan for Indian traders?',
    answer: `Yes. The Free plan has unlimited manual trades; broker file imports are limited to ${freeImports}. Pro is ${inrMonth} a month or ${inrYear} a year, with a ${TRIAL_DAYS}-day trial and no card.`,
  },
];

export default function TradingJournalIndiaPage() {
  const page = getSeoPage('/trading-journal-india');
  const brokers = IMPORT_SOURCES.filter((s) => s.id !== 'generic_csv' && s.id !== 'mt4' && s.id !== 'mt5');
  return (
    <ContentPageShell
      title={page.title}
      description={page.description}
      path={page.path}
      jsonLd={seoPageSchema(page, [], FAQ)}
    >
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">A trading journal for Indian F&amp;O traders</h1>
      <ShortAnswer>
        TradeQut imports your {brokers.map((b) => b.name).join(', ')} trade file, records each trade with fees, and shows
        which strategies, hours and broken rules make or lose money, net of charges. Pricing is in INR: {inrMonth} a month or{' '}
        {inrYear} a year, after a {TRIAL_DAYS}-day trial.
      </ShortAnswer>
      <P>{PRODUCT_DEFINITION}</P>

      <H2>Get your trades in</H2>
      <P>
        Download the trade report from your broker and drop it on the Import page. TradeQut detects the broker, shows every
        trade for review before saving, and skips trades that were already imported into that account.
      </P>
      <UL>
        {brokers.map((b) => (
          <li key={b.id}>
            <strong>{b.name}</strong>: {b.file}
          </li>
        ))}
      </UL>
      <P>
        Example for Zerodha: in Console go to <em>Reports &rarr; Tradebook</em>, choose the segment and a date range, then
        download as CSV or XLSX. Zerodha allows at most 365 days per download. A step-by-step version is in{' '}
        <A to="/blog/zerodha-tradebook-pnl">the Zerodha tradebook guide</A>.
      </P>

      <H2>See what trading really cost</H2>
      <OL>
        <li>
          Tradebooks list fills, not charges, so TradeQut estimates brokerage, STT, exchange charges, SEBI fee, stamp duty and
          GST for each trade at the rates in force on its date. P&amp;L is shown net of them; your contract note stays the
          final word.
        </li>
        <li>
          Analytics shows results by strategy, session, weekday and hour, and what each mistake and broken rule cost. Start
          with the{' '}
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

      <H2>What it costs</H2>
      <P>
        Free: unlimited manual trades, and broker file imports up to {freeImports}. Pro: {inrMonth} a month or {inrYear} a year with
        a {TRIAL_DAYS}-day trial and no card. Details on the <A to="/pricing">pricing page</A>. Comparing journals? See{' '}
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
