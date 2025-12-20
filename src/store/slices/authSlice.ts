import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { tokenRefreshScheduler } from '@/lib/tokenRefreshScheduler';
import { authApi } from '../api/authApi';

export interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  signupSuccess: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('idToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('idToken'),
  signupSuccess: false,
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearSignupSuccess: (state) => {
      state.signupSuccess = false;
    },
    setAuth: (state, action: PayloadAction<{ user: any; token: string; refreshToken: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addMatcher(authApi.endpoints.signup.matchFulfilled, (state) => {
        state.signupSuccess = true;
      });

    // Login
    builder
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        
        // Start token refresh scheduler
        tokenRefreshScheduler.start();
      });

    // Logout All
    builder
      .addMatcher(authApi.endpoints.logoutAll.matchFulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        
        // Stop token refresh scheduler
        tokenRefreshScheduler.stop();
      });

    // Logout
    builder
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });

    // Delete Account
    builder
      .addMatcher(authApi.endpoints.deleteUserAccount.matchFulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        
        // Stop token refresh scheduler
        tokenRefreshScheduler.stop();
      });
  },
});

export const { clearSignupSuccess, setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
