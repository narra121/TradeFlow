import { api } from './baseApi';
import type { CreateAccountPayload } from '@/lib/api';
import type { TradingAccount, AccountStatus } from '@/types/trade';

interface AccountsResponse {
  accounts: TradingAccount[];
  totalBalance?: number;
  totalPnl?: number;
}

const normalizeAccount = (account: any): TradingAccount => {
  const id = account?.id ?? account?.accountId;
  return {
    ...account,
    id,
    createdAt: account?.createdAt,
  } as TradingAccount;
};

export const accountsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAccounts: builder.query<AccountsResponse, void>({
      query: () => '/accounts',
      transformResponse: (response: any): AccountsResponse => {
        const accounts = Array.isArray(response?.accounts)
          ? response.accounts.map(normalizeAccount)
          : [];
        const result = {
          ...response,
          accounts,
        };

        if (response?._apiMessage) {
             Object.defineProperty(result, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return result;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.accounts.map(({ id }) => ({ type: 'Accounts' as const, id })),
              { type: 'Accounts', id: 'LIST' },
            ]
          : [{ type: 'Accounts', id: 'LIST' }],
    }),
    
    createAccount: builder.mutation<TradingAccount, CreateAccountPayload>({
      query: (payload) => ({
        url: '/accounts',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: any) => {
        const account = normalizeAccount(response?.account);
        if (response?._apiMessage) {
             Object.defineProperty(account, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return account;
      },
      invalidatesTags: [{ type: 'Accounts', id: 'LIST' }],
    }),
    
    updateAccount: builder.mutation<TradingAccount, { id: string; payload: Partial<CreateAccountPayload> }>({
      query: ({ id, payload }) => ({
        url: `/accounts/${id}`,
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => {
        const account = normalizeAccount(response?.account);
        if (response?._apiMessage) {
             Object.defineProperty(account, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return account;
      },
      invalidatesTags: [], // Don't invalidate, use manual cache update
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedAccount } = await queryFulfilled;
          
          // Update the getAccounts cache
          dispatch(
            accountsApi.util.updateQueryData('getAccounts', undefined, (draft) => {
              const index = draft.accounts.findIndex((acc) => acc.id === id);
              if (index !== -1) {
                draft.accounts[index] = updatedAccount;
              }
            })
          );
        } catch {
          // Error handled by component
        }
      },
    }),
    
    updateAccountStatus: builder.mutation<TradingAccount, { id: string; status: AccountStatus }>({
      query: ({ id, status }) => ({
        url: `/accounts/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      transformResponse: (response: any) => {
        const account = normalizeAccount(response?.account);
        if (response?._apiMessage) {
             Object.defineProperty(account, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return account;
      },
      invalidatesTags: [], // Don't invalidate, use manual cache update
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedAccount } = await queryFulfilled;
          
          // Update the getAccounts cache
          dispatch(
            accountsApi.util.updateQueryData('getAccounts', undefined, (draft) => {
              const index = draft.accounts.findIndex((acc) => acc.id === id);
              if (index !== -1) {
                draft.accounts[index] = updatedAccount;
              }
            })
          );
        } catch {
          // Error handled by component
        }
      },
    }),
    
    deleteAccount: builder.mutation<{ message: string; account: TradingAccount; tradesDeleted: number; goalsDeleted: number; rulesDeleted: number }, string>({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: any) => {
        const result = {
            message: response.message || 'Account deleted successfully',
            account: normalizeAccount(response?.account),
            tradesDeleted: response.tradesDeleted || 0,
            goalsDeleted: response.goalsDeleted || 0,
            rulesDeleted: response.rulesDeleted || 0,
        };

        if (response?._apiMessage) {
             Object.defineProperty(result, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return result;
      },
      invalidatesTags: ['Stats', 'Analytics', 'Trades', 'Goals', 'Rules'], // Invalidate related data
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic delete
        const patchResult = dispatch(
          accountsApi.util.updateQueryData('getAccounts', undefined, (draft) => {
            const index = draft.accounts.findIndex((acc) => acc.id === id);
            if (index !== -1) {
              draft.accounts.splice(index, 1);
            }
          })
        );
        
        try {
          await queryFulfilled;
          // Success - optimistic update was correct, no need to refetch
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useUpdateAccountStatusMutation,
  useDeleteAccountMutation,
} = accountsApi;
