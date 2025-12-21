import { useGetImageQuery } from '@/store/api/imageCache';

/**
 * Hook to fetch and cache images using the Lambda endpoint
 * Takes an image ID and returns a cached object URL for the image
 */
export const useCachedImage = (imageId: string | undefined) => {
  const { data: cachedUrl, isLoading, error } = useGetImageQuery(imageId || '', {
    skip: !imageId,
  });

  return {
    src: cachedUrl, // Object URL from the Lambda-fetched image
    isLoading,
    error,
  };
};
