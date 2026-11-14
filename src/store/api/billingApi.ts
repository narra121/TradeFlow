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

    /** Back from Checkout: stores the paid subscription from Stripe without waiting for the webhook, then refetches the plan. */
    verifyCheckout: builder.mutation<{ status: 'active' | 'pending' | 'expired' }, string>({
      query: (sessionId) => ({ url: `/subscriptions/verify?session_id=${encodeURIComponent(sessionId)}`, method: 'GET' }),
      invalidatesTags: ['Entitlements'],
    }),

    /** Returns a Stripe Customer Portal URL (manage card, cancel, invoices). */
    openPortal: builder.mutation<BillingUrlResponse, void>({
      query: () => ({ url: '/billing/portal', method: 'POST' }),
    }),
  }),
});

export const { useGetEntitlementsQuery, useCreateCheckoutMutation, useOpenPortalMutation, useVerifyCheckoutMutation } = billingApi;
