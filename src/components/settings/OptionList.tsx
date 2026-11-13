import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readApiError } from '@/lib/apiError';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { hasValue, isStarterList, ownEntries, type ListDef } from '@/components/settings/optionLists';

interface OptionListProps {
  def: ListDef;
  values: string[];
  /** Trades using each value, from the loaded scope; absent while trades load. */
  usage?: Map<string, number>;
  saving: boolean;
  onAdd: (value: string) => Promise<void>;
  onRemove: (value: string) => Promise<void>;
  onReset: () => Promise<void>;
}

function tradesPhrase(n: number): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'trade' : 'trades'}`;
}

/** One pick list: chips with a usage count and a named remove button, an add field, a per-list reset; remove and reset confirm (SC §8.2). */
export function OptionList({ def, values, usage, saving, onAdd, onRemove, onReset }: OptionListProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const run = async (action: () => Promise<void>, failure: string) => {
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage({ kind: 'error', text: `${failure} ${readApiError(err, 'Try again.').message}` });
    }
  };

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (hasValue(values, value)) return setMessage({ kind: 'info', text: `"${value}" is already in the list` });
    setDraft('');
    void run(() => onAdd(value), `Couldn't add "${value}".`);
  };

  const own = ownEntries(def, values);
  const starter = isStarterList(def, values);
  const removingCount = removing && usage ? usage.get(removing) ?? 0 : 0;

  return (
    <section aria-labelledby={`${inputId}-h`} className="border-t border-border py-4 first:border-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={`${inputId}-h`} className="text-13 font-semibold">
          {def.title}
          {saving && <span className="ml-2 text-xs font-normal text-muted-foreground">Saving…</span>}
        </h3>
        <Button type="button" variant="ghost" size="sm" disabled={starter || saving} onClick={() => setResetting(true)}>
          Reset to defaults
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="mb-2 text-13 text-muted-foreground">{`No ${def.title.toLowerCase()} yet.`}</p>
      ) : (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={def.title}>
          {values.map((v) => {
            const n = usage ? usage.get(v) ?? 0 : undefined;
            return (
              <li key={v} className="flex max-w-full items-center rounded-sm border border-border bg-secondary text-13">
                <span className="truncate py-1 pl-2">
                  {v}
                  {n !== undefined && <span className="font-mono text-xs text-muted-foreground">{` · ${n.toLocaleString('en-US')}`}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${v}`}
                  disabled={saving}
                  onClick={() => setRemoving(v)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-error disabled:opacity-50 max-md:h-11 max-md:w-11"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">{`Add a ${def.noun}`}</label>
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setMessage(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={`Add a ${def.noun}…`}
          maxLength={60}
          autoComplete="off"
          className="max-w-xs max-md:h-11"
        />
        <Button type="button" variant="outline" disabled={!draft.trim() || saving} onClick={add} className="max-md:h-11">
          Add
        </Button>
      </div>
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'mt-1.5 text-xs text-error' : 'mt-1.5 text-xs text-muted-foreground'}>
          {message.text}
        </p>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Remove "${removing ?? ''}" from the list?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {usage === undefined ? 'Trades keep it; it only leaves the pick list.' : removingCount > 0 ? `${tradesPhrase(removingCount)} keep it; it only leaves the pick list.` : 'No loaded trade uses it. It only leaves the pick list.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const value = removing as string;
                setRemoving(null);
                void run(() => onRemove(value), `Couldn't remove "${value}".`);
              }}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetting} onOpenChange={setResetting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Reset ${def.title} to the starter list?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {own.length > 0
                ? `Your ${own.length} own ${own.length === 1 ? 'entry is' : 'entries are'} removed from the pick list. Trades keep their values.`
                : 'Starter entries you removed come back. Trades keep their values.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setResetting(false);
                void run(onReset, `Couldn't reset ${def.title}.`);
              }}
            >
              {`Reset ${def.title}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
