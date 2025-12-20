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
        return {
          ...response,
          accounts,
        };
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
      transformResponse: (response: any) => normalizeAccount(response?.account),
      invalidatesTags: [{ type: 'Accounts', id: 'LIST' }],
    }),
    
    updateAccount: builder.mutation<TradingAccount, { id: string; payload: Partial<CreateAccountPayload> }>({
      query: ({ id, payload }) => ({
        url: `/accounts/${id}`,
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => normalizeAccount(response?.account),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Accounts', id },
        { type: 'Accounts', id: 'LIST' },
      ],
    }),
    
    updateAccountStatus: builder.mutation<TradingAccount, { id: string; status: AccountStatus }>({
      query: ({ id, status }) => ({
        url: `/accounts/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      transformResponse: (response: any) => normalizeAccount(response?.account),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Accounts', id },
        { type: 'Accounts', id: 'LIST' },
      ],
    }),
    
    deleteAccount: builder.mutation<void, string>({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Accounts', id },
        { type: 'Accounts', id: 'LIST' },
      ],
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
