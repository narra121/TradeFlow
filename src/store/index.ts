import { configureStore } from '@reduxjs/toolkit';
import { api } from './api/baseApi';
import authReducer from './slices/authSlice';
import accountsReducer from './slices/accountsSlice';
import tradesReducer from './slices/tradesSlice';
import { toastMiddleware } from './middleware/toastMiddleware';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    accounts: accountsReducer,
    trades: tradesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore RTK Query actions and paths that contain non-serializable values
        ignoredActions: [
          'auth/login/fulfilled', 
          'auth/signup/fulfilled',
          // Ignore all RTK Query actions
          'api/executeQuery/fulfilled',
          'api/executeQuery/pending',
          'api/executeQuery/rejected',
          'api/executeMutation/fulfilled',
          'api/executeMutation/pending',
          'api/executeMutation/rejected',
        ],
        ignoredActionPaths: [
          'meta.arg', 
          'payload.timestamp',
          // Ignore RTK Query meta that contains Request objects
          'meta.baseQueryMeta.request',
          'meta.baseQueryMeta.response',
        ],
        ignoredPaths: ['items.dates'],
      },
    })
      .concat(api.middleware)
      .concat(toastMiddleware),
  devTools: import.meta.env.MODE !== 'production',
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
