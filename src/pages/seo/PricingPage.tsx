import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { PricingTable } from '@/components/public/PricingTable';
import { AnalyticsContents } from '@/components/public/AnalyticsContents';
import { A, Faq, H2, P, ShortAnswer } from '@/content/components/ArticleParts';
import { COMPETITORS } from '@/content/alternatives';
import { PRODUCT_FAQ, TRIAL_DAYS, TRIAL_END_FAQ, proPrice, type FaqItem } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { SOFTWARE_APP_SCHEMA, seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

/** Billing questions (trial, cancel, refunds, currency); visible below the table and emitted with the product FAQ as FAQPage JSON-LD. */
const BILLING_FAQ: FaqItem[] = [
  TRIAL_END_FAQ,
  {
    question: 'Which currency will I pay in?',
    answer: `Checkout charges in INR (${inrMonth}/month or ${inrYear}/year) when you are in India and in USD (${usdMonth}/month or ${usdYear}/year) everywhere else. Once you have paid in a currency, renewals stay in that currency. The USD and INR switch on this page only changes the prices shown.`,
  },
  {
    question: 'How do I cancel Pro?',
    answer:
      'Open Settings, then Plan & billing, then Manage billing, and cancel in the Stripe billing portal. You keep Pro until the end of the period you paid for and are not charged again; then your journal is read-only: you can still view and export it.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'Refunds follow the Refund & Cancellation Policy, which lists when a payment is refunded and how to ask for it.',
  },
];

export default function PricingPage() {
  const page = getSeoPage('/pricing');
  return (
    <ContentPageShell
      title={page.title}
      description={page.description}
      path={page.path}
      jsonLd={seoPageSchema(page, [SOFTWARE_APP_SCHEMA], [...PRODUCT_FAQ, ...BILLING_FAQ])}
      maxWidth="max-w-4xl"
    >
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">TradeQut pricing</h1>
      <ShortAnswer>
        Every account starts with a {TRIAL_DAYS}-day free trial with every Pro feature and no card. Then Pro is {usdMonth}/month
        or {usdYear}/year ({inrMonth}/month or {inrYear}/year in India).
      </ShortAnswer>
      <H2>Free trial vs Pro</H2>
      <PricingTable />
      <P>
        After the trial, or when Pro ends, your journal is read-only: you can view and export every trade, but adding,
        editing and deleting need Pro. Nothing is deleted, and upgrading makes everything work again at once.
      </P>
      <H2 id="analytics">What is in Analytics</H2>
      <P>
        Every tab below is in the {TRIAL_DAYS}-day trial, and Pro keeps it after. Each tab answers one question from your own
        trades, and says so when there are too few of them to tell.
      </P>
      <AnalyticsContents />
      <H2 id="ai">AI reports and chat</H2>
      <P>
        Both are in the trial and in Pro, within the monthly numbers in the first table. A report is a review: a verdict, the
        one behaviour that cost the most, as an if-then rule where one applies, and patterns to watch. A review of the last
        seven days is also made for you each week with five or more trades, unless you switch Weekly report off in Settings.
        The figures in a report and in a chat answer’s table are calculated by code; the model writes the sentences.
        Neither one recommends a trade.
      </P>
      <H2 id="compare">How the price compares</H2>
      <P>
        Each comparison gives the date the other product&apos;s pricing page was read, says what could not be verified
        and where that product is stronger:{' '}
        {COMPETITORS.map((c, i) => (
          <span key={c.id}>
            <A to={`/alternatives/${c.id}`}>{c.name}</A>
            {i < COMPETITORS.length - 1 ? ', ' : '. '}
          </span>
        ))}
        Trading forex? See the <A to="/forex-trading-journal">forex trading journal</A>; in India, the{' '}
        <A to="/trading-journal-india">journal for Indian traders</A>.
      </P>
      <Faq items={[...PRODUCT_FAQ, ...BILLING_FAQ]} />
      <p className="mt-6 text-sm text-muted-foreground">
        Full terms: <Link to="/refund" className="text-primary underline underline-offset-4">Refund &amp; Cancellation Policy</Link> and{' '}
        <Link to="/terms" className="text-primary underline underline-offset-4">Terms of Service</Link>.
      </p>
    </ContentPageShell>
  );
}
