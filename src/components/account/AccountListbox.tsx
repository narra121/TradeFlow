import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { popupItem } from '@/components/ui/popup';
import { cn } from '@/lib/utils';

export interface AccountOption {
  id: string;
  name: string;
  currency?: string;
  /** Second line under the name, e.g. broker and type. */
  meta?: string;
  /** State shown beside the name, e.g. `Inactive`. */
  tag?: string;
  /** Set = the row is listed but cannot be picked; the text says why. */
  disabledReason?: string;
}

/** The search field appears once the list is longer than this. */
export const ACCOUNT_SEARCH_FROM = 8;

interface AccountListboxProps {
  /** Accessible name of the list. */
  label: string;
  accounts: AccountOption[];
  selected: string[];
  /** Several rows can be on; the list stays open after a pick. */
  multiple?: boolean;
  /**
   * Multi only: at most this many rows can be on. The chosen rows then stay fixed at the top of the list (with an
   * empty slot per choice still open) and the rest cannot be picked until one is unticked. The list needs a
   * background (`listClassName`) so the fixed rows cover what scrolls under them.
   */
  max?: number;
  /** Heading of the fixed rows when `max` is set. */
  selectedLabel?: string;
  onToggle: (id: string, on: boolean) => void;
  emptyText?: string;
  className?: string;
  /** Height and frame of the scrolling list. */
  listClassName?: string;
}

const matches = (a: AccountOption, q: string) =>
  !q || [a.name, a.currency, a.meta, a.tag].some((v) => v?.toLowerCase().includes(q));

/**
 * The one account list: type to filter, a bounded scrolling list, selected rows first. Arrow keys, Home and End
 * move; Enter (or Space on the list) picks. Used inline (writable accounts) and inside popovers (`AccountPicker`,
 * `AccountSelect`).
 */
