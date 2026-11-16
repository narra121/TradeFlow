/** Reference pairs and approximate rates for the public calculators. Rates are illustrative, never live. */
export interface ForexPair {
  value: string;
  label: string;
  rate: number;
  pipSize: number;
  quoteCurrency: string;
  /** Units of the base in one standard lot; absent = 100,000 (currency pairs). Gold is 100 troy ounces. */
  contractSize?: number;
}

export const FOREX_PAIRS: ForexPair[] = [
  { value: 'EUR/USD', label: 'EUR/USD', rate: 1.085, pipSize: 0.0001, quoteCurrency: 'USD' },
  { value: 'GBP/USD', label: 'GBP/USD', rate: 1.265, pipSize: 0.0001, quoteCurrency: 'USD' },
  { value: 'USD/JPY', label: 'USD/JPY', rate: 155.5, pipSize: 0.01, quoteCurrency: 'JPY' },
  { value: 'AUD/USD', label: 'AUD/USD', rate: 0.655, pipSize: 0.0001, quoteCurrency: 'USD' },
  { value: 'USD/CAD', label: 'USD/CAD', rate: 1.365, pipSize: 0.0001, quoteCurrency: 'CAD' },
  { value: 'EUR/GBP', label: 'EUR/GBP', rate: 0.8575, pipSize: 0.0001, quoteCurrency: 'GBP' },
  { value: 'NZD/USD', label: 'NZD/USD', rate: 0.595, pipSize: 0.0001, quoteCurrency: 'USD' },
  { value: 'USD/CHF', label: 'USD/CHF', rate: 0.88, pipSize: 0.0001, quoteCurrency: 'CHF' },
  { value: 'GBP/JPY', label: 'GBP/JPY', rate: 196.7, pipSize: 0.01, quoteCurrency: 'JPY' },
  { value: 'EUR/JPY', label: 'EUR/JPY', rate: 168.7, pipSize: 0.01, quoteCurrency: 'JPY' },
  // A gold "pip" here is 0.10 (the MetaTrader convention on 2-decimal quotes); some brokers call 0.01 a pip.
  { value: 'XAU/USD', label: 'XAU/USD (gold)', rate: 4200, pipSize: 0.1, quoteCurrency: 'USD', contractSize: 100 },
];

/** Lots, not units: units = lots × the pair's contract size. */
export const LOT_SIZES = [
  { label: 'Standard', value: 1 },
  { label: 'Mini', value: 0.1 },
  { label: 'Micro', value: 0.01 },
] as const;

export const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'] as const;
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

/** Approximate value of one unit of each currency in USD, consistent with the reference rates above. */
const USD_VALUE: Record<string, number> = {
  USD: 1,
  EUR: 1.085,
  GBP: 1.265,
  AUD: 0.655,
  NZD: 0.595,
  JPY: 1 / 155.5,
  CAD: 1 / 1.365,
  CHF: 1 / 0.88,
  INR: 0.01193,
};

export const contractSizeOf = (pair: ForexPair): number => pair.contractSize ?? 100000;
export const baseCurrencyOf = (pair: ForexPair): string => pair.value.slice(0, 3);

/**
 * USD value of one unit of the pair's quote currency at `rate` (the pair's price): exact for USD-quoted and USD-based
 * pairs, the reference table for crosses.
 */
export function quoteToUsd(pair: ForexPair, rate: number = pair.rate): number {
  if (pair.quoteCurrency === 'USD') return 1;
  if (baseCurrencyOf(pair) === 'USD') return 1 / rate;
  return USD_VALUE[pair.quoteCurrency];
}

/** Converts a USD amount to the account currency at the reference rate. */
export const usdToAccount = (usd: number, account: AccountCurrency): number => usd / USD_VALUE[account];

export interface PipValue {
  inQuote: number;
  inUsd: number;
  inAccount: number;
  quoteCurrency: string;
}

/** Value of one pip for `lotSize` units of the base currency, in the quote, USD and account currency. */
export function pipValue(pair: ForexPair, lotSize: number, account: AccountCurrency): PipValue {
  const inQuote = pair.pipSize * lotSize;
  const inUsd = inQuote * quoteToUsd(pair);
  return { inQuote, inUsd, inAccount: usdToAccount(inUsd, account), quoteCurrency: pair.quoteCurrency };
}

export function getPair(value: string): ForexPair {
  const pair = FOREX_PAIRS.find((p) => p.value === value);
  if (!pair) throw new Error(`unknown pair ${value}`);
  return pair;
}
