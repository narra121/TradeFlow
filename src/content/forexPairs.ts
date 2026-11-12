/** Reference pairs and approximate rates for the public calculators. Rates are illustrative, never live. */
export interface ForexPair {
  value: string;
  label: string;
  rate: number;
  pipSize: number;
  quoteCurrency: string;
}

export const FOREX_PAIRS: ForexPair[] = [
  { value: 'EUR/USD', label: 'EUR/USD', rate: 1.085, pipSize: 0.0001, quoteCurrency: 'USD' },
  { value: 'GBP/USD', label: 'GBP/USD', rate: 1.265, pipSize: 0.0001, quoteCurrency: 'USD' },
  { value: 'USD/JPY', label: 'USD/JPY', rate: 155.5, pipSize: 0.01, quoteCurrency: 'JPY' },
  { value: 'AUD/USD', label: 'AUD/USD', rate: 0.655, pipSize: 0.0001, quoteCurrency: 'USD' },
  { value: 'USD/CAD', label: 'USD/CAD', rate: 1.365, pipSize: 0.0001, quoteCurrency: 'CAD' },
  { value: 'EUR/GBP', label: 'EUR/GBP', rate: 0.8575, pipSize: 0.0001, quoteCurrency: 'GBP' },
  { value: 'NZD/USD', label: 'NZD/USD', rate: 0.595, pipSize: 0.0001, quoteCurrency: 'USD' },
];

export const LOT_SIZES = [
  { label: 'Standard (100,000)', value: 100000 },
  { label: 'Mini (10,000)', value: 10000 },
  { label: 'Micro (1,000)', value: 1000 },
] as const;

export const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'] as const;
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

/** Approximate value of one unit of each account currency in USD. */
const TO_USD: Record<AccountCurrency, number> = { USD: 1, EUR: 1.085, GBP: 1.265, INR: 0.01193 };

export interface PipValue {
  inQuote: number;
  inUsd: number;
  inAccount: number;
  quoteCurrency: string;
}

/** Value of one pip for `lotSize` units of the base currency, in the quote, USD and account currency. */
export function pipValue(pair: ForexPair, lotSize: number, account: AccountCurrency): PipValue {
  const inQuote = pair.pipSize * lotSize;
  let inUsd: number;
  if (pair.quoteCurrency === 'USD') inUsd = inQuote;
  else if (pair.quoteCurrency === 'GBP') inUsd = inQuote * TO_USD.GBP;
  else inUsd = inQuote / pair.rate;
  return { inQuote, inUsd, inAccount: inUsd / TO_USD[account], quoteCurrency: pair.quoteCurrency };
}

export function getPair(value: string): ForexPair {
  const pair = FOREX_PAIRS.find((p) => p.value === value);
  if (!pair) throw new Error(`unknown pair ${value}`);
  return pair;
}
