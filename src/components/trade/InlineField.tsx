import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { useOnline } from '@/hooks/useOnline';
import { cn } from '@/lib/utils';
import { readApiError } from '@/lib/apiError';

export interface InlineEditorApi<T> {
  draft: T;
  setDraft: (v: T) => void;
  /** Saves the draft and leaves edit mode. */
  commit: (next?: T) => void;
  cancel: () => void;
}

interface InlineFieldProps<T> {
  label: string;
  value: T;
  /** Read-only rendering; shown inside the button that starts editing. */
  display: React.ReactNode;
  /** Persists the value; rejects when the save fails (the control stays open with the typed value). */
  onCommit: (next: T) => Promise<void>;
  /** The editor; focus is moved to the first focusable element it renders. */
  children: (api: InlineEditorApi<T>) => React.ReactNode;
  equals?: (a: T, b: T) => boolean;
  /** Layout: label left, value right (default) or stacked for long text. */
  stacked?: boolean;
  /** Shown as plain text with no edit affordance (read-only account). */
  disabled?: boolean;
  className?: string;
}

const defaultEquals = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Journal field edited in place: click or Enter opens the editor, blur / Enter saves, Esc reverts.
 * After a save "Saved · Undo" is shown for 5 s; a failed save keeps the editor open with "Couldn't save · Retry".
 */
export function InlineField<T>({ label, value, display, onCommit, children, equals = defaultEquals, stacked, disabled: disabledProp, className }: InlineFieldProps<T>) {
  // Offline, a field cannot be saved: it reads as plain text until the connection is back (E-007).
  const online = useOnline();
  const disabled = disabledProp || !online;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [reason, setReason] = useState('');
  const previous = useRef<T>(value);
  const saving = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number>();

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = wrapRef.current?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex="0"]');
    el?.focus();
  }, [editing]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flashSaved = () => {
    setStatus('saved');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 5000);
  };

  const commit = useCallback(
    async (next: T) => {
      // Enter and then the blur it causes both commit: only the first one is sent.
      if (saving.current) return;
      if (equals(next, value)) {
        setEditing(false);
        return;
      }
      previous.current = value;
      saving.current = true;
      setStatus('saving');
      try {
        await onCommit(next);
        setEditing(false);
        flashSaved();
        requestAnimationFrame(() => buttonRef.current?.focus());
      } catch (err) {
        setReason(readApiError(err, '').message);
        setStatus('error');
      } finally {
        saving.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, onCommit, equals],
  );

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
    setStatus('idle');
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, [value]);

  const undo = async () => {
    try {
      await onCommit(previous.current);
      setStatus('idle');
    } catch (err) {
      setReason(readApiError(err, '').message);
      setStatus('error');
    }
  };

  const api: InlineEditorApi<T> = { draft, setDraft, commit: (n) => void commit(n ?? draft), cancel };

  return (
    <div className={cn(stacked ? 'space-y-1' : 'grid grid-cols-[7rem_1fr] items-start gap-2', className)}>
      <div className="flex items-center gap-2 pt-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1 font-normal text-profit" role="status">
            <Check className="h-3 w-3" aria-hidden="true" /> Saved
            <button type="button" className="underline underline-offset-2" onClick={undo}>
              Undo
            </button>
          </span>
        )}
      </div>
      <div ref={wrapRef} className="min-w-0">
        {editing ? (
          <div
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                cancel();
              }
            }}
            onBlur={(e) => {
              const to = e.relatedTarget as HTMLElement | null;
              // The editor's own popover is portalled outside the wrapper: focus moving into it is not leaving the field.
              if (wrapRef.current?.contains(to) || to?.closest('[data-radix-popper-content-wrapper]')) return;
              void commit(draft);
            }}
          >
            {children(api)}
            {status === 'error' && (
              <p role="alert" className="mt-1 text-xs text-loss">
                Couldn’t save.{reason ? ` ${reason}` : ''}{' '}
                <button type="button" className="underline" onClick={() => void commit(draft)}>
                  Retry
                </button>
              </p>
            )}
          </div>
        ) : disabled ? (
          <div className="min-h-8 whitespace-pre-wrap break-words rounded px-1.5 py-1 text-sm text-foreground-soft">{display}</div>
        ) : (
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setEditing(true)}
            className="group flex min-h-8 w-full items-start [@media(pointer:coarse)]:min-h-11 gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-muted"
          >
            <span className="sr-only">Edit {label.toLowerCase()}: </span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{display}</span>
            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
