import { cn } from '@/lib/utils';
import type { SaveState } from '@/components/settings/useSaveState';

export function SectionHeading({ id, title, hint }: { id?: string; title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <h2 id={id} className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A settings row: 200 px label column, the control, helper text under the control; stacks on phones. */
export function Row({ label, helper, children, htmlFor, helperId }: { label: string; helper?: string; children: React.ReactNode; htmlFor?: string; helperId?: string }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      {htmlFor ? <label htmlFor={htmlFor} className="pt-1.5 text-13 font-medium">{label}</label> : <p className="pt-1.5 text-13 font-medium">{label}</p>}
      <div className="min-w-0 space-y-1">
        {children}
        {helper && <p id={helperId} className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    </div>
  );
}


/** The outcome line of an auto-saving section: `Saving…` → `All changes saved`, or the failure and what happened to the control. */
export function SaveStatus({ state, errorText = "Couldn't save. The value was put back." }: { state: SaveState; errorText?: string }) {
  const text = state === 'saving' ? 'Saving…' : state === 'saved' ? 'All changes saved' : state === 'error' ? errorText : '';
  return (
    <p role={state === 'error' ? 'alert' : 'status'} className={cn('h-5 text-xs', state === 'error' ? 'text-error' : 'text-muted-foreground')}>
      {text}
    </p>
  );
}
