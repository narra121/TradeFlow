import { useCachedImage } from '@/hooks/useCachedImage';
import { Skeleton } from '@/components/ui/skeleton';

interface CachedImageProps {
  src: string; // This is now expected to be an imageId (S3 key)
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onClick?: () => void;
}

/**
 * Image component that fetches images through Lambda endpoint and caches them
 * Takes an image ID and fetches through the secure Lambda function
 * Shows shimmer effect while loading
 */
export const CachedImage = ({ src: imageId, alt, className, fallbackSrc = '/placeholder.svg', onClick }: CachedImageProps) => {
  const { src: cachedSrc, isLoading, error } = useCachedImage(imageId);

  if (isLoading) {
    return (
      <Skeleton className={`w-full aspect-video ${className}`} />
    );
  }

  return (
    <img
      src={error ? fallbackSrc : cachedSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
      }}
    />
  );
};
