import { cn } from '@/lib/utils';
import { TradingAccount } from '@/types/trade';
import { accountStatusLabels, accountTypeLabels } from '@/hooks/useAccounts';
import { AccountListbox } from '@/components/account/AccountListbox';
import { focusAccountList } from '@/components/account/returnFocus';
import { Building2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

interface AccountSelectProps {
  accounts: TradingAccount[];
  selectedAccountIds: string[];
  onChange: (accountIds: string[]) => void;
}

export function AccountSelect({ accounts, selectedAccountIds, onChange }: AccountSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleAccount = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onChange(selectedAccountIds.filter(id => id !== accountId));
    } else {
      onChange([...selectedAccountIds, accountId]);
    }
  };

  const selectAll = () => {
    onChange(accounts.map(acc => acc.id));
  };

  const selectNone = () => {
    onChange([]);
  };

  const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));
  const displayText = selectedAccounts.length === 0 
    ? 'Select accounts...'
    : selectedAccounts.map(acc => acc.name).join(', ');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-all text-left [@media(pointer:coarse)]:min-h-11",
            "bg-secondary/50 border-border/50 hover:border-primary/30",
            open && "border-primary/50 ring-1 ring-primary/20"
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className={cn(
              "text-sm truncate",
              selectedAccounts.length === 0 ? "text-muted-foreground" : "text-foreground"
            )}>
              {displayText}
            </span>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Accounts"
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={focusAccountList}
      >
        <div className="p-2.5 sm:p-3 border-b border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={selectAll}
              className="hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 flex items-center"
            >
              Select All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={selectNone}
              className="hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 flex items-center"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="p-1.5 sm:p-2">
          <AccountListbox
            label="Accounts"
            multiple
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              currency: a.currency,
              meta: `${a.broker} • ${accountTypeLabels[a.type]}`,
              tag: a.status === 'active' ? undefined : accountStatusLabels[a.status],
            }))}
            selected={selectedAccountIds}
            onToggle={toggleAccount}
            emptyText="No accounts available. Add an account first."
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
