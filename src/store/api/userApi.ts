/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { api } from './baseApi';
import type {
  UserProfile,
  UpdateProfilePayload,
  UpdatePreferencesPayload,
  UpdateNotificationsPayload,
} from '@/lib/api';
import type { PlanResponse } from '@/lib/api/stripe';

export const userApi = api.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    getProfile: builder.query<UserProfile['user'], void>({
      query: () => '/user/profile',
      transformResponse: (response: any) => {
        const user = response.user;
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
  useGetPlansQuery,
} = userApi;
