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

export interface AddOptionPayload {
  value: string;
}

function applySavedOptionsCache(draft: SavedOptions, updated: SavedOptions) {
  draft.strategies = updated.strategies;
  draft.newsEvents = updated.newsEvents;
  draft.sessions = updated.sessions;
  draft.marketConditions = updated.marketConditions;
  draft.mistakes = updated.mistakes;
  draft.symbols = updated.symbols;
  draft.lessons = updated.lessons;
  draft.timeframes = updated.timeframes;
}

export const savedOptionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSavedOptions: builder.query<SavedOptions, void>({
      query: () => '/options',
      // This data is effectively global app config; keep it around.
      keepUnusedDataFor: 60 * 60,
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
    
    addOption: builder.mutation<SavedOptions, { category: string; payload: AddOptionPayload }>({
      query: ({ category, payload }) => ({
        url: `/options/${category}`,
        method: 'POST',
        body: payload,
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
  useAddOptionMutation,
} = savedOptionsApi;
