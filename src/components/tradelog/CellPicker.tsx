import { useMemo } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Picker, type PickState } from '@/components/ui/picker';
import { type BulkOp } from '@/lib/bulkPatch';
import type { Trade } from '@/types/trade';

export type CellKind = 'strategy' | 'session' | 'market' | 'mistakes' | 'tags';

const LABEL: Record<CellKind, string> = { strategy: 'Strategy', session: 'Session', market: 'Market', mistakes: 'Mistakes', tags: 'Tags' };

const listOf = (t: Trade, kind: 'mistakes' | 'tags'): string[] => (kind === 'mistakes' ? t.mistakes : t.tags) ?? [];

interface CellPickerProps {
  kind: CellKind;
  /** The focused row, or the selection when the row belongs to it. */
  targets: Trade[];
  anchor: HTMLElement;
  options: string[];
  /** Adds a typed value to the saved options. */
  onCreate: (value: string) => void;
  onApply: (op: BulkOp, targets: Trade[]) => void;
  onClose: () => void;
  /** An update is running: picks are ignored until it ends, so none starts from trades as they were before it. */
  busy?: boolean;
}

/** E-043: the journal cell's picker, anchored to the cell or row; single choices save on select, multi choices as they are toggled. */
export function CellPicker({ kind, targets, anchor, options, onCreate, onApply, onClose, busy = false }: CellPickerProps) {
  const label = LABEL[kind];
  const state = useMemo(() => {
    if (kind !== 'mistakes' && kind !== 'tags') return {};
    const out: Record<string, PickState> = {};
    const values = new Set([...options, ...targets.flatMap((t) => listOf(t, kind))]);
    for (const v of values) {
      const n = targets.filter((t) => listOf(t, kind).includes(v)).length;
      out[v] = n === 0 ? 'off' : n === targets.length ? 'on' : 'mixed';
    }
    return out;
  }, [kind, targets, options]);
  const current = kind === 'strategy' ? (targets.length === 1 ? targets[0].strategy ?? targets[0].setup ?? '' : '') : kind === 'session' ? (targets.length === 1 ? targets[0].session ?? '' : '') : targets.length === 1 ? targets[0].marketCondition ?? '' : '';
  const values = [...new Set([...options, ...targets.flatMap((t) => (kind === 'mistakes' || kind === 'tags' ? listOf(t, kind) : []))])];

  return (
    <Popover open onOpenChange={(o) => !o && onClose()}>
      <PopoverAnchor virtualRef={{ current: anchor }} />
      <PopoverContent align="start" aria-label={label} className="w-72 p-2" onCloseAutoFocus={(e) => { e.preventDefault(); anchor.focus(); }}>
        <p className="mb-1.5 px-1 text-xs text-muted-foreground">
          {label}
          {targets.length > 1 ? ` · ${targets.length} trades` : ''}
        </p>
        {kind === 'mistakes' || kind === 'tags' ? (
          <Picker
            mode="multi"
            label={label}
            options={values.map((v) => ({ value: v }))}
            state={state}
            onCreate={onCreate}
            onToggle={(value, next) => !busy && onApply({ kind, add: next === 'on' ? [value] : [], remove: next === 'off' ? [value] : [] }, targets)}
            autoFocus
          />
        ) : (
          <Picker
            mode="single"
            label={label}
            options={options.map((v) => ({ value: v }))}
            value={current}
            onCreate={onCreate}
            onChange={(value) => {
              if (busy) return;
              onApply({ kind, value }, targets);
              onClose();
            }}
            autoFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
