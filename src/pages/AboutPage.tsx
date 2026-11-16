import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ContactBlock } from '@/components/content/LegalLayout';
import { breadcrumbSchema } from '@/config/seo';
import { DATA_FACTS, IMPORT_SOURCES, PRODUCT_DEFINITION } from '@/content/product-facts';

const brokers = IMPORT_SOURCES.filter((s) => s.id !== 'generic_csv')
  .map((s) => s.name)
  .join(', ');

const DOES = [
  `Imports trade files from ${brokers}, or any CSV or Excel file, and shows every trade for review before it is saved. Trades already imported are skipped.`,
  'Reads MetaTrader 4 and 5 reports with each trade’s lots, stop, target, commission and swap, and keeps every account in its own currency.',
  'Estimates brokerage, STT, exchange charges, SEBI fee, stamp duty and GST for trades imported from Indian brokers: the trade date’s rates for NSE trades from 1 October 2024, approximate exchange charges before that, and no STT on options exercised at expiry.',
  'Shows win rate against break-even and expectancy in R, each with a range and a sample label (early, provisional, established), and results by strategy, session, weekday and hour.',
  'Checks every trade against a fixed list of behaviours, such as a new trade within 15 minutes of a loss or a loss that ran past the stop, and totals what each mistake and each broken rule cost.',
  'Replays a period without the trades a rule would have blocked, so you can test a rule on your own trades before you adopt it.',
  'Writes a review around one rule and whether you kept it, and answers chat questions by calculation. Both are about your own recorded trades and have monthly limits.',
];

const DOES_NOT = [
  'Give trading tips, signals or recommendations. TradeQut is not an investment adviser or research analyst in any country, and in India not a SEBI-registered investment adviser.',
  'Place or change orders, or connect to your broker account. You upload the files your broker gives you; automatic sync is planned, not available.',
  'Show ads inside the app, or sell your data.',
  'Promise results. We have found no peer-reviewed study showing that a journal or an AI coach improves trading results, so we do not claim it.',
];

export function AboutPage() {
  return (
    <ContentPageShell
      title="About TradeQut: a Trading Journal for Forex and F&O Traders"
      description="What TradeQut does and does not do, who it is built for, how your trading data is handled, and how to reach the team behind it."
      path="/about"
      jsonLd={breadcrumbSchema([
        { name: 'Home', url: 'https://tradequt.com' },
        { name: 'About', url: 'https://tradequt.com/about' },
      ])}
    >
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">About TradeQut</h1>
      <p className="mb-8 text-base text-foreground-soft">{PRODUCT_DEFINITION}</p>

      <section aria-labelledby="for" className="mb-10">
        <h2 id="for" className="mb-3 text-2xl font-semibold text-foreground">
          Who it is for
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-foreground-soft">
          <li>Forex traders on MetaTrader 4 and 5 who want each trade with its commission and swap, results by pair and session, and totals kept per account currency.</li>
          <li>Prop-firm challengers who trade on MetaTrader and need to stay inside trade-count and drawdown limits.</li>
          <li>Indian F&amp;O and intraday traders who want P&amp;L after charges and to see which habits lose money.</li>
        </ul>
      </section>

      <section aria-labelledby="does" className="mb-10">
        <h2 id="does" className="mb-3 text-2xl font-semibold text-foreground">
          What it does
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-foreground-soft">
          {DOES.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="does-not" className="mb-10">
        <h2 id="does-not" className="mb-3 text-2xl font-semibold text-foreground">
          What it does not do
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-foreground-soft">
          {DOES_NOT.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="who" className="mb-10">
        <h2 id="who" className="mb-3 text-2xl font-semibold text-foreground">
          Who runs it
        </h2>
        <p className="leading-relaxed text-foreground-soft">
          TradeQut is built and run independently from India. Changes are listed in the{' '}
          <Link to="/changelog" className="text-primary underline underline-offset-[3px]">changelog</Link>, and every price and limit is on the{' '}
          <Link to="/pricing" className="text-primary underline underline-offset-[3px]">pricing page</Link>.
        </p>
      </section>

      <section aria-labelledby="data" className="mb-10">
        <h2 id="data" className="mb-3 text-2xl font-semibold text-foreground">
          Your data
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-foreground-soft">
          {DATA_FACTS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Details are in the <Link to="/privacy" className="text-primary underline underline-offset-[3px]">privacy policy</Link>.
        </p>
      </section>

      <section aria-labelledby="contact" className="mb-4">
        <h2 id="contact" className="mb-3 text-2xl font-semibold text-foreground">
          Contact
        </h2>
        <div className="text-foreground-soft">
          <ContactBlock />
        </div>
      </section>
    </ContentPageShell>
  );
}
