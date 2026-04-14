import { api } from './baseApi';
import type {
  UserProfile,
  UpdateProfilePayload,
  UpdatePreferencesPayload,
  UpdateNotificationsPayload,
  Subscription,
  UserCreateSubscriptionPayload,
} from '@/lib/api';
import type { PlanResponse } from '@/lib/api/stripe';

export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<UserProfile['user'], void>({
      query: () => '/user/profile',
      transformResponse: (response: any) => {
        const user = response.user;
        if (response?._apiMessage) {
             Object.defineProperty(user, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return user;
      },
      providesTags: ['User'],
      keepUnusedDataFor: 300,
    }),

    updateProfile: builder.mutation<UserProfile['user'], UpdateProfilePayload>({
      query: (payload) => ({
        url: '/user/profile',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),
    
    updatePreferences: builder.mutation<UserProfile['user'], UpdatePreferencesPayload>({
      query: (payload) => ({
        url: '/user/preferences',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),
    
    updateNotifications: builder.mutation<UserProfile['user'], UpdateNotificationsPayload>({
      query: (payload) => ({
        url: '/user/notifications',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),
    
    getSubscription: builder.query<Subscription | null, void>({
      query: () => '/subscriptions',
      transformResponse: (response: any) => {
        // Backend returns { subscription: {...} | null, status: '...' } in the data envelope
        // baseApi unwraps the envelope, so response = { subscription, status }
        const subscription = response?.subscription ?? response;

        // No subscription found
        if (!subscription || subscription.status === 'none') {
          return null;
        }

        if (response?._apiMessage && subscription && typeof subscription === 'object') {
             Object.defineProperty(subscription, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return subscription;
      },
      providesTags: ['Subscription'],
      keepUnusedDataFor: 300,
    }),

    createSubscription: builder.mutation<Subscription, UserCreateSubscriptionPayload>({
      query: (payload) => ({
        url: '/subscriptions',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Subscription'],
    }),
    
    cancelSubscription: builder.mutation<void, { cancelAtCycleEnd?: boolean }>({
      query: (payload = {}) => ({
        url: '/subscriptions',
        method: 'DELETE',
        body: payload,
      }),
      invalidatesTags: ['Subscription'],
    }),
    
    pauseSubscription: builder.mutation<void, { pauseAt?: string | number }>({
      query: (payload) => ({
        url: '/subscriptions',
        method: 'PUT',
        body: { action: 'pause', ...payload },
      }),
      invalidatesTags: ['Subscription'],
    }),
    
    resumeSubscription: builder.mutation<void, { resumeAt?: string | number }>({
      query: (payload) => ({
        url: '/subscriptions',
        method: 'PUT',
        body: { action: 'resume', ...payload },
      }),
      invalidatesTags: ['Subscription'],
    }),
    
    undoCancellation: builder.mutation<void, void>({
      query: () => ({
        url: '/subscriptions',
        method: 'PATCH',
        body: { action: 'undo_cancellation' },
      }),
      invalidatesTags: ['Subscription'],
    }),
    
    verifyCheckoutSession: builder.mutation<{ status: string; subscriptionId?: string; message: string }, string>({
      query: (sessionId) => `/subscriptions/verify?session_id=${sessionId}`,
      invalidatesTags: ['Subscription'],
    }),

    getPlans: builder.query<PlanResponse[], string | void>({
      query: (currency) => `/subscriptions/plans${currency ? `?currency=${currency}` : ''}`,
      transformResponse: (response: any) => {
        return response.plans || [];
      },
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useUpdateNotificationsMutation,
  useGetSubscriptionQuery,
  useCreateSubscriptionMutation,
  useCancelSubscriptionMutation,
  usePauseSubscriptionMutation,
  useResumeSubscriptionMutation,
  useUndoCancellationMutation,
  useVerifyCheckoutSessionMutation,
  useGetPlansQuery,
} = userApi;
