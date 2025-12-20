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
      transformResponse: (response: any) => response.user,
      providesTags: ['User'],
    }),
    
    updateProfile: builder.mutation<UserProfile['user'], UpdateProfilePayload>({
      query: (payload) => ({
        url: '/user/profile',
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => response.user,
      invalidatesTags: ['User'],
    }),
    
    updatePreferences: builder.mutation<UserProfile['user'], UpdatePreferencesPayload>({
      query: (payload) => ({
        url: '/user/preferences',
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => response.user,
      invalidatesTags: ['User'],
    }),
    
    updateNotifications: builder.mutation<UserProfile['user'], UpdateNotificationsPayload>({
      query: (payload) => ({
        url: '/user/notifications',
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => response.user,
      invalidatesTags: ['User'],
    }),
    
    getSubscription: builder.query<Subscription, void>({
      query: () => '/subscriptions',
      transformResponse: (response: any) => response.subscription,
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
    
    getSavedOptions: builder.query<SavedOptions, void>({
      query: () => '/saved-options',
      providesTags: ['SavedOptions'],
    }),
    
    addOption: builder.mutation<SavedOptions, { category: string; payload: AddOptionPayload }>({
      query: ({ category, payload }) => ({
        url: `/saved-options/${category}`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['SavedOptions'],
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
  useGetSavedOptionsQuery,
  useAddOptionMutation,
} = userApi;
