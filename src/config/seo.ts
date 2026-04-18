export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TradeQut',
  url: 'https://tradequt.com',
  logo: 'https://tradequt.com/favicon.svg',
  description:
    'Free trading journal app for stocks, forex, crypto, and options — track trades, analyze performance, and improve your trading strategy',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: 'Narra77888@gmail.com',
    telephone: '+91-8501018125',
  },
};

export const SOFTWARE_APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'TradeQut',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://tradequt.com',
  description:
    'Free trading journal software for day traders and swing traders. Track trades, analyze win rate and profit factor, import from brokers, and get AI-powered insights.',
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
      'TradeQut is a free trading journal app that helps day traders, swing traders, and investors track, analyze, and improve their trading performance. It works as a trade tracker and trading log with support for manual trade entry, CSV import, and AI-powered broker statement extraction.',
  },
  {
    question: 'Is TradeQut free to use?',
    answer:
      'Yes, TradeQut offers a free trading journal with core features like trade logging, basic trading analytics, and performance tracking. Premium plans unlock advanced features like AI-powered insights, detailed win rate and profit factor analysis, and unlimited trade history.',
  },
  {
    question: 'What markets does TradeQut support?',
    answer:
      'TradeQut works as a stock trading journal, forex trading journal, crypto trading journal, options trading journal, and futures trading journal. You can track trades across multiple accounts and asset classes in one place.',
  },
  {
    question: 'Can I import trades from my broker?',
    answer:
      'Yes, TradeQut supports importing trades from broker statements via CSV files and screenshots. Our AI-powered extraction can read trade data from images of broker statements.',
  },
  {
    question: 'How does TradeQut help improve trading performance?',
    answer:
      'TradeQut provides detailed trading analytics including win rate, profit factor, risk-reward ratios, drawdown tracking, and performance by time of day. Set goals, define trading rules, review your trading strategy, and get AI-generated insights to identify patterns in your day trading or swing trading.',
  },
  {
    question: 'Is my trading data secure?',
    answer:
      'Yes, TradeQut uses AWS infrastructure with encryption at rest and in transit. Your data is stored securely and is only accessible to you. We never share your trading data with third parties.',
  },
];

export const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
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
  '@graph': [ORGANIZATION_SCHEMA, SOFTWARE_APP_SCHEMA, FAQ_SCHEMA],
};

export const GUIDE_ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'TradeQut User Guide - Complete Trading Journal Tutorial',
  description:
    'Step-by-step guide to using TradeQut. Learn how to log trades, analyze performance, set goals, and track your progress.',
  datePublished: '2026-04-18',
  author: { '@type': 'Organization', name: 'TradeQut' },
  publisher: { '@type': 'Organization', name: 'TradeQut' },
};

export const CONTACT_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact TradeQut',
  url: 'https://tradequt.com/contact',
  mainEntity: {
    '@type': 'Organization',
    name: 'TradeQut',
    email: 'Narra77888@gmail.com',
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
