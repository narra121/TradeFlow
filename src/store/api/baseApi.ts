import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

// API Base URL from environment variable with fallback logic
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradeflow-prod/v1'
    : 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradeflow-dev/v1'
  );

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: any | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const dispatchUnauthorized = () => {
  window.dispatchEvent(new CustomEvent('unauthorized'));
};

const clearStoredTokens = () => {
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
};

const isRefreshRequest = (args: string | FetchArgs) => {
  if (typeof args === 'string') return args.includes('/auth/refresh');
  return typeof args.url === 'string' && args.url.includes('/auth/refresh');
};

const getHttpStatus = (result: { error?: unknown; meta?: unknown } | undefined): number | undefined => {
  const metaStatus = (result as any)?.meta?.response?.status;
  if (typeof metaStatus === 'number') return metaStatus;

  const error = (result as any)?.error;
  const errorStatus = error?.status;
  if (typeof errorStatus === 'number') return errorStatus;

  const originalStatus = error?.originalStatus;
  if (typeof originalStatus === 'number') return originalStatus;

  const nestedStatus = error?.data?.statusCode ?? error?.data?.status;
  if (typeof nestedStatus === 'number') return nestedStatus;

  return undefined;
};

const isUnauthorized = (result: { error?: unknown; meta?: unknown } | undefined) => getHttpStatus(result) === 401;

// Custom base query with token refresh logic
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    timeout: 30000,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('idToken');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
    validateStatus: (response) => response.ok, // Only treat 2xx as success
  });

  let result = await baseQuery(args, api, extraOptions);
  
  // Handle response data transformation for successful requests
  if (result.data) {
    const data = result.data as any;
    
    // New format: { success, message, data, ... }
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.success) {
        // Convert to error with proper message
        return {
          error: {
            status: 'CUSTOM_ERROR',
            data,
            error: data.message || 'Request failed',
          } as FetchBaseQueryError,
        };
      }
      
      let responseData = data.data;
      
      // If result is null/undefined, use an empty object to attach message
      if (responseData === null || responseData === undefined) {
        responseData = {};
      }

      // Attach message to result using non-enumerable property
      if (responseData && (typeof responseData === 'object' || typeof responseData === 'function') && data.message) {
        try {
          Object.defineProperty(responseData, '_apiMessage', {
            value: data.message,
            enumerable: false,
            writable: true,
            configurable: true
          });
        } catch (e) {
          // Ignore if immutable
        }
      }
      
      result = { ...result, data: responseData } as any;
    }
    // Old format: { data, error, meta }
    else if (data && typeof data === 'object' && 'data' in data) {
      // Check if backend returned an error in the envelope
      if (data.error && data.error !== null) {
        const errorMsg = typeof data.error === 'object' ? data.error.message : data.error;
        return {
          error: {
            status: 'CUSTOM_ERROR',
            data: {
              message: errorMsg || 'Request failed',
              error: data.error,
            },
            error: errorMsg || 'Request failed',
          } as FetchBaseQueryError,
        };
      }
      result = { ...result, data: data.data } as any;
    }
  }

  // Normalize network errors (no backend response, so no root `message`)
  if (result.error) {
    const err: any = result.error;
    const status = err?.status;

    // fetchBaseQuery network errors usually come as:
    // { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }
    if (status === 'FETCH_ERROR') {
      const isOffline = typeof navigator !== 'undefined' && navigator && navigator.onLine === false;
      const raw = typeof err?.error === 'string' ? err.error : '';
      const looksLikeDns = raw.toLowerCase().includes('name_not_resolved');

      err.data = isOffline
        ? 'You appear to be offline. Please check your internet connection.'
        : looksLikeDns
          ? 'Network issue (DNS lookup failed). Please try again.'
          : 'Network error. Please try again.';
    }

    if (status === 'TIMEOUT_ERROR') {
      err.data = 'Request timed out. Please try again.';
    }
  }

  if (isUnauthorized(result)) {
    // If the refresh endpoint itself is unauthorized, immediately logout.
    if (isRefreshRequest(args)) {
      clearStoredTokens();
      dispatchUnauthorized();
      return result;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken && !isRefreshing) {
      isRefreshing = true;
      
      try {
        // Call refresh token endpoint
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );

        // Refresh unauthorized -> logout
        if (isUnauthorized(refreshResult)) {
          processQueue((refreshResult as any).error);
          isRefreshing = false;
          clearStoredTokens();
          dispatchUnauthorized();
          return result;
        }

        // Other refresh failures -> reject queued calls, but don't force logout
        if ((refreshResult as any).error) {
          processQueue((refreshResult as any).error);
          isRefreshing = false;
          return result;
        }

        const refreshPayload: any = (refreshResult.data as any)?.data ?? refreshResult.data;
        const newToken: string | undefined = refreshPayload?.IdToken ?? refreshPayload?.token;

        if (!newToken) {
          processQueue(new Error('No token received from refresh endpoint'));
          isRefreshing = false;
          clearStoredTokens();
          dispatchUnauthorized();
          return result;
        }

        localStorage.setItem('idToken', newToken);

        // Process the queued requests
        processQueue(null, newToken);
        isRefreshing = false;

        // Retry the original request
        result = await baseQuery(args, api, extraOptions);

        // If the retried request is still unauthorized, logout.
        if (isUnauthorized(result)) {
          clearStoredTokens();
          dispatchUnauthorized();
        }
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        clearStoredTokens();
        dispatchUnauthorized();
      }
    } else if (isRefreshing) {
      // If already refreshing, queue this request
      try {
        await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });

        // Retry after token is refreshed
        result = await baseQuery(args, api, extraOptions);

        // If the retried request is still unauthorized, logout.
        if (isUnauthorized(result)) {
          clearStoredTokens();
          dispatchUnauthorized();
        }
      } catch (e) {
        clearStoredTokens();
        dispatchUnauthorized();
      }
    } else {
      // No refresh token available - dispatch unauthorized event
      clearStoredTokens();
      dispatchUnauthorized();
    }
  }

  return result;
};

// Create the API service
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  // Disabled global auto-refetch; enable per-endpoint as needed.
  refetchOnReconnect: false,
  refetchOnFocus: false,
  refetchOnMountOrArgChange: false,
  tagTypes: ['Auth', 'Accounts', 'Trades', 'Stats', 'Analytics', 'Goals', 'Rules', 'User', 'Subscription', 'SavedOptions', 'GoalPeriodTrades'],
  endpoints: () => ({}),
});
