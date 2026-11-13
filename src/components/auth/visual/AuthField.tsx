import { useEffect, useRef } from 'react';
import type { FieldMode, FieldShape } from '@/components/auth/scenes';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/** The page splits into task card and stage from this width (auth.css). */
const WIDE = '(min-width: 1024px)';

/** The P&L calendar as line segments in box fractions: frame, title row, weekday row, a 7 x 5 day grid (the landing page's blueprint). */
function blueprint(): number[][] {
  const s: number[][] = [
    [0.1, 0.05, 0.9, 0.05], [0.9, 0.05, 0.9, 0.94], [0.9, 0.94, 0.1, 0.94], [0.1, 0.94, 0.1, 0.05],
    [0.1, 0.14, 0.9, 0.14], [0.13, 0.095, 0.25, 0.095], [0.68, 0.095, 0.87, 0.095], [0.13, 0.2, 0.87, 0.2],
  ];
  const x0 = 0.13, x1 = 0.87, y0 = 0.24, y1 = 0.91;
  for (let r = 0; r <= 5; r++) s.push([x0, y0 + ((y1 - y0) * r) / 5, x1, y0 + ((y1 - y0) * r) / 5]);
  for (let c = 0; c <= 7; c++) s.push([x0 + ((x1 - x0) * c) / 7, y0, x0 + ((x1 - x0) * c) / 7, y1]);
  return s;
}

interface Pt {
  x: number;
  y: number;
  z: number;
  /** Where the point sits on the line drawing, in box fractions. */
  tx: number;
  ty: number;
  seed: number;
  size: number;
}

/** The landing page's point cloud: a Fibonacci sphere whose points keep their identity while they fly to the line drawing. */
function cloud(segments: number[][], count: number): Pt[] {
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
 * The landing page's particle cloud behind the auth pages: the same point maths, tones and drift as its assembly section
 * (kept here so the two pages can change apart), centred on the stage. `assemble` draws the points into a line drawing inside the stage's picture box. One rAF loop, stopped
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
    let amount = live.current.mode === 'assemble' || live.current.mode === 'rest' ? 1 : 0;
    let dim = live.current.mode === 'calm' || live.current.mode === 'rest' ? 0.6 : 1;

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
      const el = host.querySelector(`[data-field-anchor~="${wide.matches ? 'wide' : 'narrow'}"]`);
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
      const cx = frozen ? a.x + a.w * 0.5 : isWide ? a.x + a.w * 0.52 : a.x + a.w * 0.82;
      const cy = isWide ? a.y + a.h * 0.5 : a.y + a.h * 0.5;
      // With no stage the cloud rings the card, so it reaches further than the card is wide.
      const radius = frozen ? Math.max(a.w * 1.2, a.h * 1.1) : isWide ? Math.max(a.w * 0.7, 300) : Math.max(a.h * 1.15, 150);
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
      const quiet = m === 'calm' || m === 'rest';
      return { amount: m === 'assemble' || m === 'rest' ? 1 : 0, dim: quiet ? 0.6 : 1, spin: quiet ? 0.03 : 0.08 };
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
