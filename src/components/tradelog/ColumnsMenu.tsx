import { ArrowDown, ArrowUp, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PRESET_LABEL, TRADE_COLUMNS, moveColumn, presetColumns, type ColumnConfig, type ColumnGroup, type ColumnPreset } from '@/lib/tradeColumns';

interface ColumnsMenuProps {
  config: ColumnConfig;
  onChange: (c: ColumnConfig) => void;
  density: 'comfortable' | 'compact';
  onDensity: (d: 'comfortable' | 'compact') => void;
}

const GROUPS: ColumnGroup[] = ['Identity', 'Execution', 'Result', 'Journal'];

/** Columns popover: presets, per-column toggles in four groups, reorder buttons, and the density switch. */
export function ColumnsMenu({ config, onChange, density, onDensity }: ColumnsMenuProps) {
  const active = config.preset === 'custom' ? config.custom : presetColumns(config.preset);
  const set = new Set(active);

  const toggle = (id: string) => {
    const next = set.has(id) ? active.filter((x) => x !== id) : [...active, id];
    onChange({ preset: 'custom', custom: next });
  };
  const move = (id: string, delta: -1 | 1) => onChange({ preset: 'custom', custom: moveColumn(active, id, delta) });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1.5 font-normal" aria-label={`Columns: ${config.preset === 'custom' ? 'Custom' : PRESET_LABEL[config.preset]}`}>
          <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden 2xl:inline">Columns: {config.preset === 'custom' ? 'Custom' : PRESET_LABEL[config.preset]}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <SegmentedControl
          label="Column preset"
          size="sm"
          value={config.preset === 'custom' ? null : config.preset}
          onChange={(v) => onChange({ preset: v as ColumnPreset, custom: [] })}
          options={(['review', 'execution', 'journal'] as ColumnPreset[]).map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
          className="w-full [&>button]:flex-1"
        />
        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {GROUPS.map((g) => (
            <fieldset key={g}>
              <legend className="mb-1 text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{g}</legend>
              <ul>
                {TRADE_COLUMNS.filter((c) => c.group === g).map((c) => {
                  const on = set.has(c.id);
                  const locked = c.id === 'date' || c.id === 'symbol' || c.id === 'pnl';
                  return (
                    <li key={c.id} className="flex items-center gap-2 py-0.5">
                      <Checkbox id={`col-${c.id}`} checked={on} disabled={locked} onCheckedChange={() => toggle(c.id)} />
                      <label htmlFor={`col-${c.id}`} className="flex-1 text-13">{c.label}</label>
                      {on && config.preset === 'custom' && !c.pinned && (
                        <span className="flex">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${c.label} earlier`} onClick={() => move(c.id, -1)}>
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${c.label} later`} onClick={() => move(c.id, 1)}>
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Row density</span>
          <SegmentedControl label="Row density" size="sm" value={density} onChange={(v) => onDensity(v as 'comfortable' | 'compact')} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
