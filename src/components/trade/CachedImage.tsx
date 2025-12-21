import { useCachedImage } from '@/hooks/useCachedImage';
import { Skeleton } from '@/components/ui/skeleton';

interface CachedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

/**
 * Image component that caches images using RTK Query
 * Prevents repeated fetches of the same image from S3
 * Shows shimmer effect while loading
 */
export const CachedImage = ({ src, alt, className, fallbackSrc = '/placeholder.svg' }: CachedImageProps) => {
  const { src: cachedSrc, isLoading, error } = useCachedImage(src);

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
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
      }}
    />
  );
};
