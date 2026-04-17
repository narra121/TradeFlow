import { useGetAdConfigQuery } from '@/store/api/adConfigApi';
import type { AdPlacement } from '@/store/api/adConfigApi';

export function useShowAds() {
  const { data: adConfig, isLoading } = useGetAdConfigQuery();
  return {
    showAds: adConfig?.showAds ?? false,
    tier: adConfig?.tier ?? 'free_with_ads',
    isLoading,
    getPlacement: (id: string): AdPlacement | undefined =>
      adConfig?.placements?.find((p) => p.id === id && p.enabled),
    adConfig,
  };
}
