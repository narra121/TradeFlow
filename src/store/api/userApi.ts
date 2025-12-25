import { api } from './baseApi';
import type {
  UserProfile,
  UpdateProfilePayload,
  UpdatePreferencesPayload,
  UpdateNotificationsPayload,
  Subscription,
  UserCreateSubscriptionPayload,
  SavedOptions,
  AddOptionPayload
} from '@/lib/api';

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
    
    getSubscription: builder.query<Subscription, void>({
      query: () => '/subscriptions',
      transformResponse: (response: any) => {
        // Backend returns the subscription object directly in the data envelope
        // baseApi unwraps the envelope, so response IS the subscription object
        const subscription = response;
        
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
    }),
    
    createSubscription: builder.mutation<{ subscription: Subscription }, UserCreateSubscriptionPayload>({
      query: (payload) => ({
        url: '/subscriptions',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Subscription'],
    }),
    
    cancelSubscription: builder.mutation<void, void>({
      query: () => ({
        url: '/subscriptions',
        method: 'DELETE',
      }),
      invalidatesTags: ['Subscription'],
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
} = userApi;
