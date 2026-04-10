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
        "glass-card p-3 sm:p-4 cursor-pointer transition-all hover:border-primary/30",
        isSelected && "border-primary ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{account.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{account.broker}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className={cn(
            "text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border font-medium uppercase whitespace-nowrap hidden sm:inline-block",
            accountStatusColors[account.status]
          )}>
            {accountStatusLabels[account.status]}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onEdit} className="min-h-[44px] sm:min-h-0">
                <Pencil className="w-4 h-4 mr-2" />
                Edit Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusChange('active')} className="min-h-[44px] sm:min-h-0">
                <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                Mark Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('breached')} className="min-h-[44px] sm:min-h-0">
                <XCircle className="w-4 h-4 mr-2 text-destructive" />
                Mark Breached
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('passed')} className="min-h-[44px] sm:min-h-0">
                <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                Mark Passed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('withdrawn')} className="min-h-[44px] sm:min-h-0">
                <DollarSign className="w-4 h-4 mr-2 text-warning" />
                Mark Withdrawn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('inactive')} className="min-h-[44px] sm:min-h-0">
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                Mark Inactive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive min-h-[44px] sm:min-h-0">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status badge shown below header on very small screens */}
      <div className="mb-2 sm:hidden">
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase",
          accountStatusColors[account.status]
        )}>
          {accountStatusLabels[account.status]}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{accountTypeLabels[account.type]}</p>
          <p className="text-base sm:text-lg font-bold font-mono text-foreground truncate">
            {account.currency} {account.balance.toLocaleString()}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground mb-1">P&L</p>
          <p className={cn(
            "text-xs sm:text-sm font-semibold font-mono whitespace-nowrap",
            isProfitable ? "text-success" : "text-destructive"
          )}>
            {isProfitable ? '+' : ''}{account.currency} {pnl.toLocaleString()} ({pnlPercent}%)
          </p>
        </div>
      </div>
    </div>
  );
}
