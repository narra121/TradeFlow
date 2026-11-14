import { useId, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { readApiError } from '@/lib/apiError';

interface ReviewedSwitchProps {
  checked: boolean;
  disabled?: boolean;
  /** Saves the new value; a rejection is shown under the switch and the switch goes back. */
  onChange: (reviewed: boolean) => Promise<unknown>;
}

/** "Reviewed · followed plan": one tap that saves the trade's `reviewed` flag. */
export function ReviewedSwitch({ checked, disabled, onChange }: ReviewedSwitchProps) {
  const id = useId();
  const [saving, setSaving] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: boolean) => {
    setSaving(next);
    setError(null);
    try {
      await onChange(next);
    } catch (err) {
      setError(readApiError(err, '').message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Switch id={id} checked={saving ?? checked} onCheckedChange={(v) => void save(v)} disabled={disabled || saving !== null} aria-describedby={`${id}-hint`} />
        <label htmlFor={id} className="text-sm font-medium">
          Reviewed · followed plan
        </label>
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Switch on when you have gone over this trade and it went to your plan.
      </p>
      {error !== null && (
        <p role="alert" className="text-xs text-loss">
          Couldn’t save.{error ? ` ${error}` : ''}
        </p>
      )}
    </div>
  );
}
