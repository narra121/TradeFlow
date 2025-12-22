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
            data: data.message || 'Request failed',
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
      
      result = { data: responseData };
    }
    // Old format: { data, error, meta }
    else if (data && typeof data === 'object' && 'data' in data) {
      // Check if backend returned an error in the envelope
      if (data.error && data.error !== null) {
        const errorMsg = typeof data.error === 'object' ? data.error.message : data.error;
        return {
          error: {
            status: 'CUSTOM_ERROR',
            data: errorMsg || 'Request failed',
            error: errorMsg || 'Request failed',
          } as FetchBaseQueryError,
        };
      }
      result = { data: data.data };
    }
  }
  
  // Handle errors with proper message extraction
  if (result.error) {
    const error = result.error as any;
    
    // Try to extract message from error data
    if (error.data && typeof error.data === 'object') {
      if (error.data.message) {
        error.data = error.data.message;
      } else if (error.data.error && typeof error.data.error === 'string') {
        error.data = error.data.error;
      }
    }
  }

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
  tagTypes: ['Auth', 'Accounts', 'Trades', 'Stats', 'Analytics', 'Goals', 'Rules', 'User', 'Subscription', 'SavedOptions', 'GoalPeriodTrades'],
  endpoints: () => ({}),
});
