import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccounts, accountStatusColors, accountStatusLabels } from '@/hooks/useAccounts';
import { Building2, Filter } from 'lucide-react';

interface AccountFilterProps {
  className?: string;
  showLabel?: boolean;
  value?: string | null;
  onValueChange?: (id: string | null) => void;
}

export function AccountFilter({ className, showLabel = true, value, onValueChange }: AccountFilterProps) {
  const { accounts, selectedAccountId: reduxAccountId, setSelectedAccountId: reduxSetId, selectedAccount: reduxSelectedAccount } = useAccounts();

  const controlled = value !== undefined;
  const selectedAccountId = controlled ? value : reduxAccountId;
  const setSelectedAccountId = controlled ? (onValueChange ?? (() => {})) : reduxSetId;
  const selectedAccount = controlled
    ? accounts.find(acc => acc.id === value) || null
    : reduxSelectedAccount;

  const triggerContent = (
    <SelectTrigger className="w-[200px] h-9">
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="truncate"><SelectValue placeholder="All Accounts" /></span>
      </div>
    </SelectTrigger>
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Account:</span>
        </div>
      )}
      <Select
        value={selectedAccountId || 'all'}
        onValueChange={(v) => setSelectedAccountId(v === 'all' ? null : v)}
      >
        {selectedAccount ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {triggerContent}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{selectedAccount.name} — {accountStatusLabels[selectedAccount.status]}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          triggerContent
        )}
        <SelectContent>
          <SelectItem value="all">
            <span className="font-medium">All Accounts</span>
          </SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2">
                <span className="truncate">{account.name}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full border uppercase shrink-0",
                  accountStatusColors[account.status]
                )}>
                  {accountStatusLabels[account.status]}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
