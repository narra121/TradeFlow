import type { Middleware } from '@reduxjs/toolkit';
import { api } from '../api/baseApi';
import { authApi } from '../api/authApi';
import { clearAuth } from '../slices/authSlice';
import { setSelectedAccount } from '../slices/accountsSlice';
import { clearFilters } from '../slices/tradesSlice';
import { clearPersistedViewState, clearTradeDrafts } from '@/lib/scope';

/** When the session ends (logout or a global 401) nothing of the previous user may stay in memory or storage. */
export const sessionResetMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  if (clearAuth.match(action) || authApi.endpoints.logout.matchFulfilled(action)) {
    clearPersistedViewState();
    if (authApi.endpoints.logout.matchFulfilled(action)) clearTradeDrafts();
    store.dispatch(api.util.resetApiState());
    store.dispatch(setSelectedAccount(null));
    store.dispatch(clearFilters());
  }
  return result;
};
