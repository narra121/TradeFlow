import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { PricingTable } from '@/components/public/PricingTable';
import { Faq, H2, P, ShortAnswer } from '@/content/components/ArticleParts';
import { PRODUCT_FAQ, TRIAL_DAYS, proPrice, type FaqItem } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { SOFTWARE_APP_SCHEMA, seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

/** Billing questions (trial, cancel, refunds, currency); visible below the table and emitted with the product FAQ as FAQPage JSON-LD. */
const BILLING_FAQ: FaqItem[] = [
  {
    question: 'What happens when the Pro trial ends?',
    answer: `The ${TRIAL_DAYS}-day Pro trial starts when you sign up and needs no card. When it ends you move to the Free plan and nothing is charged. Your trades stay in your account.`,
  },
  {
    question: 'Which currency will I pay in?',
    answer: `Checkout charges in INR (${inrMonth}/month or ${inrYear}/year) when you are in India and in USD (${usdMonth}/month or ${usdYear}/year) everywhere else. Once you have paid in a currency, renewals stay in that currency. The USD and INR switch on this page only changes the prices shown.`,
  },
  {
    question: 'How do I cancel Pro?',
    answer:
      'Open Settings, then Plan & billing, then Manage billing, and cancel in the Stripe billing portal. You keep Pro until the end of the period you paid for and are not charged again; then the account moves to Free.',
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
        TradeQut has a Free plan with unlimited manual trades, and Pro at {usdMonth}/month or {usdYear}/year ({inrMonth}/month or{' '}
        {inrYear}/year in India). Every account starts with a {TRIAL_DAYS}-day Pro trial without a card.
      </ShortAnswer>
      <H2>Free vs Pro</H2>
      <PricingTable />
      <P>
        Pro is for traders who import often, run several accounts, or want the cost of each mistake and broken rule. Free
        stays free: manual trades, the calendar, goals and rules, and export have no limit.
      </P>
      <Faq items={[...PRODUCT_FAQ, ...BILLING_FAQ]} />
      <p className="mt-6 text-sm text-muted-foreground">
        Full terms: <Link to="/refund" className="text-primary hover:underline">Refund &amp; Cancellation Policy</Link> and{' '}
        <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
      </p>
    </ContentPageShell>
  );
}
