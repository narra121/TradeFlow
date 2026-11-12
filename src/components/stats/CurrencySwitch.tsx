import { SegmentedControl } from '@/components/ui/segmented-control';

/** `Currency  [INR | USD]`: one currency at a time, so no figure ever adds two currencies. */
export function CurrencySwitch({ currencies, value, onChange }: { currencies: string[]; value: string; onChange: (c: string) => void }) {
  if (currencies.length < 2) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span aria-hidden="true">Currency</span>
      <SegmentedControl label="Currency" size="sm" value={value} onChange={onChange} options={currencies.map((c) => ({ value: c, label: c }))} />
    </div>
  );
}
