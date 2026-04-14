import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCachedImage } from '@/hooks/useCachedImage';
import { ZoomIn, ZoomOut, Minimize2, X, Eye, EyeOff, RotateCcw } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string; // Changed from imageUrl to imageId
  timeframe?: string;
  description?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageId,
  timeframe,
  description,
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showDescription, setShowDescription] = useState(true);
  
  // Use the cached image hook
  const { src: imageUrl, isLoading, error } = useCachedImage(imageId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setShowDescription(true);
    }
  }, [isOpen]);

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+': case '=': handleZoomIn(); break;
        case '-': handleZoomOut(); break;
        case 'r': case 'R': handleReset(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-w-[98vw] sm:w-[95vw] sm:max-w-[95vw] h-[95vh] max-h-[95vh] p-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3 bg-gradient-to-b from-background/90 to-transparent">
          <div className="flex items-center gap-2 sm:gap-3">
            {timeframe && (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                {timeframe}
              </Badge>
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
              >
                <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 text-foreground hover:text-primary"
                onClick={handleReset}
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
          onWheel={handleWheel}
        >
          {isLoading ? (
            <div className="w-full h-full max-w-4xl max-h-[80vh] mx-auto">
              <Skeleton className="w-full h-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <X className="h-8 w-8 mb-2" />
              <span>Failed to load image</span>
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