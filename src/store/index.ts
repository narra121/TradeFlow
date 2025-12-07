import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import accountsReducer from './slices/accountsSlice';
import tradesReducer from './slices/tradesSlice';
import statsReducer from './slices/statsSlice';
import analyticsReducer from './slices/analyticsSlice';
import goalsRulesReducer from './slices/goalsRulesSlice';
import userReducer from './slices/userSlice';
import { toastMiddleware } from './middleware/toastMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    trades: tradesReducer,
    stats: statsReducer,
    analytics: analyticsReducer,
    goalsRules: goalsRulesReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/login/fulfilled', 'auth/signup/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }).concat(toastMiddleware),
  devTools: import.meta.env.MODE !== 'production',
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
