import { useState, useMemo, useRef } from 'react';
import { AccountCard } from '@/components/account/AccountCard';
import { AddAccountModal } from '@/components/account/AddAccountModal';
import { Button } from '@/components/ui/button';
import { TradingAccount, AccountStatus, AccountType } from '@/types/trade';
import { Plus, Building2, AlertTriangle, Loader2, Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RefreshButton } from '@/components/ui/refresh-button';
import { AdSlot } from '@/components/ads/AdSlot';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedAccount } from '@/store/slices/accountsSlice';
import { useGetAccountsQuery, useCreateAccountMutation, useUpdateAccountMutation, useDeleteAccountMutation, useUpdateAccountStatusMutation } from '@/store/api';
import { AccountCardSkeleton, StatCardSkeleton } from '@/components/ui/loading-skeleton';
import { accountTypeLabels, accountStatusLabels, accountStatusColors } from '@/hooks/useAccounts';

const STATUS_FILTERS: { value: AccountStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'breached', label: 'Breached' },
  { value: 'passed', label: 'Passed' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'inactive', label: 'Inactive' },
];

export function AccountsView() {
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.accounts.selectedAccountId);
  const { data: accountsData, isLoading, isFetching, refetch } = useGetAccountsQuery();
  const showSkeleton = isLoading;
  const isRefreshing = isFetching && !isLoading;
  const [createAccount] = useCreateAccountMutation();
  const [updateAccount] = useUpdateAccountMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const [updateAccountStatus] = useUpdateAccountStatusMutation();
  
  const accounts = accountsData?.accounts || [];
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredAccounts = useMemo(() => {
    let result = accounts;
    if (statusFilter !== 'all') {
      result = result.filter(acc => acc.status === statusFilter);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(acc =>
        acc.name.toLowerCase().includes(q) ||
        acc.broker.toLowerCase().includes(q) ||
        (accountTypeLabels[acc.type as AccountType] || '').toLowerCase().includes(q) ||
        acc.currency.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchQuery, statusFilter, accounts]);

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

  const handleDeleteConfirm = async () => {
    if (deletingAccountId) {
      setIsDeleting(true);
      try {
        await deleteAccount(deletingAccountId).unwrap();
        if (selectedAccountId === deletingAccountId) {
          dispatch(setSelectedAccount(null));
        }
        setDeletingAccountId(null);
      } catch (error: any) {
        // Toast middleware handles error display
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleAddAccount = async (account: Omit<TradingAccount, 'id' | 'createdAt'>) => {
    setIsSaving(true);
    try {
      if (editingAccount) {
        if (!editingAccount.id) {
          throw new Error('Account id is missing; cannot update account');
        }
        await updateAccount({ id: editingAccount.id, payload: account }).unwrap();
        setEditingAccount(null);
      } else {
        await createAccount(account).unwrap();
      }
      setIsAddModalOpen(false);
    } catch (error) {
      // Toast middleware handles error display
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (account: TradingAccount) => {
    setEditingAccount(account);
    setIsAddModalOpen(true);
  };

  const handleStatusChange = async (id: string, status: AccountStatus) => {
    try { await updateAccountStatus({ id, status }).unwrap(); } catch { /* toast middleware handles */ }
  };

  const totalBalance = useMemo(
    () => filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0),
    [filteredAccounts]
  );
  const totalPnl = useMemo(
    () => filteredAccounts.reduce((sum, acc) => sum + (acc.balance - acc.initialBalance), 0),
    [filteredAccounts]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Accounts</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Add, edit, and monitor your trading accounts</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <RefreshButton onRefresh={refetch} isFetching={isFetching} />
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Add Account</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Search & Status Filter */}
      {!showSkeleton && accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts..."
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AccountStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((sf) => (
                <SelectItem key={sf.value} value={sf.value}>
                  <div className="flex items-center gap-2">
                    {sf.value !== 'all' && (
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        sf.value === 'active' && "bg-success",
                        sf.value === 'breached' && "bg-destructive",
                        sf.value === 'passed' && "bg-primary",
                        sf.value === 'withdrawn' && "bg-warning",
                        sf.value === 'inactive' && "bg-muted-foreground",
                      )} />
                    )}
                    <span>{sf.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground whitespace-nowrap self-center">
              {filteredAccounts.length} of {accounts.length}
            </span>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 transition-opacity duration-200", isRefreshing && "opacity-60")}>
          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Accounts</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-foreground">{filteredAccounts.length}</p>
          </div>
          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              <span className="text-xs sm:text-sm text-muted-foreground">Combined Balance</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-foreground truncate">
              ${totalBalance.toLocaleString()}
            </p>
          </div>
          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total P&L</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold font-mono truncate ${totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Building2 className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Set up your first trading account</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Create an account to start tracking your trades. You can add prop firm challenges, live accounts, or demo accounts.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsAddModalOpen(true)} size="default" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredAccounts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No accounts match your filters</p>
            </div>
          ) : filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isSelected={selectedAccountId === account.id}
              onSelect={() => dispatch(setSelectedAccount(selectedAccountId === account.id ? null : account.id))}
              onEdit={() => handleEdit(account)}
              onDelete={() => setDeletingAccountId(account.id)}
              onStatusChange={(status) => handleStatusChange(account.id, status)}
            />
          ))}

          {/* Add Account Card */}
          {!hasActiveFilters && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-card p-6 border-dashed border-2 flex flex-col items-center justify-center gap-3 min-h-[140px] hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Add New Account
              </span>
            </button>
          )}
        </div>
      )}

      <AdSlot placementId="accounts-empty-space" className="mt-6" />

      <AddAccountModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) setEditingAccount(null);
        }}
        onAddAccount={handleAddAccount}
        editAccount={editingAccount}
        isLoading={isSaving}
      />

      <AlertDialog open={!!deletingAccountId} onOpenChange={(open) => !open && setDeletingAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Deleting this account will permanently remove all trades associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
