/** The four most used first, then the rest of the ISO codes the backend accepts (B-110). */
export const ACCOUNT_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'] as const;

const MORE = ['AED', 'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'HKD', 'JPY', 'KRW', 'MXN', 'NOK', 'NZD', 'PLN', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR'];

export function currencyOptions(current?: string): string[] {
  const all: string[] = [...ACCOUNT_CURRENCIES, ...MORE];
  return current && !all.includes(current) ? [...all, current] : all;
}
