import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/public/BrandMark';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { StageBar } from '@/components/auth/StageBar';
import { StepRow } from '@/components/auth/StepRow';
import { SCENES, type AuthScene, type StageData } from '@/components/auth/scenes';
import { ReadyContext, useFade } from '@/components/auth/useFade';
import { StageVisual } from '@/components/auth/visual/StageVisual';
import { useSeen } from '@/components/auth/visual/useSeen';
import '@/components/auth/auth.css';

const AuthField = lazy(() => import('@/components/auth/visual/demos').then((m) => ({ default: m.AuthField })));

/** Wrapper for the content of one view: it fades in when the view changes and not on first paint. */
export function FadeIn({ children }: { children: React.ReactNode }) {
  return <div className={useFade()}>{children}</div>;
}

export type AuthPane = 'journal' | 'signup' | 'none';

interface AuthFrameProps {
  /** `journal` and `signup` put a stage beside the form; `none` is one card on the field (the account-deleted page). */
  pane?: AuthPane;
  /** The stage's scene when it is not the pane's own (verify, reset, signed out, the Google callback). */
  scene?: AuthScene;
  /** What the scene mirrors from the form beside it. */
  stage?: StageData;
  /** The other way in, in the top row: `New here? Create account` / `Have an account? Log in`. */
  alternate?: { prompt: string; label: string; to: string; state?: unknown };
  /** Shows the sign-up step row above the heading. */
  step?: 1 | 2;
  children: React.ReactNode;
}

const FOOTER_LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/security', label: 'Security' },
  { to: '/status', label: 'Status' },
];

const NO_DATA: StageData = {};

/**
 * One full-bleed screen (DESIGN-AUTH-V2 §2). From 1024 px: a form sheet on the left from top to bottom, and the stage
 * filling the rest (display line, live product demo, a closing bar) over the landing page's particle field. Below
 * 1024 px the same parts stack, form first. The form comes first in the DOM; the field and the demos are a lazy chunk
 * mounted after the first paint into boxes whose size CSS reserves. The frame stays mounted while the view changes.
 */
export function AuthFrame({ pane = 'journal', scene: sceneProp, stage = NO_DATA, alternate, step, children }: AuthFrameProps) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const seen = useSeen(root);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  const scene = pane === 'none' ? null : (sceneProp ?? pane);
  const meta = scene ? SCENES[scene] : null;
  const product = scene === 'journal' || scene === 'signup';
  const field = seen && (
    <Suspense fallback={null}>
      <AuthField mode={meta?.field.mode ?? 'calm'} shape={meta?.field.shape ?? 'calendar'} paused={paused} anchorKey={scene ?? 'none'} frozen={!meta} />
    </Suspense>
  );

  return (
    <ReadyContext.Provider value={ready}>
      <div ref={root} className="tq-auth" data-scene={scene ?? 'none'}>
        <div className="auth-sheet-bg" aria-hidden="true" />
        {!meta && (
          <div className="auth-bg" aria-hidden="true">
            {field}
          </div>
        )}
        <header className="auth-top">
          <Link to="/" className="brand" aria-label="TradeQut home">
            <BrandMark />
          </Link>
          {alternate && (
            <p className="alt">
              <span>{alternate.prompt}</span>
              <Link to={alternate.to} state={alternate.state} className="btn btn-outline btn-sm">
                {alternate.label}
              </Link>
            </p>
          )}
        </header>
        <main className="auth-main" id="main">
          <div className="auth-card">
            {step && <StepRow current={step} />}
            {children}
          </div>
        </main>
        {scene && meta && (
          <div className="auth-stage">
            <div className="auth-bg" aria-hidden="true">
              {field}
            </div>
            <div className="auth-head" data-field-anchor="narrow">
              <Eyebrow>{meta.eyebrow}</Eyebrow>
              <p className="auth-display">
                <span className="dim">{meta.line[0]}</span> {meta.line[1]}
              </p>
            </div>
            <aside className="auth-visual" aria-label={product ? 'What TradeQut looks like' : 'About this step'}>
              <StageVisual scene={scene} data={stage} paused={paused} seen={seen} />
            </aside>
            <StageBar meta={meta} bar={scene === 'mail' && stage.facts ? 'facts' : meta.bar} paused={paused} onToggle={() => setPaused((p) => !p)} />
          </div>
        )}
        <footer className="auth-foot">
          <nav aria-label="Legal and status">
            <ul>
              {FOOTER_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </footer>
      </div>
    </ReadyContext.Provider>
  );
}
