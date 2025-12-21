import { api } from './baseApi';

// Cache for image blobs with object URLs
const imageCache = new Map<string, string>();

export const imageApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch image through Lambda and cache as blob
    getImage: builder.query<string, string>({
      queryFn: async (imageId, api) => {
        try {
          // Check if already cached
          if (imageCache.has(imageId)) {
            return { data: imageCache.get(imageId)! };
          }

          // Get the base URL with environment-specific fallback
          const baseUrl = import.meta.env.VITE_API_URL || 
            (import.meta.env.MODE === 'production' 
              ? 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradeflow-prod/v1'
              : 'https://b5b3vlqqd0.execute-api.us-east-1.amazonaws.com/tradeflow-dev/v1'
            );
          
          // Get auth token from the Redux state
          const state = api.getState() as any;
          const token = state.auth?.token || localStorage.getItem('idToken');
          
          if (!token) {
            throw new Error('No authentication token available');
          }

          // Construct the Lambda endpoint URL
          const imageUrl = `${baseUrl}/images/${imageId}`;

          // Fetch the image through the Lambda function
          const response = await fetch(imageUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Image not found');
            } else if (response.status === 401) {
              throw new Error('Unauthorized - please log in again');
            } else {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
          }

          // Convert to blob and create object URL
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          // Cache it
          imageCache.set(imageId, objectUrl);

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
      // Keep images in cache for 1 hour
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
