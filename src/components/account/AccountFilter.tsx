import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, accountStatusColors, accountStatusLabels } from '@/hooks/useAccounts';
import { Building2, Filter } from 'lucide-react';

interface AccountFilterProps {
  className?: string;
  showLabel?: boolean;
}

export function AccountFilter({ className, showLabel = true }: AccountFilterProps) {
  const { accounts, selectedAccountId, setSelectedAccountId, selectedAccount } = useAccounts();

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
        <SelectTrigger className="w-[200px] h-9">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="All Accounts" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <span className="font-medium">All Accounts</span>
          </SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2">
                <span>{account.name}</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full border uppercase",
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
