import { api } from './baseApi';

export interface AdPlacement {
  id: string;
  slotId: string;
  format: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  enabled: boolean;
}

export interface AdConfig {
  showAds: boolean;
  tier: 'paid' | 'trial' | 'free_with_ads';
  provider?: string;
  clientId?: string;
  testMode?: boolean;
  placements: AdPlacement[];
}

export const adConfigApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAdConfig: builder.query<AdConfig, void>({
      query: () => '/ad-config',
      keepUnusedDataFor: 3600, // 1 hour
    }),
  }),
});

export const { useGetAdConfigQuery } = adConfigApi;
