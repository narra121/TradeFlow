import { api } from './baseApi';

/** `GET /v1/auth/export` payload (B-082). Only the fields the UI reads are typed. */
export interface AccountExport {
  exportVersion: number;
  exportedAt: string;
  [section: string]: unknown;
}

export const profileApi = api.injectEndpoints({
  // Endpoint names are shared by every slice on `api`; without 'throw' RTK silently keeps the first definition of a duplicate.
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    exportMyData: builder.mutation<AccountExport, void>({
      query: () => ({ url: '/auth/export', method: 'GET' }),
    }),

    /** Removes the Cognito user last (B-083); the caller clears local state afterwards. `deleteAccount` is the trading-account endpoint. */
    deleteUserAccount: builder.mutation<void, void>({
      query: () => ({ url: '/auth/account', method: 'DELETE' }),
    }),
  }),
});

export const { useExportMyDataMutation, useDeleteUserAccountMutation } = profileApi;
