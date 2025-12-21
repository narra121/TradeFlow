import { api } from './baseApi';

// Cache for image blobs with object URLs
const imageCache = new Map<string, string>();

export const imageApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch image and cache as blob
    getImage: builder.query<string, string>({
      queryFn: async (imageUrl) => {
        try {
          // Check if already cached
          if (imageCache.has(imageUrl)) {
            return { data: imageCache.get(imageUrl)! };
          }

          // Fetch the image
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }

          // Convert to blob and create object URL
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          // Cache it
          imageCache.set(imageUrl, objectUrl);

          return { data: objectUrl };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error instanceof Error ? error.message : 'Failed to fetch image',
            },
          };
        }
      },
      // Keep images in cache for 1 hour to match presigned URL expiry
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useGetImageQuery } = imageApi;

// Cleanup function to revoke object URLs when component unmounts
export const cleanupImageCache = () => {
  imageCache.forEach((objectUrl) => {
    URL.revokeObjectURL(objectUrl);
  });
  imageCache.clear();
};
