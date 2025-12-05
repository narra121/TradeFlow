import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DynamicSelect } from './DynamicSelect';
import { TradeImage } from '@/types/trade';
import { cn } from '@/lib/utils';
import { ImagePlus, Trash2, GripVertical } from 'lucide-react';

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: TradeImage = {
          id: crypto.randomUUID(),
          url: event.target?.result as string,
          timeframe: '1H',
          description: '',
        };
        onChange([...images, newImage]);
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
        <div className="space-y-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="bg-secondary/50 rounded-lg p-4 space-y-3 border border-border"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-32 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                  <img
                    src={image.url}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Fields */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Screenshot {index + 1}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(image.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Timeframe</Label>
                      <DynamicSelect
                        value={image.timeframe}
                        onChange={(value) => updateImage(image.id, { timeframe: value })}
                        options={timeframeOptions}
                        onAddNew={onAddTimeframe}
                        placeholder="Select..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={image.description}
                        onChange={(e) =>
                          updateImage(image.id, { description: e.target.value })
                        }
                        placeholder="What does this show?"
                        className="h-8 text-sm"
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
        className="w-full py-8 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImagePlus className="w-8 h-8" />
          <span className="text-sm">Drop images here or click to upload</span>
        </div>
      </Button>
    </div>
  );
}
