import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sourceLabel } from '@/lib/import/labels';
import { cn } from '@/lib/utils';
import type { ImportSource, ImportSourceId } from '@/types/import';

interface SourceGuideProps {
  sources: ImportSource[];
  value: ImportSourceId | 'auto';
  onChange: (id: ImportSourceId | 'auto') => void;
}

/**
 * `How to export from: Zerodha · Dhan …`: a disclosure only. Opening a broker shows its steps and sample columns in place;
 * it never changes the Source, which is set by the Source select or by the explicit button inside the steps.
 */
export function SourceGuide({ sources, value, onChange }: SourceGuideProps) {
  const [shown, setShown] = useState<ImportSource['id'] | null>(null);
  const chosen = sources.find((s) => s.id === shown);
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="how-h" className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h2 id="how-h" className="text-xs font-medium text-foreground-soft">How to export from</h2>
        {sources.map((s) => {
          const on = s.id === shown;
          return (
            <button
              key={s.id}
              type="button"
              aria-expanded={on}
              aria-controls="how-steps"
              onClick={() => setShown(on ? null : s.id)}
              className={cn('h-7 rounded-sm border px-2 text-xs [@media(pointer:coarse)]:h-11', on ? 'border-primary bg-muted text-foreground' : 'border-border text-foreground-soft hover:bg-muted')}
            >
              {s.id === 'generic_csv' ? 'Other CSV' : sourceLabel(s, sources)}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div id="how-steps" className="space-y-1 text-13 text-foreground-soft">
          <p>{chosen.howToExport}</p>
          <p className="text-xs text-muted-foreground">
            Expected columns: <span className="font-mono">{chosen.sampleColumns.join(', ')}</span>
          </p>
          {value !== chosen.id && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(chosen.id)}>
              Use {chosen.id === 'generic_csv' ? 'Other CSV' : sourceLabel(chosen, sources)} as the source
            </Button>
          )}
          {value === chosen.id && <p className="text-xs text-muted-foreground">This is the source for your next file. Change it with the Source control above.</p>}
          {chosen.id === 'generic_csv' && (
            <a href="/import-template.csv" download className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline [@media(pointer:coarse)]:min-h-11">
              <Download className="h-3 w-3" aria-hidden="true" /> Download a CSV template
            </a>
          )}
        </div>
      )}
      {!chosen && sources.some((s) => s.id === 'generic_csv') && (
        <a href="/import-template.csv" download className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline [@media(pointer:coarse)]:min-h-11">
          <Download className="h-3 w-3" aria-hidden="true" /> Download a CSV template for a broker that is not listed
        </a>
      )}
    </section>
  );
}
