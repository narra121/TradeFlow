import { useId } from 'react';
import { OTPInput } from 'input-otp';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const LENGTH = 6;

interface CodeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called once with the full code (typed, pasted or filled from SMS / mail autofill). */
  onComplete?: (value: string) => void;
  label?: string;
  /** Screen-reader sentence after the label; says what the last digit does. */
  help?: string;
  error?: string;
  /** The code was accepted: slots take the success colour. */
  accepted?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
}

/** One real input drawn as six slots (DESIGN-AUTH §4.5): one label, `one-time-code` autofill, paste works, no stale digits. */
export function CodeInput({ id: idProp, value, onChange, onComplete, label = 'Verification code', help, error, accepted, readOnly, autoFocus }: CodeInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {help && <span className="sr-only">, {help}</span>}
      </label>
      <OTPInput
        id={id}
        maxLength={LENGTH}
        value={value}
        onChange={(v) => onChange(v.replace(/\D/g, ''))}
        onComplete={onComplete}
        pattern="^[0-9]*$"
        inputMode="numeric"
        autoComplete="one-time-code"
        readOnly={readOnly}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        containerClassName={cn('code', error && 'invalid', accepted && 'done')}
        render={({ slots }) => (
          <>
            {slots.map((s, i) => (
              <span key={i} className={cn('slot', s.char && 'filled', s.isActive && 'active', s.hasFakeCaret && 'caret')} aria-hidden="true">
                {s.char}
              </span>
            ))}
          </>
        )}
      />
      {error && (
        <p className="field-error" id={errorId}>
          <CircleAlert className="ico" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
