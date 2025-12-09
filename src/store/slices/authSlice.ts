import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, LoginPayload, SignupPayload, ConfirmSignupPayload, ForgotPasswordPayload, ResetPasswordPayload } from '@/lib/api';
import { handleApiError } from '@/lib/api';
import { tokenRefreshScheduler } from '@/lib/tokenRefreshScheduler';

export interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signupSuccess: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('idToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('idToken'),
  loading: false,
  error: null,
  signupSuccess: false,
};

// Async thunks
export const signup = createAsyncThunk(
  'auth/signup',
  async (payload: SignupPayload, { rejectWithValue }) => {
    try {
      const response = await authApi.signup(payload);
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const confirmSignup = createAsyncThunk(
  'auth/confirmSignup',
  async (payload: ConfirmSignupPayload, { rejectWithValue }) => {
    try {
      await authApi.confirmSignup(payload);
      return;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const response = await authApi.login(payload);
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (payload: ForgotPasswordPayload, { rejectWithValue }) => {
    try {
      const response = await authApi.forgotPassword(payload);
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (payload: ResetPasswordPayload, { rejectWithValue }) => {
    try {
      await authApi.resetPassword(payload);
      return;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const logoutAll = createAsyncThunk(
  'auth/logoutAll',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logoutAll();
      return;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (confirmPassword: string, { rejectWithValue }) => {
    try {
      await authApi.deleteAccount(confirmPassword);
      return;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Logout thunk
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      tokenRefreshScheduler.stop();
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSignupSuccess: (state) => {
      state.signupSuccess = false;
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.signupSuccess = true;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Confirm Signup
    builder
      .addCase(confirmSignup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmSignup.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(confirmSignup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
        
        // Start token refresh scheduler
        tokenRefreshScheduler.start();
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Logout All
    builder
      .addCase(logoutAll.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAll.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        
        // Stop token refresh scheduler
        tokenRefreshScheduler.stop();
      })
      .addCase(logoutAll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even if logout fails, clear local state
        state.loading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Delete Account
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        
        // Stop token refresh scheduler
        tokenRefreshScheduler.stop();
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSignupSuccess } = authSlice.actions;
export default authSlice.reducer;
