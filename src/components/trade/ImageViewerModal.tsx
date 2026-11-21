import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCachedImage } from '@/hooks/useCachedImage';
import { readApiError } from '@/lib/apiError';
import { ZoomIn, ZoomOut, Minimize2, X, Eye, EyeOff, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string; // Changed from imageUrl to imageId
  timeframe?: string;
  description?: string;
  /** Position of this image among the trade's screenshots; with `count` above 1 and `onNavigate`, arrows and ←/→ switch images (wrapping). */
  index?: number;
  count?: number;
  onNavigate?: (index: number) => void;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageId,
  timeframe,
  description,
  index = 0,
  count = 1,
  onNavigate,
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showDescription, setShowDescription] = useState(true);
  
  // Use the cached image hook
  const { src: imageUrl, isLoading, error } = useCachedImage(imageId);
  // The dialog content mounts after `isOpen` turns true, so the wheel listener is attached when the element arrives.
  // It must be non-passive: a React `onWheel` is passive and cannot stop the page from scrolling.
  const stopWheel = useRef<(() => void) | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    stopWheel.current?.();
    stopWheel.current = null;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    stopWheel.current = () => el.removeEventListener('wheel', onWheel);
  }, []);

  const canNavigate = !!onNavigate && count > 1;
  const showImage = useCallback((step: number) => onNavigate?.((index + step + count) % count), [onNavigate, index, count]);

  // Reset state when modal opens or another image is shown
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setShowDescription(true);
    }
  }, [isOpen, imageId]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+': case '=': handleZoomIn(); break;
        case '-': handleZoomOut(); break;
        case 'r': case 'R': handleReset(); break;
        case 'ArrowLeft': if (canNavigate) showImage(-1); break;
        case 'ArrowRight': if (canNavigate) showImage(1); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canNavigate, showImage]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="w-[98vw] max-w-[98vw] sm:w-[95vw] sm:max-w-[95vw] h-[95vh] max-h-[95vh] p-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden">
        <DialogTitle className="sr-only">Trade screenshot{timeframe ? `, ${timeframe}` : ''}</DialogTitle>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3 bg-gradient-to-b from-background/90 to-transparent">
          <div className="flex items-center gap-2 sm:gap-3">
            {timeframe && (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                {timeframe}
              </Badge>
            )}
            {canNavigate && (
              <span className="text-xs font-mono text-foreground" aria-live="polite">
                {index + 1} / {count}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-background/95 border border-border/50 rounded-lg p-1 sm:p-1.5 shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 text-foreground hover:text-primary"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <span className="text-xs font-mono w-12 text-center text-foreground font-medium">{Math.round(scale * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 text-foreground hover:text-primary"
                onClick={handleZoomIn}
                disabled={scale >= 5}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 text-foreground hover:text-primary"
                onClick={handleReset}
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>

            {/* Fit to Screen - hide on very small screens */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-foreground hover:text-primary bg-background/95 border border-border/50 backdrop-blur-sm hidden sm:flex shadow-lg"
              onClick={handleReset}
              aria-label="Fit to screen"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>

            {/* Description Toggle */}
            {description && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 text-foreground hover:text-primary bg-background/95 border border-border/50 backdrop-blur-sm shadow-lg",
                  showDescription && "bg-primary/20"
                )}
                onClick={() => setShowDescription(!showDescription)}
                aria-label="Show description"
                aria-pressed={showDescription}
              >
                {showDescription ? <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </Button>
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-foreground hover:text-primary bg-background/95 border border-border/50 backdrop-blur-sm shadow-lg"
              onClick={onClose}
              aria-label="Close viewer"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full flex items-center justify-center overflow-hidden cursor-grab",
            isDragging && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isLoading ? (
            <div className="w-full h-full max-w-4xl max-h-[80vh] mx-auto">
              <Skeleton className="w-full h-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <X className="h-8 w-8 mb-2" />
              <span>Failed to load image</span>
              <span className="mt-1 text-xs">{readApiError(error, '').message}</span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Trade screenshot"
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              draggable={false}
            />
          )}
        </div>

        {canNavigate && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-background/95 border border-border/50 text-foreground shadow-lg hover:text-primary sm:left-4"
              onClick={() => showImage(-1)}
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full bg-background/95 border border-border/50 text-foreground shadow-lg hover:text-primary sm:right-4"
              onClick={() => showImage(1)}
              aria-label="Next screenshot"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Description Panel */}
        {description && showDescription && (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-3 py-2 sm:px-6 sm:py-4 bg-gradient-to-t from-background/95 to-transparent">
            <div className="max-w-3xl mx-auto">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-border/50">
                <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}