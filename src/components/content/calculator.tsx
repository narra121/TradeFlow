import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const calcInputClass =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-foreground placeholder:text-muted-foreground';
export const calcLabelClass = 'mb-1.5 block text-sm font-medium text-foreground';

/** Parses what a person types: spaces and thousands commas are ignored, "." is the decimal mark; anything else is 0. */
export function parseDecimal(text: string): number {
  const n = Number(text.replace(/[\s,]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** A numeric field without spinner arrows: text input with the decimal keypad on phones. Holds the typed text, not a number. */
export function DecimalInput({ id, value, onChange }: { id: string; value: string; onChange: (text: string) => void }) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={calcInputClass}
    />
  );
}

/** Inputs left, result right; stacked on phones. */
export function CalcLayout({ inputs, result }: { inputs: ReactNode; result: ReactNode }) {
  return (
    <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-5">{inputs}</div>
      <div className="panel p-5">{result}</div>
    </div>
  );
}

/** Announces `text` through one polite live region, 500 ms after the last change. */
export function LiveResult({ text }: { text: string }) {
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(text), 500);
    return () => window.clearTimeout(t);
  }, [text]);
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {announced}
    </p>
  );
}

interface DirectionRadiosProps {
  value: 'long' | 'short';
  onChange: (v: 'long' | 'short') => void;
}

export function DirectionRadios({ value, onChange }: DirectionRadiosProps) {
  return (
    <fieldset>
      <legend className={calcLabelClass}>Direction</legend>
      <div className="flex gap-2">
        {(['long', 'short'] as const).map((d) => (
          <label
            key={d}
            className={cn(
              'flex h-10 flex-1 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              value === d
                ? d === 'long'
                  ? 'border-profit bg-profit/10 text-profit'
                  : 'border-loss bg-loss/10 text-loss'
                : 'border-input text-foreground-soft hover:bg-secondary',
            )}
          >
            <input
              type="radio"
              name="direction"
              value={d}
              checked={value === d}
              onChange={() => onChange(d)}
              className="sr-only"
            />
            {d === 'long' ? 'Long' : 'Short'}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormulaDisclosure({ children }: { children: ReactNode }) {
  return (
    <details className="mt-4 text-sm text-foreground-soft">
      <summary className="cursor-pointer font-medium text-foreground">How this is calculated</summary>
      <div className="mt-2 space-y-1">{children}</div>
    </details>
  );
}
