import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { hasStoredSession } from '@/lib/auth/storedSession';
import { authApi } from '../api/authApi';

export interface AuthState {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  isAuthenticated: boolean;
  signupSuccess: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: hasStoredSession(),
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
    setUser: (state, action: PayloadAction<AuthState['user']>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
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
        state.isAuthenticated = true;
      });

    // Logout
    builder
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      .addMatcher(authApi.endpoints.logoutEverywhere.matchFulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearSignupSuccess, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
