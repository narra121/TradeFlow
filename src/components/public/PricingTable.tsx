import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PLAN_LIMITS,
  PRICING_NOTE,
  proPrice,
  type Currency,
  type Interval,
} from '@/content/product-facts';

/** INR when the browser language is Indian English or any `*-IN` locale; USD otherwise. No network lookup. */
export function defaultCurrency(languages?: readonly string[]): Currency {
  const list = languages ?? (typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []);
  return list.some((l) => /-IN$/i.test(l)) ? 'INR' : 'USD';
}

interface ToggleProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function Toggle<T extends string>({ label, value, options, onChange }: ToggleProps<T>) {
  const name = useId();
  return (
    <fieldset role="radiogroup" className="m-0 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex rounded-md border border-border-strong p-0.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center rounded px-3 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              value === o.value ? 'bg-secondary text-foreground' : 'text-foreground-soft hover:text-foreground',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];
const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'INR', label: 'INR' },
];

export function PricingTable({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const [currency, setCurrency] = useState<Currency>(() => defaultCurrency());
  const [interval, setInterval] = useState<Interval>('month');
  const price = proPrice(currency, interval);
  const Heading = `h${headingLevel}` as 'h2' | 'h3';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Toggle
          label="Billing period"
          value={interval}
          onChange={(v) => setInterval(v)}
          options={INTERVAL_OPTIONS}
        />
        <Toggle
          label="Currency"
          value={currency}
          onChange={(v) => setCurrency(v)}
          options={CURRENCY_OPTIONS}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full table-fixed text-xs sm:text-sm">
          <caption className="sr-only">Free and Pro plan comparison</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="w-[34%] px-2 py-3 text-left font-semibold text-foreground sm:w-2/5 sm:px-4 lg:w-1/2">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="w-[26%] px-2 py-3 text-left align-bottom sm:w-1/4 sm:px-4">
                <Heading className="text-base font-semibold text-foreground">Free</Heading>
                <p className="num mt-1 text-base font-semibold text-foreground sm:text-2xl">{currency === 'INR' ? '₹0' : '$0'}</p>
              </th>
              <th scope="col" className="px-2 py-3 text-left align-bottom sm:px-4">
                <Heading className="text-base font-semibold text-foreground">Pro</Heading>
                <p className="num mt-1 text-base font-semibold text-foreground sm:text-2xl">
                  {price.display}
                  <span className="text-xs font-normal text-muted-foreground sm:text-sm"> / {interval === 'month' ? 'month' : 'year'}</span>
                </p>
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_LIMITS.map((row) => (
              <tr key={row.feature} className="border-t border-border">
                <th scope="row" className="px-2 py-3 text-left font-normal text-foreground sm:px-4">
                  {row.feature}
                </th>
                <td className="px-2 py-3 text-foreground-soft sm:px-4">{row.free}</td>
                <td className="px-2 py-3 text-foreground-soft sm:px-4">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button asChild className="signed-out-only">
          <Link to="/signup">Start free</Link>
        </Button>
        <p className="max-w-prose text-sm text-muted-foreground">{PRICING_NOTE}</p>
      </div>
    </div>
  );
}
