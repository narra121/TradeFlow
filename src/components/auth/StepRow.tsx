import { Check } from 'lucide-react';

const STEPS = ['Create account', 'Verify email', 'First run'];

/** Where a new user is on the way in: sign up, verify, then the app's first-run page. Shown on sign up and on the verify view it opens. */
export function StepRow({ current }: { current: 1 | 2 }) {
  return (
    <ol className="steps" aria-label="Sign-up steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} aria-current={n === current ? 'step' : undefined} data-done={n < current || undefined}>
            <span className="n" aria-hidden="true">
              {n < current ? <Check className="ico" /> : `0${n}`}
            </span>
            {label}
            {n < current && <span className="sr-only"> (done)</span>}
          </li>
        );
      })}
    </ol>
  );
}
