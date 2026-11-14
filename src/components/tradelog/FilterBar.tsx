import { forwardRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ListFilter, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { FilterValueList, type FilterOption } from '@/components/tradelog/MultiSelectFilter';
import type { TradeFilters } from '@/lib/tradeFilters';
import { popupOption } from '@/components/ui/popup';
import { cn } from '@/lib/utils';

export type FilterFieldKey = 'symbols' | 'outcomes' | 'strategies' | 'sessions' | 'mistakes' | 'tags' | 'broken' | 'assets' | 'sides' | 'accounts' | 'result';

const FIELDS: { key: FilterFieldKey; label: string }[] = [
  { key: 'symbols', label: 'Symbol' },
  { key: 'outcomes', label: 'Outcome' },
  { key: 'strategies', label: 'Strategy' },
  { key: 'sessions', label: 'Session' },
  { key: 'mistakes', label: 'Mistake' },
  { key: 'tags', label: 'Tag' },
  { key: 'broken', label: 'Broken rule' },
  { key: 'assets', label: 'Asset class' },
  { key: 'sides', label: 'Side' },
  { key: 'accounts', label: 'Account' },
  { key: 'result', label: 'Result' },
];

const SIDE_OPTIONS: FilterOption[] = [{ value: 'LONG', label: 'Long' }, { value: 'SHORT', label: 'Short' }];
const RESULT_OPTIONS: FilterOption[] = [{ value: 'win', label: 'Win' }, { value: 'loss', label: 'Loss' }, { value: 'flat', label: 'Flat' }];

export type FilterOptions = Record<Exclude<FilterFieldKey, 'sides' | 'result'>, FilterOption[]>;

/** Chips show at most this many before the filters fold into one `Filters n` button (never a second row). */
export const MAX_INLINE_CHIPS = 2;

function selectedOf(f: TradeFilters, key: FilterFieldKey): string[] {
  return key === 'result' ? (f.result ? [f.result] : []) : ((f[key] as string[] | undefined) ?? []);
}

export function activeFilterCount(f: TradeFilters): number {
  return FIELDS.filter((fd) => selectedOf(f, fd.key).length > 0).length;
}

interface FilterBarProps {
  filters: TradeFilters;
  options: FilterOptions;
  onChange: (patch: Partial<TradeFilters>) => void;
  onFind: (q: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  /** Phones: only `Filters n`, in a sheet that starts with Find. */
  isMobile: boolean;
  /** Extra sheet sections (Group, Export) for phones. */
  sheetExtra?: React.ReactNode | ((closeSheet: () => void) => React.ReactNode);
  /** A column menu asked for this field: open the panel on it. */
  openField?: { key: FilterFieldKey; nonce: number } | null;
}

function optionsFor(o: FilterOptions, key: FilterFieldKey): FilterOption[] {
  return key === 'sides' ? SIDE_OPTIONS : key === 'result' ? RESULT_OPTIONS : o[key];
}

function valuesLabel(options: FilterOption[], selected: string[]): string {
  const names = selected.map((v) => options.find((o) => o.value === v)?.label ?? options.find((o) => o.value === v)?.value ?? v);
  return names.length <= 2 ? names.join(', ') : `${names[0]}, ${names[1]} +${names.length - 2}`;
}

const FindField = forwardRef<HTMLInputElement, { value: string; onChange: (q: string) => void; className?: string }>(function FindField({ value, onChange, className }, ref) {
  return (
    <div className={cn('relative min-w-24 flex-1 basis-32', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        id="trades-search"
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) onChange('');
        }}
        placeholder="Find…  /"
        aria-label="Find in trades"
        className="h-7 w-full pl-7 text-13"
      />
    </div>
  );
});

/** One accordion row per field: choose values without leaving the panel. */
function FieldPanel({ filters, options, onChange, initialOpen }: Pick<FilterBarProps, 'filters' | 'options' | 'onChange'> & { initialOpen?: FilterFieldKey | null }) {
  const [open, setOpen] = useState<FilterFieldKey | null>(initialOpen ?? null);
  const set = (key: FilterFieldKey, next: string[]) => onChange(key === 'result' ? { result: (next[next.length - 1] ?? '') as TradeFilters['result'] } : ({ [key]: next } as Partial<TradeFilters>));
  return (
    <ul className="space-y-0.5">
      {FIELDS.map((fd) => {
        const sel = selectedOf(filters, fd.key);
        const isOpen = open === fd.key;
        return (
          <li key={fd.key}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : fd.key)}
              className={cn(popupOption, 'gap-2')}
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
              <span className="flex-1">{fd.label}</span>
              {sel.length > 0 && <span className="rounded bg-primary/15 px-1 text-xs text-primary">{sel.length}</span>}
            </button>
            {isOpen && (
              <div className="pb-1 pl-5">
                <FilterValueList label={fd.label} options={optionsFor(options, fd.key)} selected={sel} onChange={(next) => set(fd.key, next)} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The Trades filters in the scope bar (E.3): Find, a chip per active field (`Strategy: Breakout ×`, the body reopens
 * its values) and `+ Filter`. Beyond two chips, and on phones, they fold into `Filters n` — never a second row or a
 * sideways scroll (R-fe-app-001 / 008).
 */
export function FilterBar({ filters, options, onChange, onFind, findRef, isMobile, sheetExtra, openField }: FilterBarProps) {
  const [sheet, setSheet] = useState(false);
  const [panel, setPanel] = useState(false);
  const [panelField, setPanelField] = useState<FilterFieldKey | null>(null);
  useEffect(() => {
    if (!openField) return;
    setPanelField(openField.key);
    if (isMobile) setSheet(true);
    else setPanel(true);
  }, [openField, isMobile]);
  const active = FIELDS.filter((fd) => selectedOf(filters, fd.key).length > 0);
  const folded = isMobile || active.length > MAX_INLINE_CHIPS;
  const clearField = (key: FilterFieldKey) => onChange(key === 'result' ? { result: '' } : ({ [key]: [] } as Partial<TradeFilters>));

  if (isMobile) {
    return (
      <>
        <Button type="button" variant="outline" size="sm" className="ml-auto h-7 shrink-0 gap-1.5 font-normal [@media(pointer:coarse)]:h-11" onClick={() => setSheet(true)}>
          <ListFilter className="h-3.5 w-3.5" aria-hidden="true" /> Filters{active.length + (filters.q.trim() ? 1 : 0) > 0 && <span className="rounded bg-primary/15 px-1 text-xs text-primary">{active.length + (filters.q.trim() ? 1 : 0)}</span>}
        </Button>
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription className="sr-only">Find trades and narrow the list by field.</SheetDescription>
            <div className="mt-3 space-y-3">
              <FindField value={filters.q} onChange={onFind} ref={findRef} className="basis-auto" />
              <FieldPanel key={panelField ?? 'none'} filters={filters} options={options} onChange={onChange} initialOpen={panelField} />
              {typeof sheetExtra === 'function' ? sheetExtra(() => setSheet(false)) : sheetExtra}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      <FindField value={filters.q} onChange={onFind} ref={findRef} className="max-w-56" />
      {!folded &&
        active.map((fd) => {
          const sel = selectedOf(filters, fd.key);
          const opts = optionsFor(options, fd.key);
          return (
            <span key={fd.key} className="inline-flex h-7 shrink-0 items-center rounded-md border border-border-strong text-13">
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="max-w-[200px] truncate rounded-l-md px-2 hover:bg-secondary" aria-label={`${fd.label}: ${valuesLabel(opts, sel)}. Change`}>
                    <span className="text-muted-foreground">{fd.label}:</span> {valuesLabel(opts, sel)}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" aria-label={`${fd.label} filter`} className="w-64 p-2">
                  <FilterValueList label={fd.label} options={opts} selected={sel} onChange={(next) => (fd.key === 'result' ? onChange({ result: (next[next.length - 1] ?? '') as TradeFilters['result'] }) : onChange({ [fd.key]: next } as Partial<TradeFilters>))} />
                </PopoverContent>
              </Popover>
              <button type="button" onClick={() => clearField(fd.key)} className="flex h-full items-center rounded-r-md px-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Remove filter ${fd.label}`}>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          );
        })}
      <Popover open={panel} onOpenChange={setPanel}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 font-normal text-muted-foreground">
            {folded ? <ListFilter className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            {folded ? 'Filters' : 'Filter'}
            {folded && <span className="rounded bg-primary/15 px-1 text-xs text-primary">{active.length}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" aria-label="Filters" className="w-72 p-2">
          <FieldPanel key={panelField ?? 'none'} filters={filters} options={options} onChange={onChange} initialOpen={panelField} />
        </PopoverContent>
      </Popover>
    </>
  );
}
