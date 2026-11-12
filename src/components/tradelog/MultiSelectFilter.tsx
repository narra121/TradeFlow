import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label?: string;
  count?: number;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

/** One facet of the Trades filter row: searchable checklist with counts. */
export function MultiSelectFilter({ label, options, selected, onChange, className }: MultiSelectFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-1.5 font-normal', selected.length > 0 && 'border-primary/60', className)}
          aria-label={`${label} filter${selected.length ? `, ${selected.length} selected` : ''}`}
        >
          {label}
          {selected.length > 0 && <span className="rounded bg-primary/15 px-1 text-xs text-primary">{selected.length}</span>}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <FilterValueList label={label} options={options} selected={selected} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
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
          <p className="px-2 py-3 text-sm text-muted-foreground">No values in this list yet.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto" aria-label={label}>
            {shown.map((o) => {
              const id = `f-${label}-${o.value}`;
              return (
                <li key={o.value}>
                  <label htmlFor={id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-muted [@media(pointer:coarse)]:min-h-11">
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
