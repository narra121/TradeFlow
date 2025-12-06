import { cn } from '@/lib/utils';
import { TradingAccount } from '@/types/trade';
import { accountStatusColors, accountStatusLabels, accountTypeLabels } from '@/hooks/useAccounts';
import { Building2, ChevronDown, Check } from 'lucide-react';
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
            "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-all text-left",
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
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border z-50" 
        align="start"
        sideOffset={4}
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button 
              type="button" 
              onClick={selectAll}
              className="hover:text-foreground transition-colors"
            >
              Select All
            </button>
            <span>•</span>
            <button 
              type="button" 
              onClick={selectNone}
              className="hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-2">
          {accounts.map((account) => {
            const isSelected = selectedAccountIds.includes(account.id);
            
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => toggleAccount(account.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all text-left",
                  "hover:bg-secondary/50"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  isSelected 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground/40"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm text-foreground">{account.name}</span>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full border uppercase shrink-0 font-medium",
                      accountStatusColors[account.status]
                    )}>
                      {accountStatusLabels[account.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {account.broker} • {accountTypeLabels[account.type]}
                  </p>
                </div>
              </button>
            );
          })}

          {accounts.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No accounts available. Add an account first.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
