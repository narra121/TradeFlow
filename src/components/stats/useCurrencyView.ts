import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AggregatedStats } from '@/types/stats';

type WithCurrencies = AggregatedStats & { byCurrency?: Record<string, AggregatedStats>; currencies?: string[] };

export interface CurrencyView {
  /** Currencies present in the scope (All accounts only); length > 1 means money cannot be one figure. */
  currencies: string[];
  /** The currency whose figures are shown; undefined for a scope without the split (one account) so the caller uses the account's. */
  currency?: string;
  select: (c: string) => void;
  stats?: AggregatedStats;
  prev?: AggregatedStats;
}

/**
 * All accounts with several currencies: every figure is the aggregate of ONE currency (`byCurrency`), chosen in the URL
 * (`?cur=`), defaulting to the currency with the most trades. Otherwise the stats pass through unchanged.
 */
export function useCurrencyView(stats: AggregatedStats | undefined, prev: AggregatedStats | undefined): CurrencyView {
  const [params, setParams] = useSearchParams();
  const s = stats as WithCurrencies | undefined;
  const currencies = useMemo(() => (s?.currencies && s.currencies.length > 1 ? s.currencies : []), [s?.currencies]);
  const wanted = params.get('cur');
  const currency = useMemo(() => {
    if (currencies.length === 0) return s?.currencies?.length === 1 ? s.currencies[0] : undefined;
    if (wanted && currencies.includes(wanted)) return wanted;
    return [...currencies].sort((a, b) => (s?.byCurrency?.[b]?.totalTrades ?? 0) - (s?.byCurrency?.[a]?.totalTrades ?? 0))[0];
  }, [currencies, wanted, s]);

  const select = (c: string) => {
    const next = new URLSearchParams(params);
    next.set('cur', c);
    setParams(next, { replace: true });
  };

  if (currencies.length === 0 || !currency) return { currencies, currency, select, stats, prev };
  return { currencies, currency, select, stats: s?.byCurrency?.[currency], prev: (prev as WithCurrencies | undefined)?.byCurrency?.[currency] };
}
