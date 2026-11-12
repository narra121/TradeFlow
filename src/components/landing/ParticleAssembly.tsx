import { useEffect, useRef, useState } from 'react';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { CalendarStage } from '@/components/showcase/CalendarStage';
import { scrollToProgress, stickyProgress, useInView, useLandingMotion } from './motion';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/** The P&L calendar as line segments in scene fractions: frame, title row, weekday row, a 7 × 5 day grid. */
export function blueprint(): number[][] {
  const s: number[][] = [
    [0.1, 0.05, 0.9, 0.05], [0.9, 0.05, 0.9, 0.94], [0.9, 0.94, 0.1, 0.94], [0.1, 0.94, 0.1, 0.05],
    [0.1, 0.14, 0.9, 0.14], [0.13, 0.095, 0.25, 0.095], [0.68, 0.095, 0.87, 0.095], [0.13, 0.2, 0.87, 0.2],
  ];
  const x0 = 0.13, x1 = 0.87, y0 = 0.24, y1 = 0.91;
  for (let r = 0; r <= 5; r++) s.push([x0, y0 + ((y1 - y0) * r) / 5, x1, y0 + ((y1 - y0) * r) / 5]);
  for (let c = 0; c <= 7; c++) s.push([x0 + ((x1 - x0) * c) / 7, y0, x0 + ((x1 - x0) * c) / 7, y1]);
  return s;
}

export interface Pt { x: number; y: number; z: number; tx: number; ty: number; seed: number; size: number }

/** Forma's point cloud: a Fibonacci sphere whose points keep their identity while flying to the blueprint. */
export function cloud(segments: number[][], count: number): Pt[] {
  const lengths = segments.map((s) => Math.hypot(s[2] - s[0], s[3] - s[1]));
  const sum = lengths.reduce((a, b) => a + b, 0);
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    let d = (i / count) * sum;
    let k = 0;
    while (k < segments.length - 1 && d > lengths[k]) d -= lengths[k++];
    const s = segments[k];
    const u = d / lengths[k];
    const a = i * 2.39996323;
    const z = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - z * z);
    const shell = 0.68 + 0.32 * ((Math.sin(i * 71.7) + 1) / 2);
    pts.push({ x: Math.cos(a) * r * shell, y: Math.sin(a) * r * shell, z: z * shell, tx: lerp(s[0], s[2], u), ty: lerp(s[1], s[3], u), seed: (Math.sin(i * 93.13) + 1) / 2, size: i % 17 === 0 ? 1.55 : i % 5 === 0 ? 1.05 : 0.65 });
  }
  return pts;
}

const CALENDAR_ALT =
  'Sample data: the TradeQut calendar for November 2026, each trading day tinted by its net P&L (month +$370.50); 3 and 10 Nov are marked because their trades broke a rule, and 10 Nov shows −$76.25 over 4 trades.';
const TITLES = ['Every fill from the file.', 'Sorted into days.', 'Read as a month.'];
const STATUS = ['Reading the broker file', 'Sorting fills into days', 'Your month, net of charges'];
const CHAPTERS = ['Import', 'Review', 'Journal'];
const STOPS = [0.06, 0.56, 0.96];
/** The progress shown when nothing may move (reduced motion or Pause): the finished calendar. */
const STILL_P = 0.94;

/**
 * Section 01, Forma's assembly: scrolling turns a cloud of fills into the calendar's blueprint, then the real calendar
 * (a stageshow stage) comes forward. The canvas only runs while the section is on screen and motion is allowed.
 */
