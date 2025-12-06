import { useState, useEffect } from 'react';
import { AccountCard } from '@/components/account/AccountCard';
import { AddAccountModal } from '@/components/account/AddAccountModal';
import { Button } from '@/components/ui/button';
import { TradingAccount, AccountStatus } from '@/types/trade';
import { Plus, Building2, AlertTriangle, Loader2 } from 'lucide-react';
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
import { 
  fetchAccounts, 
  createAccount, 
  updateAccount as updateAccountAction, 
  deleteAccount as deleteAccountAction,
  updateAccountStatus as updateAccountStatusAction,
  setSelectedAccountId 
} from '@/store/slices/accountsSlice';

export function AccountsView() {
  const dispatch = useAppDispatch();
  const { accounts, selectedAccountId, loading } = useAppSelector((state) => state.accounts);
  
  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDeleteConfirm = async () => {
    if (deletingAccountId) {
      setIsDeleting(true);
      await dispatch(deleteAccountAction(deletingAccountId)).unwrap();
      setDeletingAccountId(null);
      setIsDeleting(false);
    }
  };

  const handleAddAccount = async (account: Omit<TradingAccount, 'id' | 'createdAt'>) => {
    setIsSaving(true);
    try {
      if (editingAccount) {
        await dispatch(updateAccountAction({ id: editingAccount.id, data: account })).unwrap();
        setEditingAccount(null);
      } else {
        await dispatch(createAccount(account)).unwrap();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (account: TradingAccount) => {
    setEditingAccount(account);
    setIsAddModalOpen(true);
  };

  const handleStatusChange = (id: string, status: AccountStatus) => {
    dispatch(updateAccountStatusAction({ id, status }));
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalPnl = accounts.reduce((sum, acc) => sum + (acc.balance - acc.initialBalance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your trading accounts</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="w-5 h-5" />
          Add Account
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Total Accounts</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{accounts.length}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Combined Balance</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            ${totalBalance.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Total P&L</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isSelected={selectedAccountId === account.id}
            onSelect={() => dispatch(setSelectedAccountId(selectedAccountId === account.id ? null : account.id))}
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
              onClick={handleDeleteConfirm} 
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
