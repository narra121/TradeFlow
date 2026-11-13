import type { BillingUrlResponse, CheckoutRequest, EntitlementsResponse } from '@/types/entitlements';
import { api } from './baseApi';

const apiWithTags = api.enhanceEndpoints({ addTagTypes: ['Entitlements'] });

export const billingApi = apiWithTags.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    getEntitlements: builder.query<EntitlementsResponse, void>({
      query: () => '/me/entitlements',
      providesTags: ['Entitlements'],
    }),

    /** Returns a Stripe Checkout URL; the caller redirects to it. */
    createCheckout: builder.mutation<BillingUrlResponse, CheckoutRequest>({
      query: (body) => ({ url: '/billing/checkout', method: 'POST', body }),
    }),

    /** Free users above the account limit choose which (at most 2) accounts stay writable. */
    saveWritableAccounts: builder.mutation<{ writableAccountIds: string[] }, string[]>({
      query: (accountIds) => ({ url: '/me/writable-accounts', method: 'PUT', body: { accountIds } }),
      invalidatesTags: ['Entitlements'],
    }),

    /** Returns a Stripe Customer Portal URL (manage card, cancel, invoices). */
    openPortal: builder.mutation<BillingUrlResponse, void>({
      query: () => ({ url: '/billing/portal', method: 'POST' }),
    }),
  }),
});

export const { useGetEntitlementsQuery, useCreateCheckoutMutation, useOpenPortalMutation, useSaveWritableAccountsMutation } = billingApi;
