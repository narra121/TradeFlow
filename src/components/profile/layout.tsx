import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Section title with an optional one-line hint (A.9: `h2` 16 / 600). */
export function SectionHeading({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <h2 id={id} className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Label column 200 px, control, helper text under the control; stacks on phones. */
export function SettingRow({ label, labelFor, helper, helperId, children }: { label: string; labelFor?: string; helper?: ReactNode; helperId?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      {labelFor ? (
        <label htmlFor={labelFor} className="pt-1.5 text-13 font-medium">{label}</label>
      ) : (
        <p className="pt-1.5 text-13 font-medium">{label}</p>
      )}
      <div className="min-w-0 space-y-1.5">
        {children}
        {helper && <p id={helperId} className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    </div>
  );
}

/** Inline outcome line: a polite status, or an alert for failures. */
export function InlineMessage({ tone, children, className }: { tone: 'error' | 'success' | 'info'; children: ReactNode; className?: string }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('text-sm', tone === 'error' ? 'text-error' : tone === 'success' ? 'text-profit' : 'text-muted-foreground', className)}
    >
      {children}
    </p>
  );
}
