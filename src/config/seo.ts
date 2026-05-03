export const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TradeQut',
  alternateName: 'TradeQut Trading Journal',
  url: 'https://tradequt.com',
};

export const ORGANIZATION_SCHEMA = {
  '@type': 'Organization',
  name: 'TradeQut',
  url: 'https://tradequt.com',
  logo: 'https://tradequt.com/og-image.png',
  description:
    'Free trading journal app for stocks, forex, crypto, and options — track trades, analyze performance, and improve your trading strategy',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: 'support@tradequt.com',
    telephone: '+91-8501018125',
  },
};

export const SOFTWARE_APP_SCHEMA = {
  '@type': 'SoftwareApplication',
  name: 'TradeQut',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://tradequt.com',
  description:
    'Free trading journal software for day traders and swing traders. Track trades, analyze win rate and profit factor, and import from brokers.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier available',
  },
};

export const FAQ_ITEMS = [
  {
    question: 'What is TradeQut?',
    answer:
      'TradeQut is a free online trading journal that helps traders track, analyze, and improve their performance. You can log trades manually, import from CSV files, or use AI-powered extraction from broker statement screenshots.',
  },
  {
    question: 'Is TradeQut free to use?',
    answer:
      'Yes, TradeQut offers a free plan with core features including trade logging, analytics, and performance tracking. Premium plans add an ad-free experience and unlimited trade history.',
  },
  {
    question: 'What markets does TradeQut support?',
    answer:
      'TradeQut supports stocks, forex, futures, options, and cryptocurrency. You can track trades across multiple accounts and asset classes in one place.',
  },
  {
    question: 'Can I import trades from my broker?',
    answer:
      'Yes. You can import trades via CSV files, Excel spreadsheets, or screenshots of broker statements. The AI-powered extraction reads trade data from images automatically.',
  },
  {
    question: 'How does TradeQut help improve trading performance?',
    answer:
      'TradeQut provides analytics including win rate, profit factor, risk-reward ratios, drawdown tracking, and performance by time of day. You can set goals and define trading rules to identify patterns and improve discipline.',
  },
  {
    question: 'Is my trading data secure?',
    answer:
      'Yes. TradeQut uses AWS infrastructure with encryption at rest and in transit. Your data is stored securely and only accessible to you. We never share trading data with third parties.',
  },
];

export const FAQ_SCHEMA = {
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export const LANDING_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [WEBSITE_SCHEMA, ORGANIZATION_SCHEMA, SOFTWARE_APP_SCHEMA, FAQ_SCHEMA],
};

export const GUIDE_ARTICLE_SCHEMA = {
  '@type': 'Article',
  headline: 'TradeQut User Guide - Complete Trading Journal Tutorial',
  description:
    'Step-by-step guide to using TradeQut. Learn how to log trades, analyze performance, set goals, and track your progress.',
  datePublished: '2026-04-18',
  dateModified: '2026-04-18',
  image: 'https://tradequt.com/og-image.png',
  mainEntityOfPage: 'https://tradequt.com/guide',
  author: { '@type': 'Organization', name: 'TradeQut', url: 'https://tradequt.com' },
  publisher: {
    '@type': 'Organization',
    name: 'TradeQut',
    logo: { '@type': 'ImageObject', url: 'https://tradequt.com/og-image.png' },
  },
};

export const CONTACT_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact TradeQut',
  url: 'https://tradequt.com/contact',
  mainEntity: {
    '@type': 'Organization',
    name: 'TradeQut',
    email: 'support@tradequt.com',
    telephone: '+91-8501018125',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'TradeQutJournal',
      addressLocality: 'Bhupalpally',
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    },
  },
};

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function blogArticleSchema(article: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    image: 'https://tradequt.com/og-image.png',
    mainEntityOfPage: `https://tradequt.com/blog/${article.slug}`,
    author: { '@type': 'Organization', name: 'TradeQut', url: 'https://tradequt.com' },
    publisher: {
      '@type': 'Organization',
      name: 'TradeQut',
      logo: { '@type': 'ImageObject', url: 'https://tradequt.com/og-image.png' },
    },
  };
}

export const BLOG_INDEX_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'TradeQut Blog - Trading Journal Tips & Strategies',
  description: 'Expert articles on trading journaling, analytics, psychology, and strategies to improve your trading performance.',
  url: 'https://tradequt.com/blog',
  isPartOf: { '@type': 'WebSite', name: 'TradeQut', url: 'https://tradequt.com' },
};

export function glossarySchema(terms: { term: string; definition: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Trading Glossary',
    description: 'Comprehensive glossary of trading terms and definitions for traders of all levels.',
    url: 'https://tradequt.com/glossary',
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
    })),
  };
}

export function calculatorSchema(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: `https://tradequt.com${path}`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function caseStudySchema(study: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    articleSection: 'Case Study',
    headline: study.title,
    description: study.description,
    datePublished: study.publishedAt,
    dateModified: study.publishedAt,
    image: 'https://tradequt.com/og-image.png',
    mainEntityOfPage: `https://tradequt.com/case-studies/${study.slug}`,
    author: { '@type': 'Organization', name: 'TradeQut', url: 'https://tradequt.com' },
    publisher: {
      '@type': 'Organization',
      name: 'TradeQut',
      logo: { '@type': 'ImageObject', url: 'https://tradequt.com/og-image.png' },
    },
  };
}

export const CHANGELOG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'TradeQut Changelog',
  description: 'Product updates and release notes for TradeQut trading journal.',
  url: 'https://tradequt.com/changelog',
};

export const RESOURCES_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Trading Tools & Calculators - TradeQut',
  description: 'Free trading calculators: position size, risk-reward ratio, and pip value. Essential tools for every trader.',
  url: 'https://tradequt.com/resources',
};

export const CASE_STUDIES_INDEX_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Trading Success Stories - TradeQut Case Studies',
  description: 'Real stories of traders who improved their performance with disciplined journaling and analytics.',
  url: 'https://tradequt.com/case-studies',
};
