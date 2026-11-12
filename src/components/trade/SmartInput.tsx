import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onAddNew: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onBlur?: () => void;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

/** Type-to-filter combobox over saved values; Enter on the typed text creates it. */
export function SmartInput({
  value,
  onChange,
  suggestions,
  onAddNew,
  placeholder,
  className,
  id,
  inputRef,
  onBlur,
  ...aria
}: SmartInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const typed = value.trim();
  const filtered = useMemo(
    () => (typed ? suggestions.filter((s) => s.toLowerCase().includes(typed.toLowerCase())) : suggestions.slice(0, 8)),
    [typed, suggestions],
  );
  const showAddNew = !!typed && !suggestions.some((s) => s.toLowerCase() === typed.toLowerCase());
  const rows = [...filtered, ...(showAddNew ? [`__new__${typed}`] : [])];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => setActive(-1), [typed]);

  const pick = (row: string) => {
    if (row.startsWith('__new__')) onAddNew(typed);
    else onChange(row);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && isOpen && active >= 0) {
      e.preventDefault();
      pick(rows[active]);
    } else if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen && rows.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={cn('pr-9 font-sans', className)}
        {...aria}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show suggestions"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setIsOpen((o) => !o);
          inputRef?.current?.focus();
        }}
        className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {isOpen && rows.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-overlay">
          {rows.map((row, i) => {
            const isNew = row.startsWith('__new__');
            return (
              <li
                key={row}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(row)}
                className={cn('flex min-h-9 cursor-pointer items-center gap-2 px-3 text-sm hover:bg-muted [@media(pointer:coarse)]:min-h-11', active === i && 'bg-muted', isNew && 'border-t border-border text-primary')}
              >
                {isNew ? (
                  <>
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Create "{typed}"</span>
                  </>
                ) : (
                  <span className="truncate">{row}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
