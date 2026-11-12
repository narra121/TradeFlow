import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAPPING_FIELDS, missingFields, type ColumnMap } from '@/lib/import/mappingMemory';
import type { CanonicalField } from '@/types/import';

const NONE = '__none__';

interface ColumnMappingProps {
  headers: string[];
  suggested: ColumnMap;
  onApply: (mapping: ColumnMap) => void;
  onCancel: () => void;
  busy?: boolean;
}

const GROUPS: { id: 'trade' | 'fill' | 'extra'; label: string }[] = [
  { id: 'trade', label: 'One row per closed trade' },
  { id: 'fill', label: 'Or one row per execution' },
  { id: 'extra', label: 'Optional' },
];

/** One row per field with a select of the file's headers (suggestions preselected). */
export function ColumnMapping({ headers, suggested, onApply, onCancel, busy }: ColumnMappingProps) {
  const [map, setMap] = useState<ColumnMap>(suggested);
  const missing = useMemo(() => missingFields(map), [map]);
  const set = (field: CanonicalField, value: string) => setMap((m) => ({ ...m, [field]: value === NONE ? undefined : value }));
  return (
    <section aria-labelledby="map-h" className="space-y-3">
      <div>
        <h2 id="map-h" className="text-sm font-semibold">Match the columns in your file</h2>
        <p className="text-xs text-muted-foreground">
          We couldn’t recognise this layout. Choose which column holds each value. The next file with the same headers reuses your choice.
        </p>
      </div>
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <fieldset key={g.id} className="space-y-2">
            <legend className="mb-1 text-xs font-medium text-foreground-soft">{g.label}</legend>
            {MAPPING_FIELDS.filter((f) => f.group === g.id).map((f) => (
              <div key={f.field} className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-2">
                <span id={`map-${f.field}`} className="text-13 text-foreground-soft">{f.label}</span>
                <Select value={map[f.field] ?? NONE} onValueChange={(v) => set(f.field, v)}>
                  <SelectTrigger aria-labelledby={`map-${f.field}`} className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not in the file</SelectItem>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => onApply(map)} disabled={busy || missing.length > 0}>Apply mapping</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Choose another file</Button>
        {missing.length > 0 && <p role="status" className="text-xs text-muted-foreground">Still needed: {missing.join(', ')}.</p>}
      </div>
    </section>
  );
}
