import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TextEnhancerButton } from '@/components/ui/text-enhancer-button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CachedImage } from './CachedImage';
import { DynamicSelect } from './DynamicSelect';
import { ACCEPTED_TYPES, MAX_IMAGES, pickScreenshots, uploadScreenshot } from './imageUpload';
import { TradeImage } from '@/types/trade';
import { readApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { ImagePlus, Trash2 } from 'lucide-react';

interface ImageUploaderProps {
  images: TradeImage[];
  onChange: (images: TradeImage[]) => void;
  timeframeOptions: string[];
  onAddTimeframe: (timeframe: string) => void;
  onRemoveTimeframe?: (timeframe: string) => void;
  /** True while screenshots are still uploading; the form must not save until it turns false. */
  onBusyChange?: (busy: boolean) => void;
  className?: string;
}

const isDataUrl = (urlOrId: string) => urlOrId.startsWith('data:');

function ImageDisplay({ image, alt, className }: { image: TradeImage; alt: string; className?: string }) {
  // An inline data URL is shown as is; every other image is an id fetched through the API.
  if (image.url && isDataUrl(image.url)) return <img src={image.url} alt={alt} className={className} />;
  return <CachedImage src={image.id} alt={alt} className={className} />;
}

export function ImageUploader({
  images,
  onChange,
  timeframeOptions,
  onAddTimeframe,
  onRemoveTimeframe,
  onBusyChange,
  className,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Uploads finish after the user may have kept typing: merge into the current images, not the ones at pick time.
  const latest = useRef(images);
  latest.current = images;
  const pending = useRef(0);

  const addFiles = async (picked: File[]) => {
    const { accepted, problems } = pickScreenshots(picked, MAX_IMAGES - latest.current.length - pending.current);
    setNotice(problems.length > 0 ? problems.join(' ') : null);
    if (accepted.length === 0) return;
    pending.current += accepted.length;
    setUploading(pending.current);
    onBusyChange?.(true);

    const results = await Promise.allSettled(accepted.map(uploadScreenshot));
    const added: TradeImage[] = [];
    const failures: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') added.push({ id: r.value, timeframe: '1H', description: '' });
      else failures.push(`${accepted[i].name}: ${readApiError(r.reason, 'Could not upload the screenshot.').message}`);
    });
    pending.current -= accepted.length;
    setUploading(pending.current);
    if (pending.current === 0) onBusyChange?.(false);
    if (added.length > 0) onChange([...latest.current, ...added]);
    if (failures.length > 0) setNotice([...problems, ...failures].join(' '));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length > 0) void addFiles(files);
  };

  const updateImage = (id: string, updates: Partial<TradeImage>) => {
    onChange(images.map((img) => (img.id === id ? { ...img, ...updates } : img)));
  };

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const expandedImg = images.find((img) => img.id === expandedImage);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="bg-secondary/50 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 border border-border"
            >
              {/* Large Image Preview */}
              <div className="relative group">
                <button
                  type="button"
                  className="block w-full aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setExpandedImage(image.id)}
                  aria-label={`Enlarge screenshot ${index + 1}`}
                >
                  <ImageDisplay
                    image={image}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-full object-contain bg-black/50"
                  />
                </button>

                {/* Delete button overlay */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeImage(image.id)}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="absolute top-2 right-2 h-8 w-8 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
                    onRemove={onRemoveTimeframe}
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
                      maxLength={256}
                      className="text-sm resize-y pr-12"
                    />
                    <div className="absolute top-2 right-2">
                      <TextEnhancerButton
                        text={image.description}
                        onEnhanced={(enhancedText) =>
                          updateImage(image.id, { description: enhancedText.slice(0, 256) })
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
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer?.files ?? []);
          if (files.length > 0) void addFiles(files);
        }}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'w-full py-6 sm:py-10 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all',
            dragging && 'border-primary/50 bg-primary/5',
          )}
        >
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-muted-foreground">
            <ImagePlus className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="text-xs sm:text-sm font-medium">Drop images here or click to upload</span>
            <span className="text-xs">Support multiple screenshots</span>
          </div>
        </Button>
      </div>

      {uploading > 0 && (
        <p role="status" className="text-xs text-muted-foreground">
          Uploading {uploading} {uploading === 1 ? 'screenshot' : 'screenshots'}…
        </p>
      )}
      {notice && (
        <p role="alert" className="text-xs text-loss">
          {notice}
        </p>
      )}

      {/* Expanded Image Modal */}
      <Dialog open={!!expandedImg} onOpenChange={(open) => !open && setExpandedImage(null)}>
        <DialogContent className="max-w-5xl p-2 sm:p-4" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Screenshot preview</DialogTitle>
          {expandedImg && <ImageDisplay image={expandedImg} alt="Expanded screenshot" className="max-h-[80vh] max-w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
