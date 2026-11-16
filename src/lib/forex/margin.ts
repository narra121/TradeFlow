import { baseCurrencyOf, contractSizeOf, quoteToUsd, usdToAccount, type AccountCurrency, type ForexPair } from '@/content/forexPairs';

/**
 * Margin for a forex or gold position, for the public calculator (/resources/margin-calculator):
 * margin = lots × contract size × price ÷ leverage, in the quote currency, converted to the account currency.
 */

export interface MarginInput {
  pair: ForexPair;
  /** The pair's price now, as the trader enters it. */
  price: number;
  lots: number;
  /** The x in 1:x. */
  leverage: number;
  account: AccountCurrency;
  /** Optional; 0 = not entered. */
  balance?: number;
}

export type MarginError = 'price' | 'lots' | 'leverage' | 'balance';

export interface MarginResult {
  status: 'ok';
  /** Base-currency units (ounces for gold). */
  units: number;
  /** Position value in the account currency. */
  notional: number;
  /** Margin the position ties up, in the account currency. */
  margin: number;
  /** Margin for one lot, in the account currency. */
  marginPerLot: number;
  /** Margin as a percent of the balance; null without a balance. */
  marginPctOfBalance: number | null;
  /** Lots the whole balance could hold as margin at this leverage, rounded down to 0.01; null without a balance. */
  maxLots: number | null;
  /** Position value ÷ balance; null without a balance. */
  effectiveLeverage: number | null;
}

export type MarginOutcome = MarginResult | { status: 'error'; error: MarginError };

export function marginFor(i: MarginInput): MarginOutcome {
  if (!(i.price > 0)) return { status: 'error', error: 'price' };
  if (!(i.lots > 0)) return { status: 'error', error: 'lots' };
  if (!(i.leverage >= 1)) return { status: 'error', error: 'leverage' };
  const balance = i.balance ?? 0;
  if (!Number.isFinite(balance) || balance < 0) return { status: 'error', error: 'balance' };

  const contract = contractSizeOf(i.pair);
  const units = i.lots * contract;
  // A USD-based pair is worth its units in USD; anything else is units × price in the quote currency.
  const usdPerLot = baseCurrencyOf(i.pair) === 'USD' ? contract : contract * i.price * quoteToUsd(i.pair, i.price);
  const notionalPerLot = usdToAccount(usdPerLot, i.account);
  const marginPerLot = notionalPerLot / i.leverage;
  const notional = notionalPerLot * i.lots;
  const margin = marginPerLot * i.lots;
  const has = balance > 0;
  return {
    status: 'ok',
    units,
    notional,
    margin,
    marginPerLot,
    marginPctOfBalance: has ? (margin / balance) * 100 : null,
    maxLots: has ? Math.floor((balance / marginPerLot) * 100 + 1e-9) / 100 : null,
    effectiveLeverage: has ? notional / balance : null,
  };
}
