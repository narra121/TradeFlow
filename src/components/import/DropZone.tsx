import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  /** the single-line version above a review */
  compact?: boolean;
}

export const ACCEPT = '.csv,.xlsx,.xls,.txt,.htm,.html,image/png,image/jpeg,image/webp';

/** A labelled button first (click, Enter, paste); dragging a file onto it is the shortcut. */
export function DropZone({ disabled, onFiles, compact }: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = () => input.current?.click();
  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled && e.dataTransfer.files.length > 0) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border border-dashed px-4 py-5 sm:items-center sm:text-center',
        compact && 'py-3',
        over ? 'border-primary bg-muted' : 'border-border-strong/50',
      )}
    >
      <p className="text-sm text-foreground">
        Drop a broker export or screenshots here, paste (Ctrl+V), or{' '}
        <Button type="button" variant="outline" size="sm" onClick={pick} disabled={disabled} className="ml-1 align-middle">
          Choose files
        </Button>
      </p>
      <p className="text-xs text-muted-foreground">CSV, XLSX, HTML up to 4 MB · PNG, JPG, WebP up to 1 MB each, up to 15 screenshots</p>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Files to import"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
    </div>
  );
}
