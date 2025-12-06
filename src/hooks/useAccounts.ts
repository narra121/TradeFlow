import { useState, useCallback } from 'react';
import { TradingAccount, AccountStatus, AccountType } from '@/types/trade';

const defaultAccounts: TradingAccount[] = [
  {
    id: '1',
    name: 'FTMO Challenge',
    broker: 'FTMO',
    type: 'prop_challenge',
    status: 'active',
    balance: 102500,
    initialBalance: 100000,
    currency: 'USD',
    createdAt: new Date('2024-11-01'),
    notes: '$100k challenge account',
  },
  {
    id: '2',
    name: 'Personal Account',
    broker: 'IC Markets',
    type: 'personal',
    status: 'active',
    balance: 5200,
    initialBalance: 5000,
    currency: 'USD',
    createdAt: new Date('2024-06-15'),
  },
];

let globalAccounts = [...defaultAccounts];
let globalSelectedAccountId: string | null = null;
let listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export function useAccounts() {
  const [accounts, setAccounts] = useState<TradingAccount[]>(globalAccounts);
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(globalSelectedAccountId);

  useState(() => {
    const listener = () => {
      setAccounts([...globalAccounts]);
      setSelectedAccountIdState(globalSelectedAccountId);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  });

  const addAccount = useCallback((account: Omit<TradingAccount, 'id' | 'createdAt'>) => {
    const newAccount: TradingAccount = {
      ...account,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    globalAccounts = [...globalAccounts, newAccount];
    setAccounts(globalAccounts);
    notifyListeners();
    return newAccount;
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<TradingAccount>) => {
    globalAccounts = globalAccounts.map(acc => 
      acc.id === id ? { ...acc, ...updates } : acc
    );
    setAccounts(globalAccounts);
    notifyListeners();
  }, []);

  const updateAccountStatus = useCallback((id: string, status: AccountStatus) => {
    globalAccounts = globalAccounts.map(acc => 
      acc.id === id ? { ...acc, status } : acc
    );
    setAccounts(globalAccounts);
    notifyListeners();
  }, []);

  const deleteAccount = useCallback((id: string) => {
    globalAccounts = globalAccounts.filter(acc => acc.id !== id);
    if (globalSelectedAccountId === id) {
      globalSelectedAccountId = null;
    }
    setAccounts(globalAccounts);
    setSelectedAccountIdState(globalSelectedAccountId);
    notifyListeners();
  }, []);

  const setSelectedAccountId = useCallback((id: string | null) => {
    globalSelectedAccountId = id;
    setSelectedAccountIdState(id);
    notifyListeners();
  }, []);

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId) || null;

  return {
    accounts,
    selectedAccountId,
    selectedAccount,
    setSelectedAccountId,
    addAccount,
    updateAccount,
    updateAccountStatus,
    deleteAccount,
  };
}

export const accountTypeLabels: Record<AccountType, string> = {
  prop_challenge: 'Prop Challenge',
  prop_funded: 'Funded Account',
  personal: 'Personal',
  demo: 'Demo',
};

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: 'Active',
  breached: 'Breached',
  passed: 'Passed',
  withdrawn: 'Withdrawn',
  inactive: 'Inactive',
};

export const accountStatusColors: Record<AccountStatus, string> = {
  active: 'bg-success/10 text-success border-success/20',
  breached: 'bg-destructive/10 text-destructive border-destructive/20',
  passed: 'bg-primary/10 text-primary border-primary/20',
  withdrawn: 'bg-warning/10 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};