export function AccountListbox({ label, accounts, selected, multiple = false, max, selectedLabel = 'Selected', onToggle, emptyText, className, listClassName }: AccountListboxProps) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  // Without a limit the order is fixed while the list is open, so rows do not jump as they are ticked.
  const [selectedAtOpen] = useState(selected);
  const listId = useId();
  const list = useRef<HTMLDivElement>(null);
  const pinnedBox = useRef<HTMLDivElement>(null);
  const searchable = accounts.length >= ACCOUNT_SEARCH_FROM;
  const limit = multiple ? max : undefined;
  const pinned = limit !== undefined;
  const q = query.trim().toLowerCase();
  const full = limit !== undefined && selected.length >= limit;

  const { top, rest } = useMemo(() => {
    const first = new Set(pinned ? selected : selectedAtOpen);
    const chosen = accounts.filter((a) => first.has(a.id));
    const others = accounts.filter((a) => !first.has(a.id) && matches(a, q));
    return pinned ? { top: chosen, rest: others } : { top: [], rest: [...chosen.filter((a) => matches(a, q)), ...others] };
  }, [accounts, selected, selectedAtOpen, pinned, q]);
  const rows = useMemo(() => [...top, ...rest], [top, rest]);

  const blocked = (a: AccountOption) => !!a.disabledReason || (full && !selected.includes(a.id));
  const active = rows.find((a) => a.id === activeId) ?? (q ? rest.find((a) => !blocked(a)) : undefined);
  const optionId = (id: string) => `${listId}-${id}`;

  const reveal = (id: string) => {
    const box = list.current;
    const el = document.getElementById(optionId(id));
    if (!box || !el || pinnedBox.current?.contains(el)) return;
    const head = pinnedBox.current?.offsetHeight ?? 0;
    const y = el.offsetTop;
    if (y < box.scrollTop + head) box.scrollTop = y - head;
    else if (y + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = y + el.offsetHeight - box.clientHeight;
  };

  const toggle = (a: AccountOption) => {
    if (blocked(a)) return;
    setActiveId(a.id);
    onToggle(a.id, multiple ? !selected.includes(a.id) : true);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const at = active ? rows.indexOf(active) : -1;
    const go = (i: number) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, i))];
      if (!next) return;
      e.preventDefault();
      setActiveId(next.id);
      reveal(next.id);
    };
    const inField = e.target instanceof HTMLInputElement;
    if (e.key === 'ArrowDown') go(at + 1);
    else if (e.key === 'ArrowUp') go(at < 0 ? rows.length - 1 : at - 1);
    else if (e.key === 'Home' && !inField) go(0);
    else if (e.key === 'End' && !inField) go(rows.length - 1);
    else if ((e.key === 'Enter' || (e.key === ' ' && !inField)) && active) {
      e.preventDefault();
      toggle(active);
    }
  };

  const option = (a: AccountOption) => {
    const on = selected.includes(a.id);
    const off = blocked(a);
    return (
      <div
        key={a.id}
        id={optionId(a.id)}
        role="option"
        aria-selected={on}
        aria-disabled={off || undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggle(a)}
        className={cn(
          popupItem,
          'gap-2',
          // `bg-secondary` is `popupHighlight` (ui/popup.ts), spelled out so Tailwind sees the variant classes.
          off ? 'cursor-not-allowed text-foreground-faint' : 'cursor-pointer hover:bg-secondary',
          active?.id === a.id && 'group-focus-within/accounts:bg-secondary',
        )}
      >
        {multiple && (
          <span aria-hidden="true" className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input', on && 'border-primary bg-primary text-primary-foreground', off && 'opacity-50')}>
            {on && <Check className="h-3 w-3" />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate" title={a.name}>{a.name}</span>
          {a.meta && <span className={cn('block truncate text-xs', !off && 'text-muted-foreground')}>{a.meta}</span>}
        </span>
        {(a.disabledReason || a.tag) && <span className={cn('shrink-0 text-xs', !off && 'text-muted-foreground')}>{a.disabledReason ?? a.tag}</span>}
        {a.currency && <span className={cn('shrink-0 font-mono text-xs', !off && 'text-muted-foreground')}>{a.currency}</span>}
        {!multiple && <Check aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-primary', !on && 'invisible')} />}
      </div>
    );
  };

  return (
    <div className={cn('group/accounts', className)} onKeyDown={onKeyDown}>
      {searchable && (
        <div className="relative mb-1.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveId(null);
              if (list.current) list.current.scrollTop = 0;
            }}
            placeholder={`Search ${accounts.length} accounts…`}
            aria-label="Search accounts"
            aria-controls={listId}
            aria-activedescendant={active ? optionId(active.id) : undefined}
            autoComplete="off"
            className="h-8 pl-8 max-md:h-11 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      )}
      <div
        ref={list}
        id={listId}
        role="listbox"
        aria-label={label}
        aria-multiselectable={multiple || undefined}
        aria-activedescendant={active ? optionId(active.id) : undefined}
        tabIndex={0}
        className={cn('relative max-h-64 overflow-y-auto overscroll-contain', listClassName)}
      >
        {limit !== undefined && (
          <div ref={pinnedBox} role="group" aria-label={selectedLabel} className="sticky top-0 z-sticky space-y-0.5 border-b border-border bg-[inherit] p-1">
            <div className="px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {selectedLabel} · {selected.length} of {limit}
            </div>
            {top.map(option)}
            {Array.from({ length: Math.max(0, limit - top.length) }, (_, i) => (
              <div key={i} aria-hidden="true" className="flex min-h-8 items-center rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground">
                Empty — pick an account below
              </div>
            ))}
          </div>
        )}
        <div role="group" aria-label={pinned ? 'Other accounts' : label} className={cn('space-y-0.5', pinned && 'p-1')}>
          {rest.map(option)}
          {rest.length === 0 && (
            <div className="px-2 py-3 text-13 text-muted-foreground">
              {q ? `No ${top.length > 0 ? 'other ' : ''}account matches “${query.trim()}”.` : accounts.length === 0 ? emptyText ?? 'No accounts yet.' : 'Every account is chosen.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
