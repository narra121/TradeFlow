import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SCREENSHOTS_PER_REQUEST } from '@/lib/import/screenshot';
import type { ImportScreenshot } from '@/lib/importFlowStore';

interface SourcePreviewProps {
  screenshots: ImportScreenshot[];
  /** batch of the focused row; its images are shown first */
  batch: number | null;
}

/** The screenshots behind the focused row, so extracted numbers can be checked against the image. */
export function SourcePreview({ screenshots, batch }: SourcePreviewProps) {
  const from = (batch ?? 0) * SCREENSHOTS_PER_REQUEST;
  const group = screenshots.slice(from, from + SCREENSHOTS_PER_REQUEST);
  const [i, setI] = useState(0);
  const shown = group[Math.min(i, group.length - 1)];
  if (!shown) return null;
  return (
    <aside aria-label="Screenshot behind the selected row" className="space-y-2 border-border 2xl:border-l 2xl:pl-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted-foreground">{shown.name}</p>
        {group.length > 1 && (
          <span className="flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" disabled={i <= 0} onClick={() => setI(i - 1)}>Previous</Button>
            <Button type="button" size="sm" variant="ghost" disabled={i >= group.length - 1} onClick={() => setI(i + 1)}>Next</Button>
          </span>
        )}
      </div>
      <img src={shown.url} alt={`Uploaded screenshot ${shown.name}`} className="max-h-[420px] rounded-sm border border-border object-contain" />
    </aside>
  );
}
