import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { PublicLayout } from '@/components/public/PublicLayout';
import { PricingTable } from '@/components/public/PricingTable';
import { Button } from '@/components/ui/button';
import { LANDING_PAGE_SCHEMA, faqSchema } from '@/config/seo';
import { IMPORT_SOURCES, PRODUCT_FAQ, TRIAL_DAYS, TRIAL_END_FAQ, type FaqItem } from '@/content/product-facts';
import { HEADLINE_PARTS } from '@/components/showcase/copy';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { SampleDataChip } from '@/components/showcase/SampleDataChip';
import { TradeReviewDemo } from '@/components/showcase/TradeReviewDemo';
import { BehaviourCostCard, ImportReviewDemo, InsightsAnswerDemo } from '@/components/showcase/AnswerCards';
import { AccountsStill, IndiaChargesStill, PhoneDashboard, PropLimitsStill } from '@/components/showcase/SegmentStills';
import { LandingMotionProvider, MotionToggle, PageProgress, glideTo, useLandingMotion } from '@/components/landing/motion';
import { ParticleAssembly } from '@/components/landing/ParticleAssembly';
import { Manifesto } from '@/components/landing/Manifesto';
import { StorySection } from '@/components/landing/StorySection';
import { LandingFaq } from '@/components/landing/LandingFaq';
import '@/components/landing/landing.css';

const COMPARISON = [
  { topic: 'Getting trades in', sheet: 'Type every fill by hand', app: 'Import the broker file; duplicates are skipped' },
  { topic: 'P&L and R', sheet: 'Your own formulas', app: 'Computed per asset class, fees included' },
  { topic: 'Review', sheet: 'Screenshots in a folder', app: 'Notes, tags and screenshots on the trade' },
  { topic: 'Discipline', sheet: 'Not tracked', app: 'Rules, and a record of when you broke them' },
] as const;

const ANSWERS = [
  {
    question: 'What did each trade really make?',
    answer:
      'Import the Zerodha, Dhan, Upstox, Angel One, Groww or MetaTrader file and review it before saving. Trades from Indian brokers get estimated charges (brokerage, STT, exchange fees, SEBI fee, stamp duty, GST) at the rates in force on the trade date, so P&L is net.',
    figure: 'Import review',
    pro: false,
    Visual: ImportReviewDemo,
    alt: 'Sample data: a Zerodha tradebook in the import review, two NIFTY and BANKNIFTY option trades with their estimated charges and net P&L, one duplicate skipped.',
  },
  {
    question: 'Which habits cost money?',
    answer:
      'Tag mistakes and mark broken rules on each trade. Analytics totals what each mistake and each broken rule cost, and Goals & rules shows every rule week by week.',
    figure: 'Analytics · Behaviour',
    pro: true,
    Visual: BehaviourCostCard,
    alt: 'Sample data: Analytics, Behaviour tab, listing two broken rules and what each cost this month.',
  },
  {
    question: 'Where is my edge, and where is the leak?',
    answer:
      'Results by strategy, session, weekday and hour, with the number of trades beside each. AI reports and chat explain your own trades in plain words. They never suggest a trade.',
    figure: 'Insights · Chat',
    pro: false,
    Visual: InsightsAnswerDemo,
    alt: 'Sample data: Insights chat answering which session lost money in November with the net P&L of each session.',
  },
] as const;

const SEGMENTS = [
  { who: 'Indian F&O and intraday traders', what: 'Tradebook import, charges per trade, INR pricing.', Visual: IndiaChargesStill, alt: 'Sample data: one NIFTY option trade with gross P&L, each estimated charge and net P&L in rupees.' },
  { who: 'Prop-firm challengers', what: 'MT4 and MT5 reports, trade-count and drawdown limits as weekly or monthly goals.', Visual: PropLimitsStill, alt: 'Sample data: a weekly trade-count goal and a monthly drawdown goal with their progress.' },
  { who: 'Forex traders with several accounts', what: 'One row per account, totals kept per currency.', Visual: AccountsStill, alt: 'Sample data: three accounts in USD, INR and EUR, each with its own total.' },
] as const;

const SERVICES = [
  'Stripe processes subscription payments; TradeQut never sees your card number.',
  'Amazon Web Services hosts the app and stores your trades, encrypted.',
  'AI reports and chat send trade figures, never notes, screenshots, names or email, to Google Gemini, and only when you use them. Screenshot import sends the images you upload.',
  'Google Analytics runs only after your cookie choice where the law requires it.',
];

