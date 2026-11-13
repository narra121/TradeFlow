import { useEffect, useId, useMemo, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { popupHighlight, popupItem } from '@/components/ui/popup';
import { cn } from '@/lib/utils';

export type PickState = 'on' | 'off' | 'mixed';

export interface PickerOption {
  value: string;
  label?: string;
  count?: number;
}

interface BasePickerProps {
  options: PickerOption[];
  label: string;
  placeholder?: string;
  /** Offers `Create "x"` for text that matches no option. */
  onCreate?: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
}

interface SinglePickerProps extends BasePickerProps {
  mode: 'single';
  value: string;
  onChange: (value: string) => void;
}

interface MultiPickerProps extends BasePickerProps {
  mode: 'multi';
  /** Current state of every value; values not listed are `off`. Mixed = some of the selected trades have it. */
  state: Record<string, PickState>;
  /** Called with the new state of one value (off → on → off; mixed → on). */
  onToggle: (value: string, next: 'on' | 'off') => void;
}

export type PickerProps = SinglePickerProps | MultiPickerProps;

/**
 * One listbox picker (E-028): single choice, or tri-state multi for bulk edits. Type to filter, arrows move,
 * Enter picks, and typed text that matches nothing can be created. The same component serves pane fields, table
 * cells, the selection bar and filter values.
 */
export function Picker(props: PickerProps) {
  const { options, label, placeholder, onCreate, className, autoFocus } = props;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => options.filter((o) => !q || (o.label ?? o.value).toLowerCase().includes(q)), [options, q]);
  const canCreate = !!onCreate && !!q && !options.some((o) => (o.label ?? o.value).toLowerCase() === q);
  const rows = [...shown.map((o) => ({ kind: 'option' as const, o })), ...(canCreate ? [{ kind: 'create' as const, o: { value: query.trim() } }] : [])];

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, listId]);

  const stateOf = (v: string): PickState => (props.mode === 'multi' ? props.state[v] ?? 'off' : props.value === v ? 'on' : 'off');

  const pick = (i: number) => {
    const row = rows[i];
    if (!row) return;
    if (row.kind === 'create') {
      onCreate?.(row.o.value);
      if (props.mode === 'multi') props.onToggle(row.o.value, 'on');
      else props.onChange(row.o.value);
      setQuery('');
      return;
    }
    if (props.mode === 'single') props.onChange(row.o.value);
    else props.onToggle(row.o.value, stateOf(row.o.value) === 'on' ? 'off' : 'on');
  };

  return (
    <div className={cn('w-64', className)}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(rows.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(active);
          }
        }}
        placeholder={placeholder ?? 'Find…'}
        aria-label={label}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={rows.length ? `${listId}-${active}` : undefined}
        autoFocus={autoFocus}
        className="mb-1 h-8"
      />
      <ul id={listId} role="listbox" aria-label={label} aria-multiselectable={props.mode === 'multi'} className="max-h-56 overflow-y-auto">
        {rows.length === 0 && <li className="px-2 py-2 text-13 text-muted-foreground">Nothing matches.</li>}
        {rows.map((r, i) => {
          const st = r.kind === 'option' ? stateOf(r.o.value) : 'off';
          return (
            <li
              key={`${r.kind}-${r.o.value}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={st === 'on'}
              aria-checked={props.mode === 'multi' ? (st === 'mixed' ? 'mixed' : st === 'on') : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(i)}
              onClick={() => pick(i)}
              className={cn(popupItem, 'cursor-pointer gap-2', active === i && popupHighlight, r.kind === 'create' && 'text-primary')}
            >
              {r.kind === 'create' ? (
                <>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Create “{r.o.value}”
                </>
              ) : (
                <>
                  {props.mode === 'multi' && (
                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input', st !== 'off' && 'border-primary bg-primary text-primary-foreground')}>
                      {st === 'on' && <Check className="h-3 w-3" aria-hidden="true" />}
                      {st === 'mixed' && <Minus className="h-3 w-3" aria-hidden="true" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{r.o.label ?? r.o.value}</span>
                  {r.o.count !== undefined && <span className="font-mono text-xs tabular-nums text-muted-foreground">{r.o.count}</span>}
                  {props.mode === 'single' && st === 'on' && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
