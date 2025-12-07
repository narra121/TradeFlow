import apiClient from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface ConfirmSignupPayload {
  email: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export const authApi = {
  // POST /v1/auth/signup
  signup: async (payload: SignupPayload): Promise<{ user: { id: string; name: string; email: string }; message: string }> => {
    return apiClient.post('/auth/signup', payload);
  },

  // POST /v1/auth/confirm-signup
  confirmSignup: async (payload: ConfirmSignupPayload): Promise<void> => {
    return apiClient.post('/auth/confirm-signup', payload);
  },

  // POST /v1/auth/login
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response: any = await apiClient.post('/auth/login', payload);
    
    // Backend returns IdToken, AccessToken, RefreshToken (capitalized)
    // Store tokens in localStorage
    if (response.IdToken) {
      localStorage.setItem('idToken', response.IdToken);
      localStorage.setItem('refreshToken', response.RefreshToken);
    }
    
    // Transform response to match AuthResponse interface
    return {
      user: response.user || {
        id: '',
        name: '',
        email: payload.email
      },
      token: response.IdToken,
      refreshToken: response.RefreshToken
    } as AuthResponse;
  },

  // POST /v1/auth/refresh
  refreshToken: async (payload: RefreshTokenPayload): Promise<{ token: string }> => {
    const response: any = await apiClient.post('/auth/refresh', payload);
    
    // Backend returns IdToken (capitalized)
    // Update token in localStorage
    if (response.IdToken) {
      localStorage.setItem('idToken', response.IdToken);
    }
    
    return { token: response.IdToken };
  },

  // POST /v1/auth/forgot-password
  forgotPassword: async (payload: ForgotPasswordPayload): Promise<{ message: string }> => {
    return apiClient.post('/auth/forgot-password', payload);
  },

  // POST /v1/auth/confirm-forgot-password
  resetPassword: async (payload: ResetPasswordPayload): Promise<void> => {
    await apiClient.post('/auth/confirm-forgot-password', payload);
  },

  // POST /v1/auth/logout-all
  logoutAll: async (): Promise<void> => {
    await apiClient.post('/auth/logout-all');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
  },

  // DELETE /v1/auth/account
  deleteAccount: async (confirmPassword: string): Promise<void> => {
    await apiClient.delete('/auth/account', {
      data: { confirmPassword }
    });
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
  },

  // Logout (client-side only)
  logout: () => {
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
  },
};