/** Landing-only questions (CONTENT-AUDIT §6.7); they join the FAQPage JSON-LD word for word. */
const LANDING_FAQ: FaqItem[] = [
  ...PRODUCT_FAQ,
  {
    question: 'Do I need to connect my broker account?',
    answer: 'No. You download the trade file from your broker or MetaTrader and upload it. TradeQut never asks for your broker login. Automatic sync is planned, not available.',
  },
  TRIAL_END_FAQ,
];

const JSON_LD = {
  ...LANDING_PAGE_SCHEMA,
  '@graph': LANDING_PAGE_SCHEMA['@graph'].map((node) => ('@type' in node && node['@type'] === 'FAQPage' ? faqSchema(LANDING_FAQ) : node)),
};

const TRIAL = `${TRIAL_DAYS}-day Pro trial. No card.`;

function LandingBody() {
  const { still } = useLandingMotion();
  return (
    <div className="lp" data-still={still}>
      <PageProgress />

      <section className="lp-hero" aria-labelledby="hero-heading">
        <div className="lp-hero__top">
          <a href="#import" className="lp-announce" onClick={glideTo('import', still)}>
            <span className="lp-announce__tag">Import</span>
            Zerodha, Dhan, Upstox, Angel One, Groww, MetaTrader and any CSV
            <ArrowRight aria-hidden="true" />
          </a>
          <h1 id="hero-heading" className="lp-h1">
            <span className="lp-muted-line">{HEADLINE_PARTS[0]}</span> {HEADLINE_PARTS[1]}
          </h1>
        </div>
        <div className="lp-hero__copy">
          <p className="lp-lead">
            Import your broker or MetaTrader file, journal each trade, and see which strategies, hours, mistakes and broken rules
            make or lose money, net of fees.
          </p>
          <div className="lp-cta-row">
            <Button size="lg" asChild className="lp-cta">
              <Link to="/signup">
                Start free
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Link to="/pricing" className="lp-link">
              See pricing
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className="lp-trial">{TRIAL}</p>
        </div>
        <figure className="lp-hero__demo">
          <div role="img" aria-label="Sample data: in Trades, a losing GBPUSD short is opened and marked as breaking the rule Trade with the 1-hour trend; the month's broken-rules cost goes from −$118.25 over 6 trades to −$140.05 over 7 trades.">
            <div aria-hidden="true">
              <TradeReviewDemo play={!still} />
            </div>
          </div>
          <figcaption>Sample data</figcaption>
        </figure>
        <div className="lp-hero__foot">
          <a href="#how" className="lp-scroll-cue" onClick={glideTo('how', still)}>
            <span>
              <ArrowDown aria-hidden="true" />
            </span>
            See a month come together
          </a>
          <span className="lp-data-note">
            <SampleDataChip />
            One sample account, November 2026
          </span>
        </div>
      </section>

      <section id="import" aria-labelledby="import-heading" className="lp-import lp-rule">
        <div className="lp-wrap lp-import__grid">
          <h2 id="import-heading">Import from your broker</h2>
          <ul className="lp-chips">
            {IMPORT_SOURCES.map((s) => (
              <li key={s.id}>{s.id === 'generic_csv' ? 'Any CSV' : s.name}</li>
            ))}
          </ul>
          <p className="lp-small">File import today. Automatic sync is planned.</p>
        </div>
      </section>

      <ParticleAssembly />

      <section id="answers" aria-labelledby="answers-heading" className="lp-answers lp-wrap">
        <div className="lp-head">
          <div>
            <Eyebrow>Three questions, your own numbers</Eyebrow>
            <h2 id="answers-heading" className="lp-h2">
              What TradeQut answers
            </h2>
          </div>
          <p>Every figure comes from your trades. The pictures use one sample account.</p>
        </div>
        <ul className="lp-cards">
          {ANSWERS.map(({ question, answer, figure, pro, Visual, alt }, i) => (
            <li key={question} className="lp-card">
              <figure className="lp-card__art">
                <figcaption>
                  <span>
                    Fig. 0{i + 1} · {figure}
                  </span>
                  <span>
                    {pro && <span className="lp-pro">Pro</span>} <SampleDataChip />
                  </span>
                </figcaption>
                <div role="img" aria-label={alt}>
                  <div aria-hidden="true">
                    <Visual {...(Visual === BehaviourCostCard ? {} : { play: !still })} />
                  </div>
                </div>
              </figure>
              <h3>{question}</h3>
              <p>{answer}</p>
            </li>
          ))}
        </ul>
      </section>

      <Manifesto />

      <StorySection />

      <section aria-labelledby="built-heading" className="lp-built lp-rule">
        <div className="lp-wrap">
          <div className="lp-head">
            <div>
              <Eyebrow>Who it is for</Eyebrow>
              <h2 id="built-heading" className="lp-h2">
                Built for
              </h2>
            </div>
            <p>Three kinds of trader, one journal.</p>
          </div>
          <ul className="lp-figs">
            {SEGMENTS.map(({ who, what, Visual, alt }, i) => (
              <li key={who} className="lp-fig">
                <div className="lp-fig__label">
                  <span>Fig. 0{i + 1}</span>
                  <SampleDataChip />
                </div>
                <figure className="lp-fig__art" role="img" aria-label={alt}>
                  <div aria-hidden="true">
                    <Visual />
                  </div>
                </figure>
                <h3>{who}</h3>
                <p>{what}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="compare-heading" className="lp-compare lp-rule">
        <div className="lp-wrap">
          <div className="lp-head">
            <div>
              <Eyebrow>Before and after</Eyebrow>
              <h2 id="compare-heading" className="lp-h2">
                Spreadsheet vs TradeQut
              </h2>
            </div>
          </div>
          <table className="lp-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Topic</span>
                </th>
                <th scope="col">Spreadsheet</th>
                <th scope="col">TradeQut</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((r) => (
                <tr key={r.topic}>
                  <th scope="row">{r.topic}</th>
                  <td data-label="Spreadsheet">{r.sheet}</td>
                  <td data-label="TradeQut">{r.app}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="pricing" aria-labelledby="pricing-heading" className="lp-pricing lp-band lp-rule">
        <div className="lp-wrap">
          <div className="lp-head">
            <div>
              <Eyebrow>Free and Pro</Eyebrow>
              <h2 id="pricing-heading" className="lp-h2">
                Pricing
              </h2>
            </div>
            <p>Monthly or yearly, in USD or INR.</p>
          </div>
          <PricingTable headingLevel={3} />
          <div className="lp-pricing__links">
            <Link to="/pricing" className="lp-link">
              See full pricing
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/pricing#faq" className="lp-link">
              Billing questions: trial, currency, cancelling
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <LandingFaq items={LANDING_FAQ} />

      <section aria-labelledby="services-heading" className="lp-services">
        <div className="lp-wrap lp-services__grid">
          <h2 id="services-heading">Services that handle your data</h2>
          <div>
            <ul>
              {SERVICES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="lp-small" style={{ marginTop: 16 }}>
              Details are in the{' '}
              <Link to="/privacy" className="lp-link" style={{ display: 'inline', fontSize: 13 }}>
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="final-heading" className="lp-final lp-rule">
        <div className="lp-wrap lp-final__grid">
          <div className="lp-final__copy">
            <Eyebrow>Your journal</Eyebrow>
            <h2 id="final-heading">Start your journal today.</h2>
            <p className="lp-lead" style={{ marginTop: 20 }}>
              {TRIAL}
            </p>
            <div className="lp-cta-row">
              <Button size="lg" asChild className="lp-cta">
                <Link to="/signup">
                  Start free
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
          <figure className="lp-final__art" role="img" aria-label="Sample data: the TradeQut dashboard on a phone, with net P&L, win rate, best day, broken rules and the November calendar.">
            <div aria-hidden="true">
              <PhoneDashboard />
            </div>
          </figure>
        </div>
      </section>

      <MotionToggle />
    </div>
  );
}

export function LandingPage() {
  return (
    <>
      <SEO
        title="TradeQut - Trading Journal with Broker Import and Rule Tracking"
        description={`Trading journal with Zerodha, Dhan, Upstox and MT5 import, net P&L after charges, and the cost of every broken rule. Free plan; ${TRIAL_DAYS}-day Pro trial, no card.`}
        path="/"
        jsonLd={JSON_LD}
      />
      <PublicLayout>
        <LandingMotionProvider>
          <LandingBody />
        </LandingMotionProvider>
      </PublicLayout>
    </>
  );
}
