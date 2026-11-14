import { useId, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { useGetInsightSettingsQuery, useSetInsightSettingsMutation } from '@/store/api/insightsApi';
import { cn } from '@/lib/utils';
import { openTrialExpired } from '@/components/billing/readOnly';
import { useEntitlements } from '@/hooks/useEntitlements';

export const NOTES_OFF =
  'Off. Reports do not send your notes or key lessons. Switched on, each new report sends the notes and key lessons of its trades through OpenRouter to OpenAI, and the weekly review adds the themes it finds in them. Chat never sends them.';
export const NOTES_ON =
  'On. Each new report sends the notes and key lessons of its trades through OpenRouter to OpenAI, which looks for themes. Chat never sends them. You can switch it off at any time.';

/** The "Use my notes" setting (PUT /insights/settings), off unless the trader switches it on. */
export function NotesSwitch({ className }: { className?: string }) {
  const { data, isLoading, isError, refetch } = useGetInsightSettingsQuery();
  const [save, { isLoading: saving }] = useSetInsightSettingsMutation();
  const { readOnly } = useEntitlements();
  const [failed, setFailed] = useState<boolean | null>(null);
  const id = useId();
  const on = data?.useNotes ?? false;

  const toggle = async (next: boolean) => {
    setFailed(null);
    if (readOnly) return openTrialExpired();
    try {
      await save({ useNotes: next }).unwrap();
    } catch {
      setFailed(next);
    }
  };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Switch id={id} checked={on} disabled={isLoading || isError || saving} onCheckedChange={(v) => void toggle(v)} aria-describedby={`${id}-desc`} className="mt-0.5" />
      <div className="min-w-0 space-y-1">
        <label htmlFor={id} className="text-13 font-medium">Use my notes</label>
        <p id={`${id}-desc`} className="max-w-prose text-xs text-muted-foreground">
          {isLoading ? 'Loading this setting…' : on ? NOTES_ON : NOTES_OFF}
        </p>
        {isError && (
          <p role="alert" className="text-xs text-loss">
            Couldn’t load this setting.{' '}
            <button type="button" onClick={() => void refetch()} className="text-primary underline underline-offset-2">Retry</button>
          </p>
        )}
        {failed !== null && <p role="alert" className="text-xs text-loss">Couldn’t switch it {failed ? 'on' : 'off'}. It is still {failed ? 'off' : 'on'}. Try again.</p>}
      </div>
    </div>
  );
}
