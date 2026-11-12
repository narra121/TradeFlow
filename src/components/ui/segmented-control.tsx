import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string | number> {
  value: T | null;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Radio group with a roving tabindex; arrow keys move and select. */
export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = options.findIndex((o) => o.value === value);
  const tabbable = activeIndex >= 0 ? activeIndex : options.findIndex((o) => !o.disabled);

  const move = (from: number, delta: number) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + delta + options.length) % options.length;
      if (!options[i].disabled) {
        onChange(options[i].value);
        refs.current[i]?.focus();
        return;
      }
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-md border border-input bg-background p-0.5', className)}>
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.ariaLabel}
          disabled={o.disabled}
          tabIndex={i === tabbable ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              move(i, 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              move(i, -1);
            }
          }}
          className={cn(
            'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded px-3 font-medium transition-colors disabled:opacity-50',
            size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm [@media(pointer:coarse)]:h-10',
            o.value === value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
