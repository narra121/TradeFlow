/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { getIdToken } from '@/lib/auth/authService';
import { API_BASE_URL } from '@/lib/api/config';
import { classifyPlanError, emitPlanSignal } from '@/lib/planErrors';
import { connectionMessage } from '@/lib/apiError';

const dispatchUnauthorized = () => {
  window.dispatchEvent(new CustomEvent('unauthorized'));
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

// Custom base query: adds the ID token and, on a 401, renews it once and retries
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    timeout: 30000,
    prepareHeaders: async (headers) => {
      const token = await getIdToken().catch(() => null);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
    validateStatus: (response) => response.ok, // Only treat 2xx as success
  });

  // Transform response: unwrap backend envelope, normalize errors
  const transformResult = (raw: typeof result) => {
    let r = raw;

    // Handle response data transformation for successful requests
    if (r.data) {
      const data = r.data as any;

      // New format: { success, message, data, ... }
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              data,
              error: data.message || 'Request failed',
            } as FetchBaseQueryError,
          };
        }

        let responseData = data.data;

        if (responseData === null || responseData === undefined) {
          responseData = {};
        }

        r = { ...r, data: responseData } as any;
      }
      // Old format: { data, error, meta }
      else if (data && typeof data === 'object' && 'data' in data) {
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
        r = { ...r, data: data.data } as any;
      }
    }

    if (r.error) {
      const err: any = r.error;
      const status = err?.status;

      if (status === 'FETCH_ERROR') err.data = connectionMessage('network');
      if (status === 'TIMEOUT_ERROR') err.data = connectionMessage('timeout');

      // A body that is not JSON (a gateway's HTML page) still came with an HTTP status: keep that status and the text.
      if (status === 'PARSING_ERROR' && typeof err.originalStatus === 'number' && err.originalStatus >= 400) {
        r = { error: { status: err.originalStatus, data: err.data } as FetchBaseQueryError, meta: r.meta };
      }
    }

    const httpStatus = getHttpStatus(r);
    if (httpStatus === 402 && r.error) {
      const signal = classifyPlanError(402, (r.error as { data?: unknown }).data, api.type === 'query' ? 'query' : 'mutation');
      if (signal) emitPlanSignal(signal);
    }

    return r;
  };

  let result = await baseQuery(args, api, extraOptions);
  result = transformResult(result) as any;

  if (isUnauthorized(result)) {
    // The ID token may have expired mid-request: renew it once and retry. Amplify shares one renewal between concurrent callers.
    // `null` = no session is left; a throw = Cognito could not be reached, so the session stays and the next request retries.
    let renewed: string | null | undefined;
    try {
      renewed = await getIdToken({ forceRefresh: true });
    } catch {
      renewed = undefined;
    }
    if (renewed) result = transformResult(await baseQuery(args, api, extraOptions)) as any;
    if (renewed === null || (renewed && isUnauthorized(result))) dispatchUnauthorized();
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
  tagTypes: ['Auth', 'Accounts', 'Trades', 'Stats', 'Goals', 'Rules', 'User', 'Subscription', 'SavedOptions'],
  endpoints: () => ({}),
});
