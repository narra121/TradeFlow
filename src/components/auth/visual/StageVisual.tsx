import { lazy, Suspense } from 'react';
import { Check, Mail } from 'lucide-react';
import type { AuthScene, StageData } from '@/components/auth/scenes';

const JournalDemo = lazy(() => import('./demos').then((m) => ({ default: m.JournalDemo })));
const SignupDemo = lazy(() => import('./demos').then((m) => ({ default: m.SignupDemo })));
const StillJournal = lazy(() => import('./demos').then((m) => ({ default: m.StillJournal })));

interface StageVisualProps {
  scene: AuthScene;
  data: StageData;
  paused: boolean;
  /** The frame has been painted and is on screen: the demo chunk may load. */
  seen: boolean;
}

const RESET_STEPS = ['Email a code', 'Choose a new password', 'Back in your journal'];
const RESET_KEEPS: [string, string][] = [
  ['Password', 'New'],
  ['Trades, notes and screenshots', 'Unchanged'],
  ['Goals and rules', 'Unchanged'],
  ['Plan and billing', 'Unchanged'],
];

/** Verify: the message the visitor is looking for, with tiles that fill as the code is typed beside it. */
function MailCard({ email, codeLength = 0, verified = false }: Pick<StageData, 'email' | 'codeLength' | 'verified'>) {
  return (
    <div className="stage-card mail" role="img" aria-label={`A message with a 6-digit code${email ? ` for ${email}` : ''}.`}>
      <div aria-hidden="true">
        <p className="stage-card__title">
          <Mail className="ico" />
          In your inbox
        </p>
        {email && (
          <p className="mail__to">
            <span>To</span>
            <strong>{email}</strong>
          </p>
        )}
        <p className="mail__label">Your 6-digit code</p>
        <div className="mail__code" data-done={verified || undefined}>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} data-on={i < codeLength || verified || undefined} />
          ))}
        </div>
        <p className="mail__hint">{verified ? 'Code accepted.' : 'Type it in the form to verify your email.'}</p>
      </div>
    </div>
  );
}

/** Reset: where the visitor is in the three steps, and the one thing a reset changes. */
function ResetCard({ step = 1 }: { step?: 1 | 2 | 3 }) {
  return (
    <div className="stage-card reset">
      <ol className="reset__steps" aria-label="Password reset steps">
        {RESET_STEPS.map((label, i) => (
          <li key={label} aria-current={i + 1 === step ? 'step' : undefined} data-done={i + 1 < step || undefined}>
            <span className="n" aria-hidden="true">
              {i + 1 < step ? <Check className="ico" /> : `0${i + 1}`}
            </span>
            {label}
            {i + 1 < step && <span className="sr-only"> (done)</span>}
          </li>
        ))}
      </ol>
      <p className="stage-card__title">What a reset changes</p>
      <dl className="stage-rows">
        {RESET_KEEPS.map(([what, state]) => (
          <div key={what}>
            <dt>{what}</dt>
            <dd data-new={state === 'New' || undefined}>{state}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Signed out: what log out did on this browser (DESIGN-AUTH §3.9: tokens, the trade and image caches and drafts are removed). */
function ClosedCard({ everywhere = false }: { everywhere?: boolean }) {
  const rows: [string, string][] = [
    ['Session on this browser', 'Ended'],
    ['Cached trades and images', 'Removed'],
    ['Unsaved trade drafts', 'Removed'],
    ...(everywhere ? ([['Other devices', 'Log in again at their next renewal']] as [string, string][]) : []),
  ];
  return (
    <div className="stage-card closed">
      <p className="stage-card__title">This browser</p>
      <dl className="stage-rows">
        {rows.map(([what, state]) => (
          <div key={what}>
            <dt>{what}</dt>
            <dd>
              <Check className="ico" aria-hidden="true" />
              {state}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The picture box of the stage. Its size is reserved in CSS, so the demos (a lazy chunk with the stageshow kit) arrive
 * without moving anything; the cards for verify, reset and signed out are plain markup and render at once.
 */
export function StageVisual({ scene, data, paused, seen }: StageVisualProps) {
  return (
    <div className="stage-box" data-field-anchor="wide">
      {scene === 'journal' && seen && (
        <Suspense fallback={null}>
          <JournalDemo paused={paused} />
        </Suspense>
      )}
      {scene === 'signup' && seen && (
        <Suspense fallback={null}>
          <SignupDemo paused={paused} />
        </Suspense>
      )}
      {scene === 'opening' && (
        <p className="stage-status tq-eyebrow" key="opening">
          Checking your Google account
        </p>
      )}
      {scene === 'mail' && (
        <div className="stage-reveal" key="mail">
          <MailCard email={data.email} codeLength={data.codeLength} verified={data.verified} />
        </div>
      )}
      {scene === 'reset' && (
        <>
          <div className="stage-under" aria-hidden="true">
            {seen && (
              <Suspense fallback={null}>
                <StillJournal />
              </Suspense>
            )}
          </div>
          <div className="stage-reveal" key="reset">
            <ResetCard step={data.resetStep} />
          </div>
        </>
      )}
      {scene === 'closed' && (
        <div className="stage-reveal" key="closed">
          <ClosedCard everywhere={data.everywhere} />
        </div>
      )}
    </div>
  );
}
