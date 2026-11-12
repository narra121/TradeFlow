import { useId, useState } from 'react';
import { Check, Circle, CircleAlert, TriangleAlert } from 'lucide-react';
import { PASSWORD_RULES } from '@/components/auth/passwordRules';
import { cn } from '@/lib/utils';

interface PasswordFieldProps {
  /** Stable id so an error summary can link to the field. */
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
  /** Shown at the right of the label row (`Forgot password?`). */
  labelAction?: React.ReactNode;
  /** Show the pool's policy checklist once the field has been focused or a submit failed. */
  checklist?: boolean;
  /** Forces the checklist open (after a failed submit). */
  revealChecklist?: boolean;
  /** A request is running: the field stays focusable and keeps its value. */
  readOnly?: boolean;
  autoFocus?: boolean;
}

/** The real pool policy as a live checklist: icon + text for each rule, never colour alone (A.15, D.9). */
export function PolicyChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} aria-label="Password requirements" className="policy">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.id} className={cn(ok && 'met', r.id === 'symbol' && 'wide')}>
            {ok ? <Check className="ico" aria-hidden="true" /> : <Circle className="ico" aria-hidden="true" />}
            {r.label}
            <span className="sr-only">{ok ? ' (met)' : ' (not met yet)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PasswordField({ id: idProp, label, value, onChange, autoComplete, error, labelAction, checklist, revealChecklist, readOnly, autoFocus }: PasswordFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [caps, setCaps] = useState(false);
  const listId = `${id}-policy`;
  const errorId = `${id}-error`;
  const capsId = `${id}-caps`;
  const listOpen = checklist && (focused || revealChecklist);
  const describedBy = [error ? errorId : null, caps ? capsId : null, listOpen ? listId : null].filter(Boolean).join(' ') || undefined;
  const readCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState('CapsLock'));

  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="pw">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={cn('input', show && 'font-mono')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setCaps(false)}
          onKeyDown={readCaps}
          onKeyUp={readCaps}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required
          readOnly={readOnly}
          autoFocus={autoFocus}
        />
        <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {/* After the input in the DOM so Tab goes email → password → Show → Forgot password?; drawn on the label row. */}
      {labelAction}
      {error && (
        <p id={errorId} className="field-error">
          <CircleAlert className="ico" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {caps && (
        <p id={capsId} className="field-hint warn" aria-live="polite">
          <TriangleAlert className="ico" aria-hidden="true" />
          Caps Lock is on.
        </p>
      )}
      {listOpen && <PolicyChecklist password={value} id={listId} />}
    </div>
  );
}
