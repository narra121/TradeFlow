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
