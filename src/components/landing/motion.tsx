import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Pause, Play } from 'lucide-react';

interface LandingMotion {
  /** Nothing animates: the OS asks for reduced motion, or the visitor pressed Pause. */
  still: boolean;
  paused: boolean;
  toggle: () => void;
}

const MotionContext = createContext<LandingMotion>({ still: true, paused: true, toggle: () => {} });

export const useLandingMotion = () => useContext(MotionContext);

/** Starts paused under prefers-reduced-motion, as Forma does; the visitor can switch either way (WCAG 2.2.2). */
export function LandingMotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPaused(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return <MotionContext.Provider value={{ still: paused, paused, toggle: () => setPaused((p) => !p) }}>{children}</MotionContext.Provider>;
}

export function MotionToggle() {
  const { paused, toggle } = useLandingMotion();
  return (
    <button type="button" className="lp-motion" onClick={toggle} aria-pressed={paused} aria-label={paused ? 'Play animations' : 'Pause animations'}>
      {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
    </button>
  );
}

/** Calls `onFrame` (rAF-throttled) on scroll and resize while mounted. */
export function useScrollFrame(onFrame: () => void, deps: unknown[] = []) {
  useEffect(() => {
    let queued = 0;
    const run = () => {
      queued = 0;
      onFrame();
    };
    const schedule = () => {
      if (!queued) queued = requestAnimationFrame(run);
    };
    run();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** How far a tall section has been scrolled through its sticky child: 0 at its top, 1 when the child leaves. */
export function stickyProgress(section: HTMLElement, sticky: HTMLElement): number {
  const rect = section.getBoundingClientRect();
  const top = parseFloat(getComputedStyle(sticky).top || '0');
  const range = Math.max(1, section.offsetHeight - sticky.offsetHeight);
  return Math.min(1, Math.max(0, (top - rect.top) / range));
}

/** Scrolls so that `section`'s sticky child shows progress `p` (Forma's chapter buttons). */
export function scrollToProgress(section: HTMLElement, sticky: HTMLElement, p: number) {
  const top = parseFloat(getComputedStyle(sticky).top || '0');
  const start = section.getBoundingClientRect().top + window.scrollY - top;
  window.scrollTo({ top: start + (section.offsetHeight - sticky.offsetHeight) * p, behavior: 'smooth' });
}

/** The 2 px reading-progress line at the top of the page. */
export function PageProgress() {
  const [p, setP] = useState(0);
  useScrollFrame(() => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    setP(Math.min(1, Math.max(0, window.scrollY / Math.max(1, total))));
  });
  return <div className="lp-progress" aria-hidden="true" style={{ ['--p' as string]: p }} />;
}

export function useInView(ref: RefObject<Element>, rootMargin = '80px'): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return setInView(true);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
