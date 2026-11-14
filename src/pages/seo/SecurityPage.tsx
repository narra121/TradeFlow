import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ContactBlock } from '@/components/content/LegalLayout';
import { Disclaimer, H2, P, ShortAnswer, UL } from '@/content/components/ArticleParts';
import { seoPageSchema } from '@/config/seo';

const PAGE = {
  path: '/security',
  title: 'Security and Privacy - How TradeQut Stores and Protects Your Data',
  description:
    'Where TradeQut stores your data (AWS us-east-1), how it is protected, who else gets it (Stripe, OpenRouter, OpenAI, Google) and how to report a vulnerability.',
  label: 'Security and privacy',
};

/**
 * Published as noindex and unlinked until the owner has confirmed each statement against the deployed stack (ACCESS-NEEDED G-26).
 * To publish: remove `noindex`, move the route from UTILITY_PAGE_LOADERS to SEO_PAGE_LOADERS, add it to SEO_PAGES and the footer.
 */
export default function SecurityPage() {
  return (
    <ContentPageShell title={PAGE.title} description={PAGE.description} path={PAGE.path} jsonLd={seoPageSchema(PAGE)} noindex>
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Security and privacy</h1>
      <ShortAnswer>
        TradeQut runs on Amazon Web Services in the us-east-1 region. Connections use HTTPS, stored data is encrypted at
        rest, the data tables have point-in-time recovery, and each user can only read their own trades. Payments are handled
        by Stripe. AI features send the data you choose through OpenRouter to OpenAI or Google Gemini.
      </ShortAnswer>

      <H2>Where your data lives</H2>
      <UL>
        <li>Hosting, sign-in (Amazon Cognito), the database (Amazon DynamoDB) and screenshots (Amazon S3) are all in AWS us-east-1.</li>
        <li>The storage buckets block public access; screenshots are reachable only by the account that owns them.</li>
      </UL>

      <H2>Protection and backups</H2>
      <UL>
        <li>The site and API are served over HTTPS; plain HTTP requests are redirected.</li>
        <li>DynamoDB and S3 encrypt stored data at rest with AWS-managed keys.</li>
        <li>
          Point-in-time recovery is enabled on the data tables, so they can be restored to an earlier moment after an error.
          Recovery points are kept for up to 35 days.
        </li>
        <li>Every request to your data is tied to your signed-in account; one user cannot read another user&apos;s trades.</li>
      </UL>

      <H2>What leaves the service</H2>
      <UL>
        <li>
          <strong>Stripe</strong> receives your payment details and subscription data. TradeQut never sees or stores your card number.
        </li>
        <li>
          <strong>OpenRouter</strong> passes each AI request to OpenAI or Google. It states that it does not store the content
          unless the account turns on logging, which TradeQut has not.
        </li>
        <li>
          <strong>OpenAI</strong> receives figures computed from your trades for AI reports, the weekly report and chat, to write
          their text. Reports include your trade notes only if you switch on Use my notes.
        </li>
        <li>
          <strong>Google Gemini</strong> receives the screenshots or text you submit for import, or the text you ask AI Enhance to
          correct.
        </li>
        <li>
          <strong>Google Analytics</strong> receives page-view data only after your cookie choice where the law requires it.
        </li>
      </UL>
      <P>
        The full list is in the <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>.
      </P>

      <H2>What TradeQut does not do</H2>
      <UL>
        <li>It does not sell your trade data or share it with brokers.</li>
        <li>It shows no ads inside the app.</li>
        <li>It never asks for your broker password; trades come in through files you upload.</li>
      </UL>

      <H2>Your data, your control</H2>
      <P>
        You can export your trading data and delete your account from Settings. Deleting the account removes your journal and
        cancels an active subscription. Backups keep deleted data for up to 35 days (the recovery window above) before it is gone
        everywhere, and some billing records may be kept where the law requires.
      </P>

      <H2>Report a vulnerability</H2>
      <P>
        If you find a security problem, email <a href="mailto:support@tradequt.com" className="text-primary hover:underline">support@tradequt.com</a> with
        the steps to reproduce it. Please do not access other users&apos; data or disrupt the service while testing. We
        read every report; we do not run a paid bounty programme.
      </P>
      <div className="text-foreground-soft">
        <ContactBlock />
      </div>
      <Disclaimer>
        This page describes how the service is set up today and changes when it does. It is not a certification or a guarantee.
      </Disclaimer>
    </ContentPageShell>
  );
}
