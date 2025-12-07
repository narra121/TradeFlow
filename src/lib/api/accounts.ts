import apiClient from './api';
import { TradingAccount, AccountStatus } from '@/types/trade';

export interface CreateAccountPayload {
  name: string;
  broker: string;
  type: 'prop_challenge' | 'prop_funded' | 'personal' | 'demo';
  status: AccountStatus;
  balance: number;
  initialBalance: number;
  currency: string;
  notes?: string;
}

export interface AccountsResponse {
  accounts: TradingAccount[];
  totalBalance?: number;
  totalPnl?: number;
}

export const accountsApi = {
  // GET /v1/accounts
  getAccounts: async (): Promise<AccountsResponse> => {
    const response = await apiClient.get('/accounts');
    // Map accountId to id for frontend compatibility
    const accounts = response.accounts.map((account: any) => ({
      ...account,
      id: account.accountId,
      createdAt: new Date(account.createdAt)
    }));
    return {
      accounts,
      totalBalance: response.totalBalance,
      totalPnl: response.totalPnl
    };
  },

  // POST /v1/accounts
  createAccount: async (payload: CreateAccountPayload): Promise<{ account: TradingAccount }> => {
    const response = await apiClient.post('/accounts', payload);
    // Map accountId to id
    const account = {
      ...response.account,
      id: response.account.accountId,
      createdAt: new Date(response.account.createdAt)
    };
    return { account };
  },

  // PUT /v1/accounts/:id
  updateAccount: async (id: string, payload: Partial<CreateAccountPayload>): Promise<{ account: TradingAccount }> => {
    const response = await apiClient.put(`/accounts/${id}`, payload);
    // Map accountId to id
    const account = {
      ...response.account,
      id: response.account.accountId,
      createdAt: new Date(response.account.createdAt)
    };
    return { account };
  },

  // PATCH /v1/accounts/:id/status
  updateAccountStatus: async (id: string, status: AccountStatus): Promise<{ account: TradingAccount }> => {
    const response = await apiClient.patch(`/accounts/${id}/status`, { status });
    // Map accountId to id
    const account = {
      ...response.account,
      id: response.account.accountId,
      createdAt: new Date(response.account.createdAt)
    };
    return { account };
  },

  // DELETE /v1/accounts/:id
  deleteAccount: async (id: string): Promise<void> => {
    return apiClient.delete(`/accounts/${id}`);
  },
};
