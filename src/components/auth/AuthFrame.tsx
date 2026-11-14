import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/public/BrandMark';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { StageBar } from '@/components/auth/StageBar';
import { StepRow } from '@/components/auth/StepRow';
import { SCENES, type AuthScene, type SceneMeta, type StageData } from '@/components/auth/scenes';
import { ReadyContext, useFade } from '@/components/auth/useFade';
import { StageVisual } from '@/components/auth/visual/StageVisual';
import { useSeen } from '@/components/auth/visual/useSeen';
import '@/components/auth/auth.css';

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
  /** The other way in, under the form: `New here? Create account` / `Have an account? Log in`, with an optional second line. */
  alternate?: { prompt: string; note?: string; label: string; to: string; state?: unknown };
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
 * The scene's eyebrow and display line. Rendered twice, one copy per layout (CSS shows one): in the page header when the
 * parts stack, at the top of the stage in the split. Each copy sits in a landmark and the document order stays
 * header, form, stage, legal in both layouts.
 */
function Head({ meta, at }: { meta: SceneMeta; at: 'top' | 'stage' }) {
  return (
    <div className={`auth-head is-${at}`}>
      <Eyebrow>{meta.eyebrow}</Eyebrow>
      <p className="auth-display">
        <span className="dim">{meta.line[0]}</span> <span>{meta.line[1]}</span>
      </p>
    </div>
  );
}

/**
 * One full-bleed screen (DESIGN-AUTH-V2 §2). From 1024 px: a form sheet on the left from top to bottom, and the stage
 * filling the rest (display line, live product demo, a closing bar) on a plain background (DESIGN-SHARED S6.2: no canvas
 * or gradient behind a form). Below 1024 px the same parts stack, form first. The demos are a lazy chunk mounted after
 * the first paint into boxes whose size CSS reserves. The frame stays mounted while the view changes.
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

  return (
    <ReadyContext.Provider value={ready}>
      <div ref={root} className="tq-auth" data-scene={scene ?? 'none'}>
        <div className="auth-sheet-bg" aria-hidden="true" />
        <header className="auth-top">
          <Link to="/" className="brand" aria-label="TradeQut home">
            <BrandMark />
          </Link>
          {meta && <Head meta={meta} at="top" />}
        </header>
        <main className="auth-main" id="main">
          <div className="auth-card">
            {step && <StepRow current={step} />}
            {children}
          </div>
          {alternate && (
            <div className="auth-alt">
              <p>
                <strong>{alternate.prompt}</strong>
                {alternate.note && <span>{alternate.note}</span>}
              </p>
              <Link to={alternate.to} state={alternate.state} className="btn btn-outline">
                {alternate.label}
              </Link>
            </div>
          )}
        </main>
        {scene && meta && (
          <aside className="auth-stage" aria-label={product ? 'What TradeQut looks like' : 'About this step'}>
            <Head meta={meta} at="stage" />
            <div className="auth-visual">
              <StageVisual scene={scene} data={stage} paused={paused} seen={seen} />
            </div>
            <StageBar meta={meta} bar={scene === 'mail' && stage.facts ? 'facts' : meta.bar} paused={paused} onToggle={() => setPaused((p) => !p)} />
          </aside>
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
