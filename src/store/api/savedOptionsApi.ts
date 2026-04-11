import { api } from './baseApi';

export interface SavedOptions {
  strategies: string[];
  newsEvents: string[];
  sessions: string[];
  marketConditions: string[];
  mistakes: string[];
  symbols: string[];
  lessons: string[];
  timeframes: string[];
}

export const savedOptionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSavedOptions: builder.query<SavedOptions, void>({
      query: () => '/options',
      // This data is effectively global app config; keep it around.
      keepUnusedDataFor: 60 * 60,
      providesTags: ['SavedOptions'],
      transformResponse: (response: any) => {
        const options = response.options || response;
        if (response?._apiMessage) {
          Object.defineProperty(options, '_apiMessage', {
            value: response._apiMessage,
            enumerable: false,
            writable: true,
            configurable: true
          });
        }
        return options;
      },
    }),
    
    updateSavedOptions: builder.mutation<SavedOptions, SavedOptions>({
      query: (options) => ({
        url: '/options',
        method: 'PUT',
        body: options,
      }),
      transformResponse: (response: any) => {
        const options = response.options || response;
        if (response?._apiMessage) {
          Object.defineProperty(options, '_apiMessage', {
            value: response._apiMessage,
            enumerable: false,
            writable: true,
            configurable: true
          });
        }
        return options;
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(
            // Use upsert to ensure the query cache is updated even if nothing is currently subscribed.
            savedOptionsApi.util.upsertQueryData('getSavedOptions', undefined, updated)
          );
        } catch {
          // handled by caller
        }
      },
    }),
    
  }),
});

export const {
  useGetSavedOptionsQuery,
  useUpdateSavedOptionsMutation,
} = savedOptionsApi;
