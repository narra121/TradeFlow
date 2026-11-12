import { api } from './baseApi';

/** `GET /v1/auth/export` payload (B-082). Only the fields the UI reads are typed. */
export interface AccountExport {
  exportVersion: number;
  exportedAt: string;
  [section: string]: unknown;
}

export const profileApi = api.injectEndpoints({
  endpoints: (builder) => ({
    exportMyData: builder.mutation<AccountExport, void>({
      query: () => ({ url: '/auth/export', method: 'GET' }),
    }),

    /** Removes the Cognito user last (B-083); the caller clears local state afterwards. */
    deleteAccount: builder.mutation<void, void>({
      query: () => ({ url: '/auth/account', method: 'DELETE' }),
    }),

    /** Cognito global sign-out (B-084): every refresh token for the user is revoked, this device included. */
    logoutAllDevices: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout-all', method: 'POST' }),
    }),
  }),
});

export const { useExportMyDataMutation, useDeleteAccountMutation, useLogoutAllDevicesMutation } = profileApi;
