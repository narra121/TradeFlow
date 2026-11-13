import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { popupOption } from '@/components/ui/popup';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label?: string;
  count?: number;
}

/** Searchable checklist with counts: the value picker of a filter field. */
export function FilterValueList({ label, options, selected, onChange }: { label: string; options: FilterOption[]; selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = options.filter((o) => !q || (o.label ?? o.value).toLowerCase().includes(q));
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <>
        {options.length > 8 && <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} aria-label={`Search ${label.toLowerCase()}`} className="mb-2" />}
        {options.length === 0 ? (
          <p className="px-2 py-3 text-13 text-muted-foreground">No values in this list yet.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto" aria-label={label}>
            {shown.map((o) => {
              const id = `f-${label}-${o.value}`;
              return (
                <li key={o.value}>
                  <label htmlFor={id} className={cn(popupOption, 'gap-2')}>
                    <Checkbox id={id} checked={selected.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                    <span className="min-w-0 flex-1 truncate">{o.label ?? o.value}</span>
                    {o.count !== undefined && <span className="font-mono text-xs tabular-nums text-muted-foreground">{o.count}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {selected.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="mt-1 w-full" onClick={() => onChange([])}>
            Clear {label.toLowerCase()}
          </Button>
        )}
    </>
  );
}
