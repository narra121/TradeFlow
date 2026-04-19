import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  user: null,
  token: safeGetItem('idToken'),
  refreshToken: safeGetItem('refreshToken'),
  isAuthenticated: !!safeGetItem('idToken'),
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
    setGoogleAuth: (state, action: PayloadAction<{ user: any; token: string; refreshToken: string | null }>) => {
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
      });

    // Logout
    builder
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearSignupSuccess, setAuth, setGoogleAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
