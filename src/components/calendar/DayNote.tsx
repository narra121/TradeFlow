import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useSaveDayNoteMutation, NOTE_MAX, type DayNote as DayNoteData, type DayNotesArgs } from '@/store/api/journalApi';
import { useOnline } from '@/hooks/useOnline';
import { readApiError } from '@/lib/apiError';

interface DayNoteProps {
  date: string;
  scope: string;
  note?: DayNoteData;
  range: DayNotesArgs;
  readOnly?: boolean;
}

type Field = 'plan' | 'review';
const LABEL: Record<Field, string> = { plan: 'Plan', review: 'Review' };
const HINT: Record<Field, string> = { plan: 'Before the session: levels, limits, what you will skip.', review: 'After the session: what happened and what you would change.' };

/** One note per day and account scope with two parts; each part saves when it loses focus. */
export function DayNote({ date, scope, note, range, readOnly }: DayNoteProps) {
  const online = useOnline();
  const locked = readOnly || !online;
  const [save, { isLoading }] = useSaveDayNoteMutation();
  const [values, setValues] = useState<Record<Field, string>>({ plan: note?.plan ?? '', review: note?.review ?? '' });
  const [saved, setSaved] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = async (field: Field) => {
    const next = values[field].trim();
    if (next === (note?.[field] ?? '').trim()) return;
    setError(null);
    try {
      await save({ date, scope, [field]: next, range }).unwrap();
      setSaved(field);
    } catch (e) {
      setError(readApiError(e).message || `Couldn't save the ${LABEL[field].toLowerCase()}. Check your connection and try again.`);
    }
  };

  return (
    <section aria-labelledby="day-note-heading" className="space-y-3 border-t border-border p-3">
      <div className="flex items-center justify-between">
        <h3 id="day-note-heading" className="text-xs font-medium text-muted-foreground">Day note</h3>
        <span role="status" className="text-xs text-muted-foreground">{isLoading ? 'Saving…' : saved ? 'Saved' : ''}</span>
      </div>
      {(['plan', 'review'] as Field[]).map((field) => {
        const id = `day-note-${field}`;
        return (
          <div key={field} className="space-y-1">
            <label htmlFor={id} className="text-xs font-medium text-foreground-soft">{LABEL[field]}</label>
            <Textarea
              id={id}
              rows={3}
              maxLength={NOTE_MAX}
              value={values[field]}
              readOnly={locked}
              aria-describedby={`${id}-hint`}
              placeholder={HINT[field]}
              onChange={(e) => { setValues((v) => ({ ...v, [field]: e.target.value })); setSaved(null); }}
              onBlur={() => void commit(field)}
              className="min-h-[72px] text-13"
            />
            <p id={`${id}-hint`} className="text-2xs text-muted-foreground">{values[field].length.toLocaleString('en-US')} of {NOTE_MAX.toLocaleString('en-US')} characters</p>
          </div>
        );
      })}
      {!online && <p className="text-xs text-muted-foreground">Notes are read-only while you’re offline.</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
