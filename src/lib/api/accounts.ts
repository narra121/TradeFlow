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
    return apiClient.get('/accounts');
  },

  // POST /v1/accounts
  createAccount: async (payload: CreateAccountPayload): Promise<{ account: TradingAccount }> => {
    return apiClient.post('/accounts', payload);
  },

  // PUT /v1/accounts/:id
  updateAccount: async (id: string, payload: Partial<CreateAccountPayload>): Promise<{ account: TradingAccount }> => {
    return apiClient.put(`/accounts/${id}`, payload);
  },

  // PATCH /v1/accounts/:id/status
  updateAccountStatus: async (id: string, status: AccountStatus): Promise<{ account: TradingAccount }> => {
    return apiClient.patch(`/accounts/${id}/status`, { status });
  },

  // DELETE /v1/accounts/:id
  deleteAccount: async (id: string): Promise<void> => {
    return apiClient.delete(`/accounts/${id}`);
  },
};
