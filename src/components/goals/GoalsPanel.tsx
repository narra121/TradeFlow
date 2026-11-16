import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { GoalMeter } from '@/components/goals/GoalMeter';
import { HistoryStrip } from '@/components/goals/HistoryStrip';
import { GOAL_LABEL, GOAL_ORDER, goalValue, isLimit, periodNoun, streakOf, streakText, trackStatus, validateTarget, type Glyph, type GoalType, type PeriodRef, type StatusTone } from '@/components/goals/goalMath';
import { cn } from '@/lib/utils';
import { readApiError } from '@/lib/apiError';

export interface Track {
  type: GoalType;
  current: number;
  target: number;
  /** No goal of the user's own: the starter target is shown without a verdict. */
  isDefault: boolean;
  /** The figure is the sum (or average) of the account goals, so it has nothing to edit; choose an account for that. */
  derived?: boolean;
  tradeCount: number;
  /** Why the figures are not shown (a drawdown limit with no starting balance to measure against). */
  unavailable?: string;
}

interface GoalsPanelProps {
  tracks: Track[];
  period: PeriodRef;
  live: boolean;
  readOnly: boolean;
  currency?: string;
  context?: React.ReactNode;
  history: Record<GoalType, { period: PeriodRef; glyph: Glyph }[]>;
  historyLoading: boolean;
  onSave: (type: GoalType, value: number) => Promise<void>;
}

const TONE_TEXT: Record<StatusTone, string> = { good: 'text-foreground', warn: 'text-warning', bad: 'text-loss', neutral: 'text-muted-foreground' };

function TrackRow({ track, period, live, readOnly, currency, history, historyLoading, onSave }: Omit<GoalsPanelProps, 'tracks' | 'context'> & { track: Track }) {
  const { type } = track;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const label = GOAL_LABEL[type];

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const status = trackStatus({ type, current: track.current, target: track.target, currency, tradeCount: track.tradeCount, period, live });
  const shown = track.isDefault ? { ...status, text: 'Default — set your own', tone: 'neutral' as StatusTone, pace: undefined } : status;
  const unitHint = type === 'profit' ? currency ?? '' : type === 'maxTrades' ? 'trades' : '%';
  const strip = history[type] ?? [];
  const streak = streakText(type, period.period, streakOf(strip.map((c) => c.glyph)));
  // A win rate of no trades is unknown, not 0.0% (as on the dashboard).
  const noWinRate = type === 'winRate' && track.tradeCount === 0;
  const valueText = noWinRate
    ? `— of ${goalValue(type, track.target, currency)}`
    : `${goalValue(type, track.current, currency)} of ${goalValue(type, track.target, currency)}${type === 'winRate' ? ` · ${track.tradeCount} ${track.tradeCount === 1 ? 'trade' : 'trades'}` : ''}`;

  const startEdit = () => {
    setValue(String(track.target));
    setError(undefined);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(undefined);
    requestAnimationFrame(() => editRef.current?.focus());
  };
  const submit = async () => {
    const r = validateTarget(type, value);
    if (r.error || r.value === undefined) {
      setError(r.error);
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave(type, r.value);
      setEditing(false);
      requestAnimationFrame(() => editRef.current?.focus());
    } catch (err) {
      setError(readApiError(err, 'Couldn’t save the target.').message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="space-y-1.5 border-b border-border px-4 py-3 last:border-b-0">
      <div className="grid items-center gap-x-4 gap-y-1.5 md:grid-cols-[176px_minmax(0,1fr)_minmax(0,220px)_auto]">
        <h3 className="text-13 font-medium">{label}</h3>
        <div className="min-w-0 space-y-1.5">
          {editing ? (
            <form
              onSubmit={(e) => { e.preventDefault(); void submit(); }}
              onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), cancel())}
              className="flex flex-wrap items-start gap-2"
            >
              <div>
                <label htmlFor={`goal-${type}`} className="sr-only">{label}</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    id={`goal-${type}`}
                    ref={inputRef}
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(undefined); }}
                    aria-invalid={!!error}
                    aria-describedby={error ? `goal-${type}-error` : undefined}
                    className="h-8 w-28 font-mono text-13"
                  />
                  <span className="text-xs text-muted-foreground">{unitHint}</span>
                </div>
                {error && <p id={`goal-${type}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
              </div>
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={saving}>Cancel</Button>
            </form>
          ) : (
            track.unavailable ? (
              <p className="text-13 text-muted-foreground">{track.unavailable}</p>
            ) : (
            <>
              <p className="font-mono text-13 tabular-nums">{valueText}</p>
              <GoalMeter
                label={label}
                valueText={`${valueText}, ${shown.text}`}
                fill={shown.fill}
                tone={track.isDefault ? 'neutral' : shown.tone}
                pace={track.isDefault ? undefined : shown.pace}
                tick={isLimit(type) ? shown.tick : undefined}
              />
            </>
            )
          )}
        </div>
        <p className={cn('text-13', TONE_TEXT[shown.tone])}>{!editing && !track.unavailable && shown.text}</p>
        <div className="justify-self-end">
          {!readOnly && !editing && !track.derived && <Button ref={editRef} type="button" size="sm" variant="outline" onClick={startEdit} aria-label={`Edit ${label}`}>Edit</Button>}
        </div>
      </div>
      {track.derived && !track.unavailable && <p className="text-xs text-muted-foreground md:pl-[192px]">Combined from your account goals. Choose an account to change it.</p>}
      {!track.isDefault && !track.unavailable && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:pl-[192px]">
          <span>Last 8 {periodNoun(period.period)}s</span>
          <HistoryStrip type={type} cells={strip} loading={historyLoading} label={`${label}, last 8 ${periodNoun(period.period)}s`} />
          {streak && <span>{streak}</span>}
        </div>
      )}
    </li>
  );
}

/** Four goal tracks in one panel: value of target, bullet bar, status words, edit, and the eight-period history. */
export function GoalsPanel({ tracks, period, live, readOnly, currency, context, history, historyLoading, onSave }: GoalsPanelProps) {
  const ordered = GOAL_ORDER.map((t) => tracks.find((x) => x.type === t)).filter((t): t is Track => !!t);
  return (
    <Panel title="Goals" actions={context} padded={false} aria-label="Goals">
      <ul>
        {ordered.map((t) => (
          <TrackRow key={t.type} track={t} period={period} live={live} readOnly={readOnly} currency={currency} history={history} historyLoading={historyLoading} onSave={onSave} />
        ))}
      </ul>
    </Panel>
  );
}
