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
        const result = {
          user: response.user,
          token: response.IdToken,
          refreshToken: response.RefreshToken
        };

        if (response?._apiMessage) {
             Object.defineProperty(result, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return result;
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
    
    logout: builder.mutation<void, void>({
      queryFn: async () => {
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        // Clear persisted image cache so another user doesn't see stale images
        const { clearImageCache } = await import('./imageCache');
        await clearImageCache();
        const { signOutFirebase } = await import('@/lib/firebase/auth');
        await signOutFirebase();
        return { data: undefined };
      },
    }),
    
  }),
});

export const {
  useSignupMutation,
  useConfirmSignupMutation,
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
} = authApi;
