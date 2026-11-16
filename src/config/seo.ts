import {
  COMPANY_FACTS,
  PRODUCT_DEFINITION,
  PRODUCT_FAQ,
  PRO_PRICES,
  SITE_URL,
  SUPPORT_EMAIL,
  TRIAL_DAYS,
  type FaqItem,
} from '@/content/product-facts';

const CONTEXT = 'https://schema.org';
const PUBLISHER = {
  '@type': 'Organization',
  name: 'TradeQut',
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: COMPANY_FACTS.logo },
};
const OG_IMAGE = `${SITE_URL}/og-image.png`;

/** `title` with the brand suffix only while the whole stays within the ~60 characters a results page shows. */
export function pageTitle(title: string, suffix: string, limit = 60): string {
  const full = `${title}${suffix}`;
  return full.length <= limit ? full : title;
}

export const WEBSITE_SCHEMA = {
  '@type': 'WebSite',
  name: 'TradeQut',
  alternateName: 'TradeQut Trading Journal',
  url: SITE_URL,
};

export const ORGANIZATION_SCHEMA = {
  '@type': 'Organization',
  name: 'TradeQut',
  url: SITE_URL,
  logo: COMPANY_FACTS.logo,
  description: PRODUCT_DEFINITION,
  ...(COMPANY_FACTS.profiles.length ? { sameAs: COMPANY_FACTS.profiles } : {}),
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: SUPPORT_EMAIL,
    telephone: COMPANY_FACTS.phone.e164,
  },
};

/** The free trial plus the four Pro prices from product-facts, so structured data never drifts from the pricing table. */
export const SOFTWARE_APP_SCHEMA = {
  '@type': 'SoftwareApplication',
  name: 'TradeQut',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: PRODUCT_DEFINITION,
  offers: [
    { '@type': 'Offer', name: `${TRIAL_DAYS}-day free trial`, price: '0', priceCurrency: 'USD', description: 'Every Pro feature, no card required' },
    ...PRO_PRICES.map((p) => ({
      '@type': 'Offer',
      name: `Pro (${p.interval === 'month' ? 'monthly' : 'yearly'}, ${p.currency})`,
      price: String(p.amount),
      priceCurrency: p.currency,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: String(p.amount),
        priceCurrency: p.currency,
        billingDuration: 1,
        billingIncrement: 1,
        unitCode: p.interval === 'month' ? 'MON' : 'ANN',
      },
      description: `${TRIAL_DAYS}-day free trial, no card required`,
    })),
  ],
};

export const FAQ_ITEMS: FaqItem[] = PRODUCT_FAQ;

export function faqSchema(items: FaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export const FAQ_SCHEMA = faqSchema(PRODUCT_FAQ);

export const LANDING_PAGE_SCHEMA = {
  '@context': CONTEXT,
  '@graph': [WEBSITE_SCHEMA, ORGANIZATION_SCHEMA, SOFTWARE_APP_SCHEMA, FAQ_SCHEMA],
};

export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return { '@context': CONTEXT, ...breadcrumbList(items) };
}

interface ArticleLike {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
}

function articleNode(a: ArticleLike, url: string, section?: string) {
  return {
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    datePublished: a.publishedAt,
    dateModified: a.updatedAt ?? a.publishedAt,
    image: OG_IMAGE,
    mainEntityOfPage: url,
    ...(section ? { articleSection: section } : {}),
    author: { '@type': 'Organization', name: 'TradeQut', url: SITE_URL },
    publisher: PUBLISHER,
  };
}

export const GUIDE_ARTICLE_SCHEMA = {
  '@context': CONTEXT,
  '@graph': [
    articleNode(
      {
        title: 'How to use TradeQut',
        description:
          'How to use TradeQut: add trading accounts, log or import trades, read the dashboard, calendar and analytics, use AI reports and chat, set goals and rules.',
        publishedAt: '2026-04-18',
        updatedAt: '2026-11-15',
      },
      `${SITE_URL}/guide`,
    ),
    breadcrumbList([
      { name: 'Home', url: SITE_URL },
      { name: 'User guide', url: `${SITE_URL}/guide` },
    ]),
  ],
};

export const CONTACT_SCHEMA = {
  '@context': CONTEXT,
  '@type': 'ContactPage',
  name: 'Contact TradeQut',
  url: `${SITE_URL}/contact`,
  mainEntity: {
    '@type': 'Organization',
    name: 'TradeQut',
    email: SUPPORT_EMAIL,
    telephone: COMPANY_FACTS.phone.e164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY_FACTS.address.street,
      addressLocality: COMPANY_FACTS.address.locality,
      postalCode: COMPANY_FACTS.address.postalCode,
      addressRegion: COMPANY_FACTS.address.region,
      addressCountry: COMPANY_FACTS.address.country,
    },
  },
};

