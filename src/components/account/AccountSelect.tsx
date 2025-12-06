import { cn } from '@/lib/utils';
import { TradingAccount } from '@/types/trade';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { accountStatusColors, accountStatusLabels, accountTypeLabels } from '@/hooks/useAccounts';
import { Building2 } from 'lucide-react';

interface AccountSelectProps {
  accounts: TradingAccount[];
  selectedAccountIds: string[];
  onChange: (accountIds: string[]) => void;
}

export function AccountSelect({ accounts, selectedAccountIds, onChange }: AccountSelectProps) {
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

  return (
    <div className="space-y-3">
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

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {accounts.map((account) => {
          const isSelected = selectedAccountIds.includes(account.id);
          
          return (
            <label
              key={account.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                isSelected
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-secondary/30 border border-transparent hover:bg-secondary/50"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleAccount(account.id)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">{account.name}</span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full border uppercase shrink-0",
                    accountStatusColors[account.status]
                  )}>
                    {accountStatusLabels[account.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {account.broker} • {accountTypeLabels[account.type]}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          No accounts available. Add an account first.
        </div>
      )}
    </div>
  );
}
