import { api } from './baseApi';

export interface EnhanceTextRequest {
  text: string;
  isTradingNotes?: boolean;
}

export interface EnhanceTextResponse {
  enhancedText: string;
}

export const textApi = api.injectEndpoints({
  endpoints: (builder) => ({
    enhanceText: builder.mutation<EnhanceTextResponse, EnhanceTextRequest>({
      query: (body) => ({
        url: '/enhance-text',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useEnhanceTextMutation } = textApi;