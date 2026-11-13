import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AccountListbox, type AccountOption } from '@/components/account/AccountListbox';
import { focusAccountList } from '@/components/account/returnFocus';
import { cn } from '@/lib/utils';

interface AccountPickerProps {
  id?: string;
  /** Accessible name of the list, and of the control unless `labelledBy` names it. */
  label: string;
  /** Id of the visible label. */
  labelledBy?: string;
  accounts: AccountOption[];
  /** null = nothing chosen; the placeholder shows. */
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
  className?: string;
}

/** Choose one account from a list that stays compact with any number of accounts: type to filter, currency shown. */
export function AccountPicker({ id, label, labelledBy, accounts, value, onChange, placeholder = 'Choose an account', disabled, size = 'default', className }: AccountPickerProps) {
  const [open, setOpen] = useState(false);
  const current = accounts.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background text-left hover:border-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' ? 'h-7 px-2 text-xs [@media(pointer:coarse)]:h-11' : 'h-8 px-3 text-sm max-md:h-11',
          className,
        )}
      >
        {current ? (
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate">{current.name}</span>
            {current.currency && <span className="shrink-0 font-mono text-xs text-muted-foreground">{current.currency}</span>}
          </span>
        ) : (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent aria-label={label} align="start" className="w-80 max-w-[calc(100vw-1.5rem)] p-2" onOpenAutoFocus={focusAccountList}>
        <AccountListbox
          label={label}
          accounts={accounts}
          selected={value ? [value] : []}
          listClassName="max-h-[min(16rem,calc(var(--radix-popover-content-available-height,100vh)-4.5rem))]"
          onToggle={(next) => {
            setOpen(false);
            onChange(next);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
