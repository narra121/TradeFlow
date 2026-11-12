import { Link } from 'react-router-dom';
import { ContactBlock, LegalLayout, type LegalSection } from '@/components/content/LegalLayout';
import { proPrice, TRIAL_DAYS } from '@/content/product-facts';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

const SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of terms',
    body: (
      <p>
        By using TradeQut (the &ldquo;Service&rdquo;), operated by TradeQutJournal (&ldquo;we&rdquo;), you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>
    ),
  },
  {
    id: 'service',
    title: 'The Service',
    body: (
      <p>
        TradeQut is a web-based trading journal for logging and importing trades, tracking goals and rules, and analysing your
        own trading. A Free plan is available. A Pro subscription adds higher limits and features, described on the{' '}
        <Link to="/pricing" className="text-primary hover:underline">pricing page</Link>. Features marked &ldquo;Planned&rdquo; are not
        part of the Service until released.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts',
    body: (
      <ul>
        <li>Provide accurate information and keep your credentials confidential.</li>
        <li>You are responsible for activity under your account; tell us promptly about unauthorised use.</li>
        <li>We may suspend or terminate accounts that breach these Terms.</li>
      </ul>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <ul>
        <li>Do not use the Service for unlawful purposes or to infringe others&apos; rights.</li>
        <li>Do not attempt unauthorised access, disrupt the Service, or upload malicious content.</li>
        <li>Do not reverse engineer or copy the Service.</li>
      </ul>
    ),
  },
  {
    id: 'not-advice',
    title: 'Not financial advice; AI output',
    body: (
      <>
        <p>
          TradeQut is a journaling and analytics tool. It does not provide financial advice, trading signals or investment
          recommendations, and TradeQut is not a SEBI-registered investment adviser or research analyst. Trading involves
          substantial risk of loss; results shown reflect your own recorded data and do not predict future results. You are
          solely responsible for your trading decisions.
        </p>
        <p>
          AI features summarise or extract data from what you submit. Their output can be wrong or incomplete; check it against
          your broker records before relying on it.
        </p>
      </>
    ),
  },
  {
    id: 'ownership',
    title: 'Your data and our property',
    body: (
      <p>
        You keep ownership of the data you enter. You give us a limited licence to process it to provide the Service to you,
        including by the providers named in the <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. The
        Service&apos;s design, code and branding belong to TradeQutJournal.
      </p>
    ),
  },
  {
    id: 'payment',
    title: 'Subscriptions and payment',
    body: (
      <>
        <p>
          Pro costs {usdMonth} per month or {usdYear} per year ({inrMonth} per month or {inrYear} per year for customers billed in
          INR). Every new account starts with a {TRIAL_DAYS}-day Pro trial without a card. Prices can change for future billing
          periods; the pricing page shows the current prices.
        </p>
        <p>
          Payments are processed by Stripe under Stripe&apos;s terms. A subscription renews automatically each period until you
          cancel it in the billing portal. Refunds and cancellation are covered by the{' '}
          <Link to="/refund" className="text-primary hover:underline">Refund &amp; Cancellation Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Availability',
    body: (
      <p>
        We aim to keep the Service available but do not guarantee uninterrupted access; it may be unavailable for maintenance
        or reasons beyond our control.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the maximum extent permitted by law, TradeQutJournal is not liable for indirect, incidental, special, consequential or
        punitive damages, including loss of profits, data or trading losses. Our total liability is limited to the amount you
        paid in the twelve months before the claim, if any.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    body: (
      <p>
        You can delete your account in Settings or by contacting us, and export your data first. We may suspend or end access if
        you breach these Terms.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts in
        Bhupalpally, Telangana, India.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: <p>We may update these Terms and will change the &ldquo;Last updated&rdquo; date. Continued use means you accept the update.</p>,
  },
  { id: 'contact', title: 'Contact', body: <ContactBlock /> },
];

export function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="The terms for using TradeQut: the Free and Pro plans, subscriptions through Stripe, AI output, acceptable use and liability."
      path="/terms"
      updated="2026-11-11"
      sections={SECTIONS}
    />
  );
}
