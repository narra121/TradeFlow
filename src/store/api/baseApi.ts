import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

// API Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.tradeflow.com/v1';

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
    responseHandler: async (response) => {
      const data = await response.json();
      
      // New format: { success, message, data, ... }
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
           throw new Error(data.message || 'An error occurred');
        }
        
        let result = data.data;
        
        // If result is null/undefined, use an empty object to attach message
        if (result === null || result === undefined) {
            result = {};
        }

        // Attach message to result using non-enumerable property
        if (result && (typeof result === 'object' || typeof result === 'function') && data.message) {
           try {
             Object.defineProperty(result, '_apiMessage', {
                 value: data.message,
                 enumerable: false,
                 writable: true,
                 configurable: true
             });
           } catch (e) {
             // Ignore if immutable
           }
        }
        return result;
      }

      // Old format: { data, error, meta }
      if (data && typeof data === 'object' && 'data' in data) {
        // Check if backend returned an error in the envelope
        if (data.error && data.error !== null) {
          throw new Error(data.error.message || 'An error occurred');
        }
        return data.data;
      }
      return data;
    },
  });

  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
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

        if (refreshResult.data) {
          const tokens = refreshResult.data as any;
          const newToken = tokens.IdToken;
          localStorage.setItem('idToken', newToken);
          
          // Process the queued requests
          processQueue(null, newToken);
          isRefreshing = false;
          
          // Retry the original request
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Refresh failed - clear tokens and dispatch unauthorized event
          processQueue(result.error);
          isRefreshing = false;
          localStorage.removeItem('idToken');
          localStorage.removeItem('refreshToken');
          dispatchUnauthorized();
        }
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        dispatchUnauthorized();
      }
    } else if (isRefreshing) {
      // If already refreshing, queue this request
      await new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
      // Retry after token is refreshed
      result = await baseQuery(args, api, extraOptions);
    } else {
      // No refresh token available - dispatch unauthorized event
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      dispatchUnauthorized();
    }
  }

  return result;
};

// Create the API service
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Accounts', 'Trades', 'Stats', 'Analytics', 'Goals', 'Rules', 'User', 'Subscription', 'SavedOptions'],
  endpoints: () => ({}),
});
