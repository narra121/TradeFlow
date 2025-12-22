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
      providesTags: [{ type: 'SavedOptions', id: 'LIST' }],
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
      invalidatesTags: [{ type: 'SavedOptions', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSavedOptionsQuery,
  useUpdateSavedOptionsMutation,
} = savedOptionsApi;