export function blogArticleSchema(article: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  faq?: FaqItem[];
  howTo?: { name: string; steps: { name: string; text: string }[] };
}) {
  const url = `${SITE_URL}/blog/${article.slug}`;
  const graph: object[] = [
    articleNode(article, url),
    breadcrumbList([
      { name: 'Home', url: SITE_URL },
      { name: 'Blog', url: `${SITE_URL}/blog` },
      { name: article.title, url },
    ]),
  ];
  if (article.faq?.length) graph.push(faqSchema(article.faq));
  if (article.howTo) {
    graph.push({
      '@type': 'HowTo',
      name: article.howTo.name,
      step: article.howTo.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
    });
  }
  return { '@context': CONTEXT, '@graph': graph };
}

export const BLOG_INDEX_SCHEMA = {
  '@context': CONTEXT,
  '@type': 'CollectionPage',
  name: 'TradeQut Blog - Trading Journal Guides',
  description: 'Guides on trading journaling, analytics, charges, risk and discipline for forex, Indian F&O and stock traders.',
  url: `${SITE_URL}/blog`,
  isPartOf: { '@type': 'WebSite', name: 'TradeQut', url: SITE_URL },
};

export function glossarySchema(terms: { term: string; definition: string }[]) {
  return {
    '@context': CONTEXT,
    '@type': 'DefinedTermSet',
    name: 'Trading Glossary',
    description: 'Glossary of trading terms and definitions.',
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.term, description: t.definition })),
  };
}

/** `faq` adds a FAQPage node; pass the same items the page renders. */
export function calculatorSchema(name: string, description: string, path: string, faq?: FaqItem[]) {
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'WebApplication',
        name,
        description,
        url: `${SITE_URL}${path}`,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      breadcrumbList([
        { name: 'Home', url: SITE_URL },
        { name: 'Calculators', url: `${SITE_URL}/resources` },
        { name, url: `${SITE_URL}${path}` },
      ]),
      ...(faq?.length ? [faqSchema(faq)] : []),
    ],
  };
}

export function caseStudySchema(study: ArticleLike & { slug: string }) {
  const url = `${SITE_URL}/case-studies/${study.slug}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      articleNode(study, url, 'Illustrative scenario'),
      breadcrumbList([
        { name: 'Home', url: SITE_URL },
        { name: 'Journaling scenarios', url: `${SITE_URL}/case-studies` },
        { name: study.title, url },
      ]),
    ],
  };
}

/** Stand-alone SEO pages (/pricing, /trading-journal-india, /alternatives/*). */
export function seoPageSchema(
  page: { path: string; title: string; description: string; label: string; parent?: { path: string; label: string } },
  extra: object[] = [],
  faq?: FaqItem[],
) {
  const url = `${SITE_URL}${page.path}`;
  const graph: object[] = [
    { '@type': 'WebPage', name: page.title, description: page.description, url, isPartOf: { '@type': 'WebSite', name: 'TradeQut', url: SITE_URL } },
    breadcrumbList([
      { name: 'Home', url: SITE_URL },
      ...(page.parent ? [{ name: page.parent.label, url: `${SITE_URL}${page.parent.path}` }] : []),
      { name: page.label, url },
    ]),
    ...extra,
  ];
  if (faq?.length) graph.push(faqSchema(faq));
  return { '@context': CONTEXT, '@graph': graph };
}

export const CHANGELOG_SCHEMA = {
  '@context': CONTEXT,
  '@type': 'CollectionPage',
  name: 'TradeQut Changelog',
  description: 'Product updates and release notes for the TradeQut trading journal.',
  url: `${SITE_URL}/changelog`,
};

export const RESOURCES_SCHEMA = {
  '@context': CONTEXT,
  '@type': 'CollectionPage',
  name: 'Trading Tools & Calculators - TradeQut',
  description: 'Free trading calculators for forex, gold and Indian F&O: position size, pip value, margin, prop-firm drawdown, market hours, risk of ruin, F&O charges.',
  url: `${SITE_URL}/resources`,
};

export const CASE_STUDIES_INDEX_SCHEMA = {
  '@context': CONTEXT,
  '@type': 'CollectionPage',
  name: 'Journaling Scenarios (Illustrative) - TradeQut',
  description:
    'Illustrative walk-throughs of how a trading journal exposes common problems. Hypothetical data; not real customers and not performance claims.',
  url: `${SITE_URL}/case-studies`,
};
