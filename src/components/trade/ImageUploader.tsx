import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TextEnhancerButton } from '@/components/ui/text-enhancer-button';
import { CachedImage } from './CachedImage';
import { DynamicSelect } from './DynamicSelect';
import { TradeImage } from '@/types/trade';
import { cn } from '@/lib/utils';
import { ImagePlus, Trash2, X } from 'lucide-react';

interface ImageUploaderProps {
  images: TradeImage[];
  onChange: (images: TradeImage[]) => void;
  timeframeOptions: string[];
  onAddTimeframe: (timeframe: string) => void;
  className?: string;
}

export function ImageUploader({
  images,
  onChange,
  timeframeOptions,
  onAddTimeframe,
  className,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Helper function to determine if this is a data URL (newly uploaded) vs image ID (existing)
  const isDataUrl = (urlOrId: string) => urlOrId.startsWith('data:');

  // Helper component to render the appropriate image type
  const ImageDisplay = ({ 
    image, 
    alt, 
    className, 
    onClick 
  }: { 
    image: TradeImage; 
    alt: string; 
    className?: string; 
    onClick?: () => void;
  }) => {
    // For newly uploaded images, use the data URL directly
    if (image.url && isDataUrl(image.url)) {
      return (
        <img
          src={image.url}
          alt={alt}
          className={className}
          onClick={onClick}
        />
      );
    }
    
    // For existing images, use CachedImage with the image ID
    return (
      <CachedImage
        src={image.id}
        alt={alt}
        className={className}
        onClick={onClick}
      />
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newImages: TradeImage[] = [];
    let loadedCount = 0;

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newImages.push({
          id: crypto.randomUUID(),
          url: event.target?.result as string,
          timeframe: '1H',
          description: '',
        });
        loadedCount++;
        
        // Once all files are loaded, update state
        if (loadedCount === fileArray.length) {
          onChange([...images, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateImage = (id: string, updates: Partial<TradeImage>) => {
    onChange(
      images.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      )
    );
  };

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="bg-secondary/50 rounded-xl p-4 space-y-4 border border-border"
            >
              {/* Large Image Preview */}
              <div className="relative group">
                <div 
                  className="w-full aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setExpandedImage(image.id)}
                >
                  <ImageDisplay
                    image={image}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-full object-contain bg-black/50"
                  />
                </div>
                
                {/* Delete button overlay */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                  Screenshot {index + 1}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Timeframe</Label>
                  <DynamicSelect
                    value={image.timeframe}
                    onChange={(value) => updateImage(image.id, { timeframe: value })}
                    options={timeframeOptions}
                    onAddNew={onAddTimeframe}
                    placeholder="Select timeframe..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <div className="relative">
                    <Textarea
                      value={image.description}
                      onChange={(e) =>
                        updateImage(image.id, { description: e.target.value })
                      }
                      placeholder="Describe what this screenshot shows... (e.g., Entry confirmation on 1H chart, support level bounce)"
                      rows={3}
                      className="text-sm resize-y pr-12"
                    />
                    <div className="absolute top-2 right-2">
                      <TextEnhancerButton
                        text={image.description}
                        onEnhanced={(enhancedText) =>
                          updateImage(image.id, { description: enhancedText })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-10 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImagePlus className="w-10 h-10" />
          <span className="text-sm font-medium">Drop images here or click to upload</span>
          <span className="text-xs">Support multiple screenshots</span>
        </div>
      </Button>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8"
          onClick={() => setExpandedImage(null)}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>
          {(() => {
            const expandedImg = images.find(img => img.id === expandedImage);
            if (!expandedImg) return null;
            
            return (
              <ImageDisplay
                image={expandedImg}
                alt="Expanded screenshot"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