export function ParticleAssembly() {
  const { still } = useLandingMotion();
  const section = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const inView = useInView(section);
  const [phase, setPhase] = useState(2);
  const [manual, setManual] = useState(STILL_P);
  const [revealed, setRevealed] = useState(still);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || !section.current || !sticky.current || !scene.current) return;
    const segments = blueprint();
    const points = cloud(segments, window.matchMedia('(max-width: 760px)').matches ? 650 : 1150);
    const root = getComputedStyle(document.documentElement);
    const tone = (name: string) => root.getPropertyValue(name).trim();
    const dot = tone('--muted-foreground');
    const lit = tone('--primary');
    const line = tone('--foreground-soft');
    let w = 0, h = 0, raf = 0, stamp = 0, clock = 0;
    let target = still ? manual : stickyProgress(section.current, sticky.current);
    let progress = target;
    let shownPhase = -1;
    let shownOn: boolean | null = null;

    const measure = () => {
      const r = scene.current!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = () => {
      const p = progress;
      ctx.clearRect(0, 0, w, h);
      const fade = 1 - ease(clamp((p - 0.66) / 0.24));
      if (fade > 0.001 && w && h) {
        ctx.globalAlpha = fade;
        const angle = clock * 0.08 + p * 0.7, ca = Math.cos(angle), sa = Math.sin(angle);
        const radius = Math.min(w * 0.3, h * 0.69);
        const converge = ease(clamp((p - 0.13) / 0.4));
        const bp = ease(clamp((p - 0.38) / 0.15));
        if (bp > 0) {
          ctx.strokeStyle = `hsl(${line} / ${bp * 0.36})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          for (const s of segments) {
            ctx.moveTo(s[0] * w, s[1] * h);
            ctx.lineTo(s[2] * w, s[3] * h);
          }
          ctx.stroke();
          const scanY = (0.05 + 0.89 * clamp((p - 0.38) / 0.28)) * h;
          const g = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, 0);
          g.addColorStop(0, `hsl(${lit} / 0)`);
          g.addColorStop(0.5, `hsl(${lit} / ${bp * 0.6})`);
          g.addColorStop(1, `hsl(${lit} / 0)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w * 0.1, scanY);
          ctx.lineTo(w * 0.9, scanY);
          ctx.stroke();
        }
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const rx = pt.x * ca - pt.z * sa, rz = pt.x * sa + pt.z * ca;
          const persp = 2.8 / (2.8 + rz * 0.6);
          const jitter = still ? 0 : Math.sin(clock * 0.65 + pt.seed * 15) * 3;
          const sx = w * 0.5 + rx * radius * persp, sy = h * 0.48 + pt.y * radius * 0.67 * persp + jitter;
          const m = ease(clamp((converge - pt.seed * 0.18) / 0.82));
          const x = lerp(sx, pt.tx * w, m), y = lerp(sy, pt.ty * h, m);
          const alpha = 0.36 + (1 - rz) * 0.24;
          ctx.fillStyle = i % 8 === 0 ? `hsl(${lit} / ${Math.min(1, alpha + 0.2)})` : `hsl(${dot} / ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, (pt.size + 0.15) * (1 - m * 0.16), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      const rv = ease(clamp((p - 0.61) / 0.24));
      if (reveal.current) {
        reveal.current.style.opacity = String(rv);
        reveal.current.style.transform = `translateY(${(1 - rv) * 42}px) rotateX(${(1 - rv) * 22}deg) rotateY(${(1 - rv) * -8}deg) scale(${0.94 + 0.06 * rv})`;
        reveal.current.style.visibility = rv < 0.01 ? 'hidden' : 'visible';
      }
      const gone = ease(clamp((p - 0.13) / 0.19));
      if (file.current) {
        file.current.style.opacity = String(1 - gone);
        file.current.style.transform = `translate(-50%, calc(-50% - ${gone * 45}px)) scale(${1 - gone * 0.12})`;
      }
      meter.current?.style.setProperty('--p', p.toFixed(3));
      const next = p < 0.33 ? 0 : p < 0.7 ? 1 : 2;
      if (next !== shownPhase) {
        shownPhase = next;
        setPhase(next);
      }
      if (rv > 0.5 !== shownOn) {
        shownOn = rv > 0.5;
        setRevealed(shownOn);
      }
    };

    const tick = (now: number) => {
      raf = 0;
      if (document.hidden) return;
      const dt = stamp ? Math.min(now - stamp, 50) : 16;
      stamp = now;
      clock += dt / 1000;
      progress = lerp(progress, target, 1 - Math.exp(-dt / 70));
      if (Math.abs(progress - target) < 0.0001) progress = target;
      paint();
      if (inView) raf = requestAnimationFrame(tick);
    };
    const read = () => {
      target = still ? manual : stickyProgress(section.current!, sticky.current!);
      if (still) {
        progress = target;
        paint();
      } else if (!raf && inView) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measure();
      read();
      paint();
    };
    measure();
    paint();
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', onResize);
    const onVis = () => {
      stamp = 0;
      read();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [still, manual, inView]);

  const goTo = (i: number) => {
    if (still) setManual(STOPS[i]);
    else if (section.current && sticky.current) scrollToProgress(section.current, sticky.current, STOPS[i]);
  };

  return (
    <section ref={section} id="how" className="lp-asm lp-band lp-rule" aria-labelledby="asm-heading">
      <div ref={sticky} className="lp-asm__sticky">
        <div className="lp-wrap lp-asm__top">
          <div>
            <Eyebrow>01 / From broker file to journal</Eyebrow>
            <h2 id="asm-heading" className="lp-asm__titles" aria-label="Every fill from the file, sorted into days and read as a month.">
              {TITLES.map((t, i) => (
                <span key={t} className="lp-asm__title" data-on={i === phase} aria-hidden="true">
                  <span className={i === 1 ? 'lp-muted-line' : undefined}>{t}</span>
                </span>
              ))}
            </h2>
          </div>
          <div className="lp-asm__aside">
            <strong>Less typing between the trade and the lesson.</strong>
            Import the broker file and every fill lands in your journal; trades from Indian brokers carry estimated charges,
            so each day in the calendar is net.
            <Eyebrow className="lp-asm__status">{STATUS[phase]}</Eyebrow>
          </div>
        </div>
        <div ref={scene} className="lp-wrap lp-asm__scene">
          <canvas ref={canvas} aria-hidden="true" />
          <div ref={file} className="lp-asm__file" aria-hidden="true">
            tradebook-2026-11.csv · 29 fills
          </div>
          <div ref={reveal} className="lp-asm__reveal" role="img" aria-label={CALENDAR_ALT}>
            <div aria-hidden="true">
              <CalendarStage play={revealed && !still} />
            </div>
          </div>
        </div>
        <div className="lp-wrap lp-asm__foot">
          <div className="lp-steps" role="group" aria-label="Chapters">
            {CHAPTERS.map((c, i) => (
              <button key={c} type="button" aria-pressed={i === phase} onClick={() => goTo(i)}>
                <span>0{i + 1}</span>
                {c}
              </button>
            ))}
          </div>
          <div ref={meter} className="lp-meter" aria-hidden="true">
            {still ? 'Select a chapter' : 'Scroll to sort the file'}
            <i />
          </div>
        </div>
      </div>
    </section>
  );
}
