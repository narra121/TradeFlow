import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FieldA11y {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (a11y: FieldA11y) => React.ReactNode;
}

/** Ties label, hint and error to the control through the attributes handed to the render prop. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="block text-xs font-medium text-foreground-soft">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-error">
            *
          </span>
        )}
      </Label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
