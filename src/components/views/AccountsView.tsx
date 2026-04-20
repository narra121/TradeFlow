import { useState, useMemo } from 'react';
import { AccountCard } from '@/components/account/AccountCard';
import { AddAccountModal } from '@/components/account/AddAccountModal';
import { Button } from '@/components/ui/button';
import { TradingAccount, AccountStatus } from '@/types/trade';
import { Plus, Building2, AlertTriangle, Loader2 } from 'lucide-react';
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
    () => accountsData?.totalBalance ?? accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accountsData?.totalBalance, accounts]
  );
  const totalPnl = useMemo(
    () => accountsData?.totalPnl ?? accounts.reduce((sum, acc) => sum + (acc.balance - acc.initialBalance), 0),
    [accountsData?.totalPnl, accounts]
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
            <p className="text-xl sm:text-2xl font-bold font-mono text-foreground">{accounts.length}</p>
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
          {accounts.map((account) => (
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
