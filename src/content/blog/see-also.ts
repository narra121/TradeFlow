interface SeeAlsoLink {
  to: string;
  label: string;
}

const L = {
  india: { to: '/trading-journal-india', label: 'Trading journal for Indian traders' },
  fo: { to: '/fo-trading-journal', label: 'F&O trading journal for Nifty and Bank Nifty' },
  zerodha: { to: '/zerodha-trading-journal', label: 'Zerodha trading journal: import the Console tradebook' },
  upstox: { to: '/upstox-trading-journal', label: 'Upstox trading journal' },
  groww: { to: '/groww-trading-journal', label: 'Groww trading journal' },
  angel: { to: '/angel-one-trading-journal', label: 'Angel One trading journal' },
  dhan: { to: '/dhan-trading-journal', label: 'Dhan trading journal' },
  screenshot: { to: '/import-trades-from-screenshot', label: 'Import trades from a screenshot' },
  alternatives: { to: '/alternatives', label: 'Trading journal alternatives compared' },
  tradesviz: { to: '/alternatives/tradesviz', label: 'TradesViz alternative for Indian traders' },
  pricing: { to: '/pricing', label: 'TradeQut pricing' },
  size: { to: '/resources/position-size', label: 'Position size calculator' },
  rr: { to: '/resources/risk-reward', label: 'Risk-reward calculator' },
  pip: { to: '/resources/pip-calculator', label: 'Pip value calculator' },
  glossary: { to: '/glossary', label: 'Trading glossary' },
} satisfies Record<string, SeeAlsoLink>;

/** Product pages and calculators shown under an article, keyed by article slug. Every `to` must be a registry path (see-also.test.ts). */
export const SEE_ALSO: Record<string, SeeAlsoLink[]> = {
  'how-to-keep-trading-journal': [L.screenshot, L.india, L.alternatives],
  'trading-journal-template': [L.india, L.alternatives],
  'mistakes-new-traders-make': [L.size, L.rr],
  'how-to-review-trades': [L.rr, L.glossary],
  'getting-started-tradequt': [L.pricing, L.screenshot],
  'win-rate-vs-profit-factor': [L.rr, L.glossary],
  'risk-reward-ratio-guide': [L.rr, L.size],
  'track-reduce-drawdown': [L.size, L.glossary],
  'trading-metrics-that-matter': [L.rr, L.glossary],
  'build-trading-plan': [L.size, L.rr],
  'forex-trading-journal': [L.pip, L.size, L.screenshot],
  'day-trading-journal': [L.fo, L.india, L.size],
  'prop-trading-challenges': [L.screenshot, L.size],
  'importing-trades-from-broker': [L.zerodha, L.upstox, L.groww, L.angel, L.dhan, L.screenshot],
  'fo-trading-charges-india': [L.fo, L.zerodha, L.india],
  'zerodha-tradebook-pnl': [L.zerodha, L.fo, L.india],
  'best-free-trading-journal': [L.alternatives, L.tradesviz, L.pricing],
  'trading-journal-excel-template': [L.india, L.alternatives, L.pricing],
  'options-trading-journal-india': [L.fo, L.zerodha, L.size],
  'mt5-trading-journal': [L.pip, L.screenshot],
  'r-multiple-explained': [L.rr, L.size],
  'trading-expectancy-formula': [L.rr, L.glossary],
  'position-sizing-fixed-risk': [L.size, L.rr],
  'trading-drawdown-calculation': [L.size, L.glossary],
};
