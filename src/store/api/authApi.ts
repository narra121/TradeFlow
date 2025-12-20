import { api } from './baseApi';
import type { 
  LoginPayload, 
  SignupPayload, 
  ConfirmSignupPayload, 
  ForgotPasswordPayload, 
  ResetPasswordPayload, 
  AuthResponse 
} from '@/lib/api';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation<{ user: { id: string; name: string; email: string }; message: string }, SignupPayload>({
      query: (payload) => ({
        url: '/auth/signup',
        method: 'POST',
        body: payload,
      }),
    }),
    
    confirmSignup: builder.mutation<void, ConfirmSignupPayload>({
      query: (payload) => ({
        url: '/auth/confirm-signup',
        method: 'POST',
        body: payload,
      }),
    }),
    
    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (payload) => ({
        url: '/auth/login',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: any) => {
        // Backend returns IdToken, AccessToken, RefreshToken (capitalized)
        // Store tokens in localStorage
        if (response.IdToken) {
          localStorage.setItem('idToken', response.IdToken);
          localStorage.setItem('refreshToken', response.RefreshToken);
        }
        
        // Transform response to match AuthResponse interface
        return {
          user: response.user,
          token: response.IdToken,
          refreshToken: response.RefreshToken
        };
      },
      invalidatesTags: ['Auth'],
    }),
    
    forgotPassword: builder.mutation<{ message: string }, ForgotPasswordPayload>({
      query: (payload) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: payload,
      }),
    }),
    
    resetPassword: builder.mutation<void, ResetPasswordPayload>({
      query: (payload) => ({
        url: '/auth/confirm-forgot-password',
        method: 'POST',
        body: payload,
      }),
    }),
    
    logoutAll: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout-all',
        method: 'POST',
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          localStorage.removeItem('idToken');
          localStorage.removeItem('refreshToken');
        }
      },
    }),
    
    logout: builder.mutation<void, void>({
      queryFn: async () => {
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        return { data: undefined };
      },
    }),
    
    deleteUserAccount: builder.mutation<void, string>({
      query: (confirmPassword) => ({
        url: '/auth/delete-account',
        method: 'DELETE',
        body: { confirmPassword },
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          localStorage.removeItem('idToken');
          localStorage.removeItem('refreshToken');
        }
      },
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useSignupMutation,
  useConfirmSignupMutation,
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutAllMutation,
  useLogoutMutation,
  useDeleteUserAccountMutation,
} = authApi;
