import { useGetImageQuery } from '@/store/api/imageCache';

/**
 * Hook to fetch and cache images using RTK Query
 * Returns a cached object URL for the image that can be used in img src
 */
export const useCachedImage = (imageUrl: string | undefined) => {
  const { data: cachedUrl, isLoading, error } = useGetImageQuery(imageUrl || '', {
    skip: !imageUrl,
  });

  return {
    src: cachedUrl || imageUrl, // Fallback to original URL if cache loading
    isLoading,
    error,
  };
};
