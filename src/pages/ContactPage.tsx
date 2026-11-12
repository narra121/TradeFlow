import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ContactBlock } from '@/components/content/LegalLayout';
import { CONTACT_SCHEMA } from '@/config/seo';

export function ContactPage() {
  return (
    <ContentPageShell
      title="Contact TradeQut - Support, Feedback and Billing Questions"
      description="Contact the TradeQut team by email or phone for support, feedback and billing questions."
      path="/contact"
      jsonLd={CONTACT_SCHEMA}
    >
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Contact us</h1>
      <p className="mb-8 text-base text-foreground-soft">
        Email is the fastest way to reach us. When you are logged in, the Help menu (<strong>?</strong>) in the top bar also has{' '}
        <em>Contact support</em> and <em>Send feedback</em>.
      </p>

      <div className="panel mb-10 p-5 text-foreground-soft">
        <ContactBlock />
      </div>

      <section aria-labelledby="topics">
        <h2 id="topics" className="mb-4 text-2xl font-semibold text-foreground">
          What to include
        </h2>
        <dl className="space-y-5">
          <div>
            <dt className="font-medium text-foreground">Account or technical problem</dt>
            <dd className="mt-1 text-foreground-soft">
              Describe what you did, what you expected and what happened, with a screenshot if you can. Include the browser you use.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Billing or refund</dt>
            <dd className="mt-1 text-foreground-soft">
              Include your registered email and the Stripe receipt reference. See the{' '}
              <Link to="/refund" className="text-primary hover:underline">Refund &amp; Cancellation Policy</Link>.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Feedback or a broker file we should support</dt>
            <dd className="mt-1 text-foreground-soft">Tell us the broker and, if you can, attach a sample file with personal details removed.</dd>
          </div>
        </dl>
      </section>
    </ContentPageShell>
  );
}
