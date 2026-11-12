import type { AccountStatus, AccountType, TradingAccount } from '@/types/trade';

export type AccountPayload = Omit<TradingAccount, 'id' | 'createdAt'>;

export interface FormState {
  name: string;
  broker: string;
  type: AccountType;
  status: AccountStatus;
  currency: string;
  initialBalance: string;
  notes: string;
}

export type Errors = Partial<Record<'name' | 'broker' | 'initialBalance', string>>;

export const BLANK: FormState = { name: '', broker: '', type: 'personal', status: 'active', currency: 'USD', initialBalance: '', notes: '' };

export function fromAccount(a?: TradingAccount | null): FormState {
  if (!a) return BLANK;
  return {
    name: a.name,
    broker: a.broker,
    type: a.type,
    status: a.status,
    currency: a.currency || 'USD',
    initialBalance: a.initialBalance === undefined || a.initialBalance === null ? '' : String(a.initialBalance),
    notes: a.notes || '',
  };
}

/** Field rules of D.7: validate on blur and on submit, message under the field, a balance of 0 is valid. */
export function validateAccount(f: FormState): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = 'Enter an account name.';
  else if (f.name.trim().length > 100) e.name = 'Keep the name under 100 characters.';
  if (f.broker.trim().length > 100) e.broker = 'Keep the broker under 100 characters.';
  const text = f.initialBalance.trim().replace(/,/g, '');
  const n = Number(text);
  if (!text || !Number.isFinite(n) || n < 0) e.initialBalance = 'Enter the starting balance, 0 or more.';
  return e;
}

