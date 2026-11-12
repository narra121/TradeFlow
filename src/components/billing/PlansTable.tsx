import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Currency, Interval } from '@/content/product-facts';
import { APP_PLAN_ROWS, priceLine, yearlySavingPercent } from '@/components/billing/freeLimits';
import { formatMoney } from '@/lib/format';

interface PlansTableProps {
  currency: Currency;
  interval: Interval;
  onInterval: (i: Interval) => void;
  /** Text above the Free column: `Your plan` or `After your trial`. */
  freeCaption?: string;
  /** False hides the purchase button (the plan could not be loaded). */
  canUpgrade: boolean;
  busy: boolean;
  onUpgrade: () => void;
}

/** Free vs Pro as a real table on desktop (row headers) and two cards on phones (Pro first). */
export function PlansTable({ currency, interval, onInterval, freeCaption, canUpgrade, busy, onUpgrade }: PlansTableProps) {
  const price = priceLine(currency, interval);
  const save = yearlySavingPercent(currency);
  const upgrade = canUpgrade ? (
    <Button type="button" variant="accent" disabled={busy} onClick={onUpgrade}>
      {busy ? 'Opening checkout…' : 'Upgrade to Pro'}
    </Button>
  ) : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Plans</h3>
        <SegmentedControl
          label="Billing interval"
          size="sm"
          value={interval}
          onChange={(v) => onInterval(v as Interval)}
          options={[
            { value: 'month', label: 'Monthly' },
            { value: 'year', label: `Yearly · save ${save}%`, ariaLabel: `Yearly, save ${save} percent` },
          ]}
        />
      </div>
      <p className="sr-only" aria-live="polite">{`Pro costs ${price.main}`}</p>

      <table className="hidden w-full text-13 md:table">
        <caption className="sr-only">Free and Pro compared</caption>
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="h-8 w-[40%] font-normal"><span className="sr-only">Feature</span></th>
            <th scope="col" className="font-medium text-foreground">
              Free
              {freeCaption && <span className="ml-2 font-normal text-muted-foreground">{freeCaption}</span>}
            </th>
            <th scope="col" className="font-medium text-accent-text">Pro</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <th scope="row" className="py-2 pr-3 text-left font-normal">Price</th>
            <td className="py-2 font-mono tabular-nums">{formatMoney(0, currency, { decimals: 0 })}</td>
            <td className="py-2 font-mono tabular-nums">
              {price.main}
              {price.sub && <span className="ml-1 text-muted-foreground">({price.sub})</span>}
            </td>
          </tr>
          {APP_PLAN_ROWS.map((r) => (
            <tr key={r.feature} className="border-t border-border">
              <th scope="row" className="py-2 pr-3 text-left font-normal">{r.feature}</th>
              <td className="py-2 pr-3 text-foreground-soft">{r.free}</td>
              <td className="py-2">{r.pro}</td>
            </tr>
          ))}
          {upgrade && (
            <tr className="border-t border-border">
              <td />
              <td />
              <td className="pt-3">{upgrade}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="space-y-3 md:hidden">
        <section aria-label="Pro plan" className="rounded-lg border border-border p-3">
          <h4 className="text-sm font-semibold">Pro <span className="font-mono font-normal text-muted-foreground">{price.main}</span></h4>
          <ul className="mt-2 space-y-1 text-13">
            {APP_PLAN_ROWS.map((r) => (
              <li key={r.feature}><span className="text-muted-foreground">{r.feature}: </span>{r.pro}</li>
            ))}
          </ul>
          {upgrade && <div className="mt-3 [&>button]:w-full">{upgrade}</div>}
        </section>
        <section aria-label="Free plan" className="rounded-lg border border-border p-3">
          <h4 className="text-sm font-semibold">Free {freeCaption && <span className="font-normal text-muted-foreground">{freeCaption}</span>}</h4>
          <ul className="mt-2 space-y-1 text-13">
            {APP_PLAN_ROWS.map((r) => (
              <li key={r.feature}><span className="text-muted-foreground">{r.feature}: </span>{r.free}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
