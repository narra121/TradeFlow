import { useEffect, useRef } from 'react';
import { blueprint, cloud, type Pt } from '@/components/landing/ParticleAssembly';
import type { FieldMode, FieldShape } from '@/components/auth/scenes';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/** The page splits into task card and stage from this width (auth.css). */
const WIDE = '(min-width: 1024px)';

/** An envelope as line segments in box fractions: body, flap, the two lower folds. */
function envelope(): number[][] {
  return [
    [0.04, 0.12, 0.96, 0.12], [0.96, 0.12, 0.96, 0.92], [0.96, 0.92, 0.04, 0.92], [0.04, 0.92, 0.04, 0.12],
    [0.04, 0.12, 0.5, 0.6], [0.5, 0.6, 0.96, 0.12],
    [0.04, 0.92, 0.36, 0.47], [0.96, 0.92, 0.64, 0.47],
  ];
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AuthFieldProps {
  mode: FieldMode;
  shape: FieldShape;
  /** The visitor pressed Pause: one frame stays. */
  paused: boolean;
  /** Changes when the stage's layout may have moved (a new scene). */
  anchorKey: string;
  /** Never animates (the page without a stage). */
  frozen?: boolean;
}

/**
 * The landing page's particle cloud behind the auth pages: the same points, tones and drift (ParticleAssembly), centred
 * on the stage. `assemble` draws the points into a line drawing inside the stage's picture box. One rAF loop, stopped
 * while the canvas is off screen, the tab is hidden, the visitor paused it or asked for reduced motion.
 */
export function AuthField({ mode, shape, paused, anchorKey, frozen = false }: AuthFieldProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ mode, shape, paused });
  live.current = { mode, shape, paused };
  const wake = useRef<() => void>(() => {});

  useEffect(() => wake.current(), [mode, shape, paused, anchorKey]);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    const host = cv?.closest<HTMLElement>('.tq-auth');
    if (!cv || !ctx || !host) return;
    const wide = window.matchMedia(WIDE);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const shapes = { calendar: blueprint(), envelope: envelope() };
    let points: Record<FieldShape, Pt[]> = { calendar: [], envelope: [] };
    const build = () => {
      const count = wide.matches ? 1150 : 650;
      points = { calendar: cloud(shapes.calendar, count), envelope: cloud(shapes.envelope, count) };
    };
    const css = getComputedStyle(host);
    const tone = (name: string) => css.getPropertyValue(name).trim();
    const dot = tone('--muted-foreground');
    const lit = tone('--primary');
    const line = tone('--foreground-soft');

    let w = 0, h = 0, raf = 0, stamp = 0, clock = 0, angle = 0.6, onScreen = true;
    let amount = live.current.mode === 'assemble' ? 1 : 0;
    let dim = live.current.mode === 'calm' ? 0.6 : 1;

    const still = () => frozen || reduce.matches || live.current.paused;

    const measure = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** The stage's picture box (wide) or the head band (stacked), in canvas pixels. */
    const anchor = (): Box => {
      const el = host.querySelector(`[data-field-anchor="${wide.matches ? 'wide' : 'narrow'}"]`);
      if (!el) return { x: w * 0.5, y: h * 0.08, w: w * 0.42, h: Math.min(h, 520) * 0.5 };
      const r = el.getBoundingClientRect();
      const c = cv.getBoundingClientRect();
      return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
    };

    const paint = () => {
      const { mode: m, shape: s } = live.current;
      const a = anchor();
      const isWide = wide.matches;
      ctx.clearRect(0, 0, w, h);
      if (!w || !h) return;
      const cx = isWide ? a.x + a.w * 0.52 : a.x + a.w * 0.82;
      const cy = isWide ? a.y + a.h * 0.5 : a.y + a.h * 0.5;
      const radius = isWide ? Math.max(a.w * 0.7, 300) : Math.max(a.h * 1.15, 150);
      // Stacked, there is no picture box under the head band to draw into: the cloud only drifts.
      const converge = isWide ? ease(amount) : 0;
      const box: Box = s === 'envelope' ? { x: a.x + a.w * 0.13, y: a.y - a.h * 0.02, w: a.w * 0.74, h: a.h * 1.04 } : a;
      const ink = isWide ? ease(clamp((amount - 0.55) / 0.45)) : 0;
      if (ink > 0.01) {
        ctx.strokeStyle = `hsl(${line} / ${ink * 0.34 * dim})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const seg of shapes[s]) {
          ctx.moveTo(box.x + seg[0] * box.w, box.y + seg[1] * box.h);
          ctx.lineTo(box.x + seg[2] * box.w, box.y + seg[3] * box.h);
        }
        ctx.stroke();
        if (m === 'assemble' && s === 'calendar') {
          // The landing's scan line, looping while the visitor waits.
          const y = box.y + (0.05 + 0.89 * ((clock * 0.36) % 1)) * box.h;
          const g = ctx.createLinearGradient(box.x + box.w * 0.1, 0, box.x + box.w * 0.9, 0);
          g.addColorStop(0, `hsl(${lit} / 0)`);
          g.addColorStop(0.5, `hsl(${lit} / ${ink * 0.6})`);
          g.addColorStop(1, `hsl(${lit} / 0)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(box.x + box.w * 0.1, y);
          ctx.lineTo(box.x + box.w * 0.9, y);
          ctx.stroke();
        }
      }
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const moving = !still();
      const pts = points[s];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const rx = p.x * ca - p.z * sa, rz = p.x * sa + p.z * ca;
        const persp = 2.8 / (2.8 + rz * 0.6);
        const jitter = moving ? Math.sin(clock * 0.65 + p.seed * 15) * 3 : 0;
        const sx = cx + rx * radius * persp, sy = cy + p.y * radius * 0.67 * persp + jitter;
        const t = ease(clamp((converge - p.seed * 0.18) / 0.82));
        const x = lerp(sx, box.x + p.tx * box.w, t), y = lerp(sy, box.y + p.ty * box.h, t);
        const alpha = (0.36 + (1 - rz) * 0.24) * dim;
        ctx.fillStyle = i % 8 === 0 ? `hsl(${lit} / ${Math.min(1, alpha + 0.2)})` : `hsl(${dot} / ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, (p.size + 0.15) * (1 - t * 0.16), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const targets = () => {
      const m = live.current.mode;
      return { amount: m === 'assemble' ? 1 : 0, dim: m === 'calm' ? 0.6 : 1, spin: m === 'calm' ? 0.03 : 0.08 };
    };

    const tick = (now: number) => {
      raf = 0;
      if (document.hidden || !onScreen || still()) return;
      const dt = stamp ? Math.min(now - stamp, 50) : 16;
      stamp = now;
      clock += dt / 1000;
      const to = targets();
      const k = 1 - Math.exp(-dt / 480);
      amount = lerp(amount, to.amount, k);
      dim = lerp(dim, to.dim, k);
      angle += (dt / 1000) * to.spin;
      paint();
      raf = requestAnimationFrame(tick);
    };

    const run = () => {
      if (still()) {
        cancelAnimationFrame(raf);
        raf = 0;
        const to = targets();
        amount = to.amount;
        dim = to.dim;
        paint();
      } else if (!raf) {
        stamp = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    wake.current = run;

    const onResize = () => {
      const count = wide.matches ? 1150 : 650;
      if (points.calendar.length !== count) build();
      measure();
      paint();
      run();
    };
    build();
    measure();
    paint();
    run();
    const ro = new ResizeObserver(onResize);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      run();
    });
    io.observe(cv);
    document.addEventListener('visibilitychange', run);
    reduce.addEventListener('change', run);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', run);
      reduce.removeEventListener('change', run);
      wake.current = () => {};
    };
  }, [frozen]);

  return <canvas ref={canvas} className="auth-field" />;
}
