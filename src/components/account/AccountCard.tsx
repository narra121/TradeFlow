import { cn } from '@/lib/utils';
import { TradingAccount } from '@/types/trade';
import { accountTypeLabels, accountStatusLabels, accountStatusColors } from '@/hooks/useAccounts';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building2, MoreVertical, Pencil, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { AccountStatus } from '@/types/trade';

interface AccountCardProps {
  account: TradingAccount;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: AccountStatus) => void;
}

export function AccountCard({ 
  account, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  onStatusChange 
}: AccountCardProps) {
  const pnl = account.balance - account.initialBalance;
  const pnlPercent = ((pnl / account.initialBalance) * 100).toFixed(2);
  const isProfitable = pnl >= 0;

  return (
    <div 
      onClick={onSelect}
      className={cn(
        "glass-card p-4 cursor-pointer transition-all hover:border-primary/30",
        isSelected && "border-primary ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{account.name}</h3>
            <p className="text-xs text-muted-foreground">{account.broker}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase",
            accountStatusColors[account.status]
          )}>
            {accountStatusLabels[account.status]}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusChange('active')}>
                <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                Mark Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('breached')}>
                <XCircle className="w-4 h-4 mr-2 text-destructive" />
                Mark Breached
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('passed')}>
                <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                Mark Passed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('withdrawn')}>
                <DollarSign className="w-4 h-4 mr-2 text-warning" />
                Mark Withdrawn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('inactive')}>
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                Mark Inactive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{accountTypeLabels[account.type]}</p>
          <p className="text-lg font-bold font-mono text-foreground">
            {account.currency} {account.balance.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">P&L</p>
          <p className={cn(
            "text-sm font-semibold font-mono",
            isProfitable ? "text-success" : "text-destructive"
          )}>
            {isProfitable ? '+' : ''}{account.currency} {pnl.toLocaleString()} ({pnlPercent}%)
          </p>
        </div>
      </div>
    </div>
  );
}
