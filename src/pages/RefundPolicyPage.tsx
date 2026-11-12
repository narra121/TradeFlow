import { ContactBlock, LegalLayout, type LegalSection } from '@/components/content/LegalLayout';
import { TRIAL_DAYS } from '@/content/product-facts';

const SECTIONS: LegalSection[] = [
  {
    id: 'plans',
    title: 'Plans and trial',
    body: (
      <p>
        TradeQut has a Free plan and a paid Pro subscription, billed monthly or yearly through Stripe. Every new account starts
        with a {TRIAL_DAYS}-day Pro trial without a card, so you can try Pro before paying.
      </p>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation',
    body: (
      <>
        <p>You can cancel at any time from the billing portal in the app. After you cancel:</p>
        <ul>
          <li>You keep Pro until the end of the period you already paid for.</li>
          <li>You are not charged again.</li>
          <li>Your account then returns to the Free plan, with its limits. Your trades stay in your account and you can export them.</li>
          <li>The remaining days of a paid period are not refunded.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'refunds',
    title: 'Refund eligibility',
    body: (
      <>
        <p>Refunds are decided case by case. You are eligible for a full refund if:</p>
        <ul>
          <li>You were charged incorrectly or without your authorisation.</li>
          <li>A duplicate payment was processed.</li>
          <li>You request a refund within 7 days of the payment date.</li>
          <li>The payment was made because of a technical error.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-to-request',
    title: 'How to request a refund',
    body: (
      <>
        <p>Email support@tradequt.com with:</p>
        <ul>
          <li>Your registered email address.</li>
          <li>The Stripe receipt or transaction reference, and the payment date.</li>
          <li>The reason for the request.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'processing',
    title: 'Processing',
    body: (
      <p>
        We review requests within 3&ndash;5 business days. Approved refunds are returned to the original payment method; the time
        your bank takes to show the credit is outside our control (typically 5&ndash;7 business days).
      </p>
    ),
  },
  {
    id: 'account-deletion',
    title: 'Account deletion',
    body: (
      <p>
        If you delete your account, an active subscription is cancelled. Deletion is permanent. Export your data first from
        Settings.
      </p>
    ),
  },
  { id: 'contact', title: 'Contact', body: <ContactBlock /> },
];

export function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Refund & Cancellation Policy"
      description="How to cancel a TradeQut Pro subscription, what happens after cancellation, and when refunds are available."
      path="/refund"
      updated="2026-11-11"
      sections={SECTIONS}
    />
  );
}
