import { Link } from 'react-router-dom';
import { ContactBlock, LegalLayout, type LegalSection } from '@/components/content/LegalLayout';
import { openConsentSettings } from '@/lib/analytics';

const SECTIONS: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    body: (
      <p>
        TradeQutJournal (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) operates the TradeQut application (the
        &ldquo;Service&rdquo;). This policy explains what we collect, why, who processes it, and the choices you have.
      </p>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <ul>
        <li>
          <strong>Account data:</strong> your email address and password (stored by our sign-in provider, Amazon Cognito),
          and your name if you give it. If you sign in with Google, we receive the profile details Google shares with us.
        </li>
        <li>
          <strong>Trading data:</strong> the trades, notes, tags, screenshots, goals, rules and accounts you enter, and the
          files you import.
        </li>
        <li>
          <strong>Billing data:</strong> your subscription status and Stripe customer and subscription identifiers. Card
          details are entered on Stripe&apos;s pages and are never seen or stored by us.
        </li>
        <li>
          <strong>Usage data:</strong> technical data such as IP address, browser, device and pages visited, in server logs and,
          where you allow it, in Google Analytics.
        </li>
      </ul>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    body: (
      <ul>
        <li>To provide the Service, create your account and compute your analytics and reports.</li>
        <li>To process subscriptions and prevent fraud or abuse.</li>
        <li>To answer support requests and send service messages.</li>
        <li>To understand how the public pages and the app are used, and improve them (analytics, with your consent where the law requires it).</li>
      </ul>
    ),
  },
  {
    id: 'ai-features',
    title: 'AI features',
    body: (
      <>
        <p>
          AI features run when you use them, and the weekly review runs once a week for Pro and trial users who keep
          Weekly report switched on in Settings. Their requests go through OpenRouter (openrouter.ai), which passes each request to the
          company whose model answers it:
        </p>
        <ul>
          <li>
            <strong>AI reports and the weekly review</strong> (OpenAI models) send figures computed from your trades (for
            example P&amp;L, win rate, symbols, strategies, tags and rule names). They do not send your notes or key lessons
            unless you switch on <strong>Use my notes</strong>, which is off until you turn it on. With it on, they also send
            the notes and key lessons of the trades in the report.
          </li>
          <li>
            <strong>Chat</strong> (OpenAI models) sends the same kind of figures and your question. It never sends your notes or
            key lessons, even with Use my notes on.
          </li>
          <li>
            <strong>Screenshot and text import</strong> (Google Gemini models) sends the screenshots or text you submit for that
            import, so the trades in them can be read.
          </li>
          <li>
            <strong>AI Enhance</strong> (Google Gemini models) sends the text you ask it to correct.
          </li>
        </ul>
        <p>
          Reports, the weekly review and chat never send your screenshots, email address or account names.
        </p>
        <p>
          OpenRouter states that it does not store the content of requests unless the account owner turns on logging, and we
          have not; it keeps usage data such as the number of tokens. Our requests tell OpenRouter to exclude providers that
          train on your data. OpenAI states that it does not use API data to train its models and keeps abuse-monitoring logs
          for up to 30 days, unless the law requires longer. Google states that it does not use paid API requests to improve
          its products and logs them for a limited time to detect misuse.
        </p>
        <p>
          Do not submit data you do not want processed this way. AI results can be wrong and describe your own recorded trades
          only; they are not advice.
        </p>
      </>
    ),
  },
  {
    id: 'service-providers',
    title: 'Service providers',
    body: (
      <ul>
        <li>
          <strong>Amazon Web Services</strong> hosts the Service and stores your data (region us-east-1), encrypted in transit and
          at rest, and provides sign-in (Cognito).
        </li>
        <li>
          <strong>Stripe</strong> processes subscription payments. When you start checkout, your country (derived from your IP
          address by our content delivery network, Amazon CloudFront) selects INR or USD pricing.
        </li>
        <li>
          <strong>OpenRouter</strong> passes AI requests to OpenAI and Google and returns their answers.
        </li>
        <li>
          <strong>OpenAI</strong> provides the models for AI reports, the weekly review and chat.
        </li>
        <li>
          <strong>Google</strong> provides Gemini (screenshot and text import, AI Enhance), Google Analytics (if you allow it)
          and Sign in with Google.
        </li>
      </ul>
    ),
  },
  {
    id: 'cookies-and-ads',
    title: 'Cookies, analytics and ads',
    body: (
      <>
        <p>
          We store essential data in your browser to keep you signed in and remember your preferences and your cookie choice.
          Google Analytics is used on the public pages and in the app only when it is switched on for the site. In the EEA, UK
          and Switzerland, analytics and advertising cookies stay off until you accept; until then Google receives only
          cookieless measurement signals without identifiers. Elsewhere analytics cookies are on by default, and you can turn
          them off at any time with the cookie settings below.
        </p>
        <p>
          We do not currently show ads. If we show ads on public content pages (never inside the app), they use Google AdSense,
          which uses cookies, and your cookie choice applies.
        </p>
        <p>
          <button type="button" onClick={openConsentSettings} className="inline-flex min-h-6 max-md:min-h-11 items-center text-primary underline underline-offset-4">
            Change your cookie settings
          </button>
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    body: (
      <>
        <ul>
          <li>Access, correct, export or delete your data; export and account deletion are in Settings, or ask us.</li>
          <li>Withdraw cookie consent at any time from the footer link.</li>
          <li>We do not sell your personal data.</li>
        </ul>
        <p>
          Deleting your account deletes your trading data. Some billing records may be kept where the law requires.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>The Service is not intended for anyone under 18, and we do not knowingly collect their data.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We update this page when the Service or the providers above change and change the &ldquo;Last updated&rdquo; date.
        See also the <Link to="/terms" className="text-primary underline underline-offset-4">Terms of Service</Link> and the{' '}
        <Link to="/refund" className="text-primary underline underline-offset-4">Refund &amp; Cancellation Policy</Link>.
      </p>
    ),
  },
  { id: 'contact', title: 'Contact', body: <ContactBlock /> },
];

export function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="What TradeQut collects, who processes it (AWS, Stripe, OpenRouter, OpenAI, Google), how AI features and cookies work, and your choices."
      path="/privacy"
      updated="2026-11-13"
      sections={SECTIONS}
    />
  );
}
