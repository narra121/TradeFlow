import { useEffect, useRef, useState } from 'react';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { CalendarStage } from '@/components/showcase/CalendarStage';
import { SAMPLE_DAYS, SAMPLE_TRADES, money, plural, sampleStats } from '@/components/showcase/sampleJournal';
import { scrollToProgress, stickyProgress, useInView, useLandingMotion } from './motion';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const span = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
const travel = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

/**
 * The scroll script, in section progress (0 at the pin, 1 at the release). The tooltips close into their dots and
 * every trade shows its amount; the dots gather into the calendar's outline and the calendar comes up under it at
 * FRAME_AT (a timed fade, so no scroll position holds it half-shown); then each day's trades leave the ball in date
 * order as bare dots, land in their cell with their amounts, rest there for SETTLE and close into one figure over SUM,
 * at the end of which the day shows its total.
 */
const GATHER = [0.08, 0.3] as const;
const FRAME_AT = 0.27;
const FRAMED = [0.22, 0.3] as const;
const OUTLINE_OUT = [0.28, 0.42] as const;
const FILE_OUT = [0.08, 0.18] as const;
const TIPS_OUT = [0.1, 0.145] as const;
const AMOUNTS_IN = [0.15, 0.19] as const;
const FIRST = 0.16;
const PER_DAY = 0.046;
const PER_TRADE = 0.008;
const FLIGHT = 0.12;
const SETTLE = 0.012;
const SUM = 0.03;

const DAY_SUM_AT = SAMPLE_DAYS.map((d, i) => FIRST + i * PER_DAY + (d.trades - 1) * PER_TRADE + FLIGHT + SETTLE + SUM);
const DONE_P = DAY_SUM_AT[DAY_SUM_AT.length - 1];

/** How many trading days hold their total at progress `p`. */
export const daysSortedAt = (p: number) => DAY_SUM_AT.filter((at) => p >= at).length;

interface Flight { day: number; slot: number; of: number; start: number; sum: number; symbol: string; label: string; win: boolean; x: number; y: number; z: number; seed: number }

/**
 * One per sample trade: its place on the ball and its timing. The ball is a 29-point lattice; 19 and 11 are the step and
 * offset that put a mix of symbols, wins and losses on the side facing the reader at the start.
 */
const FLIGHTS: Flight[] = SAMPLE_TRADES.map((t, i, all) => {
  const dayIndex = SAMPLE_DAYS.findIndex((d) => d.day === t.day);
  const slot = all.slice(0, i).filter((o) => o.day === t.day).length;
  const k = (i * 19 + 11) % all.length;
  const a = k * 2.39996323;
  const z = 1 - (2 * (k + 0.5)) / all.length;
  const r = Math.sqrt(1 - z * z);
  return {
    day: t.day, slot, of: SAMPLE_DAYS[dayIndex].trades, start: FIRST + dayIndex * PER_DAY + slot * PER_TRADE, sum: DAY_SUM_AT[dayIndex],
    symbol: t.symbol, label: money(t.pnl), win: t.pnl > 0, x: Math.cos(a) * r * 0.9, y: Math.sin(a) * r * 0.9, z: z * 0.9, seed: (Math.sin(i * 93.13) + 1) / 2,
  };
});

interface Box { x: number; y: number; w: number; h: number }
interface Geometry { segments: number[][]; cells: Record<number, Box>; compact: boolean }

/** The real calendar's outline and day cells in scene pixels, so the dots and the trades land exactly on it. */
function measureCalendar(scene: HTMLElement, host: HTMLElement): Geometry | null {
  const frame = host.querySelector('.cs-frame');
  const stage = host.querySelector('.ss-stage');
  const o = scene.getBoundingClientRect();
  if (!frame || !stage || !o.width || !o.height) return null;
  const box = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  };
  const segments: number[][] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    if (Math.min(y0, y1) >= o.height) return;
    segments.push([x0 / o.width, y0 / o.height, x1 / o.width, Math.min(y1, o.height) / o.height]);
  };
  const outline = (b: Box) => {
    line(b.x, b.y, b.x + b.w, b.y);
    line(b.x + b.w, b.y, b.x + b.w, b.y + b.h);
    line(b.x, b.y + b.h, b.x + b.w, b.y + b.h);
    line(b.x, b.y, b.x, b.y + b.h);
  };
  const f = box(frame);
  outline(f);
  for (const row of host.querySelectorAll('.tq-frame__title, .tq-frame__scope')) {
    const b = box(row);
    line(f.x, b.y + b.h, f.x + f.w, b.y + b.h);
  }
  const cells: Record<number, Box> = {};
  for (const el of host.querySelectorAll('.cs-cell:not(.cs-cell--blank)')) {
    const b = box(el);
    outline(b);
    const day = /^day-(\d+)$/.exec(el.getAttribute('data-target') ?? '');
    if (day) cells[Number(day[1])] = b;
  }
  return { segments, cells, compact: stage.getAttribute('data-layout') === 'compact' };
}

const overlaps = (a: Box, b: Box, gap: number) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

const CALENDAR_ALT =
  'Sample data: the TradeQut calendar for November 2026, each trading day tinted by its net P&L (month +$370.50); 3 and 10 Nov are marked because their trades broke a rule, and 10 Nov shows −$76.25 over 4 trades.';
const TITLES = ['Every trade from the file.', 'Sorted into days.', 'Read as a month.'];
const STATUS = ['Reading the broker file', 'Sorting trades into days', 'Your month, net of charges'];
const CHAPTERS = ['File', 'Days', 'Month'];
const STOPS = [0.04, 0.5, 0.94];
/** The progress shown when nothing may move (reduced motion or Pause): the finished calendar. */
const STILL_P = 0.94;
const MONTH = sampleStats();

/**
 * From the broker file to the month. The ball of dots is the file: 29 of its dots are the sample month's trades, the
 * ones facing the reader named in a tooltip. Scrolling gathers the dots into the calendar's outline, flies every trade
 * into its day and sums it there, until the real calendar (a stageshow stage) holds the month. The canvas only runs
 * while the section is on screen and motion is allowed.
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
  const [filled, setFilled] = useState(SAMPLE_DAYS.length);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || !section.current || !sticky.current || !scene.current || !reveal.current) return;
    const root = getComputedStyle(document.documentElement);
    const tone = (name: string) => root.getPropertyValue(name).trim();
    const dot = tone('--muted-foreground');
    const lit = tone('--primary');
    const soft = tone('--foreground-soft');
    const profit = tone('--profit');
    const loss = tone('--loss');
    const surface = tone('--popover');
    const edge = tone('--border-strong');
    const SANS = "'DM Sans', system-ui, sans-serif";
    const MONO = "'JetBrains Mono', ui-monospace, monospace";
    let w = 0, h = 0, raf = 0, stamp = 0, clock = 0, spin = 0;
    let geo: Geometry | null = null;
    let points: Pt[] = [];
    let fileBox: Box | null = null;
    let target = still ? manual : stickyProgress(section.current, sticky.current);
    let progress = target;
    let shownPhase = -1, shownFilled = -1;
    const tips = FLIGHTS.map(() => 0);
    const widths = new Map<string, number>();
    const width = (font: string, text: string) => {
      const key = font + text;
      let v = widths.get(key);
      if (v === undefined) {
        ctx.font = font;
        v = ctx.measureText(text).width;
        widths.set(key, v);
      }
      return v;
    };

    const measure = () => {
      // Refs are detached when the page leaves, before this effect's cleanup runs: a scroll or resize in between finds them null.
      if (!scene.current || !reveal.current) return;
      const r = scene.current.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      geo = measureCalendar(scene.current, reveal.current);
      points = cloud(geo?.segments ?? blueprint(), w < 600 ? 650 : 1150);
      const f = file.current;
      fileBox = f ? { x: w / 2 - f.offsetWidth / 2, y: h * 0.48 - f.offsetHeight / 2, w: f.offsetWidth, h: f.offsetHeight } : null;
    };

    /** `blend`: how far the tooltips move toward shown or hidden this frame; 1 puts them there at once. */
    const paint = (blend = 1) => {
      const p = progress;
      ctx.clearRect(0, 0, w, h);
      const compact = geo?.compact ?? w < 600;
      const angle = spin + p * 0.7, ca = Math.cos(angle), sa = Math.sin(angle);
      const radius = compact ? Math.min(w * 0.4, h * 0.56) : Math.min(w * 0.3, h * 0.69);
      const flat = compact ? 0.9 : 0.67;
      const cx = w * 0.5, cy = h * 0.48;

      const outline = 1 - ease(span(p, OUTLINE_OUT[0], OUTLINE_OUT[1]));
      if (outline > 0.001 && w && h) {
        ctx.globalAlpha = outline;
        const gather = ease(span(p, GATHER[0], GATHER[1]));
        const drawn = ease(span(p, 0.18, 0.28));
        if (drawn > 0) {
          ctx.strokeStyle = `hsl(${soft} / ${drawn * 0.3})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          for (const s of geo?.segments ?? blueprint()) {
            ctx.moveTo(s[0] * w, s[1] * h);
            ctx.lineTo(s[2] * w, s[3] * h);
          }
          ctx.stroke();
        }
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const rx = pt.x * ca - pt.z * sa, rz = pt.x * sa + pt.z * ca;
          const persp = 2.8 / (2.8 + rz * 0.6);
          const jitter = still ? 0 : Math.sin(clock * 0.65 + pt.seed * 15) * 3;
          const sx = cx + rx * radius * persp, sy = cy + pt.y * radius * flat * persp + jitter;
          const m = ease(clamp((gather - pt.seed * 0.18) / 0.82));
          const x = lerp(sx, pt.tx * w, m), y = lerp(sy, pt.ty * h, m);
          const alpha = 0.36 + (1 - rz) * 0.24;
          ctx.fillStyle = i % 8 === 0 ? `hsl(${lit} / ${Math.min(1, alpha + 0.2)})` : `hsl(${dot} / ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, (pt.size + 0.15) * (1 - m * 0.16), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (geo && w && h) {
        const g = geo;
        const fileAlpha = 1 - ease(span(p, FILE_OUT[0], FILE_OUT[1]));
        const tipsOut = 1 - ease(span(p, TIPS_OUT[0], TIPS_OUT[1]));
        const amounts = compact ? 0 : ease(span(p, AMOUNTS_IN[0], AMOUNTS_IN[1]));
        const tipFont = `500 ${compact ? 11 : 12}px ${SANS}`, tipMono = `500 ${compact ? 11 : 12}px ${MONO}`, rowFont = `500 11px ${MONO}`;
        const tipH = compact ? 22 : 24;
        const pitch = (cell: Box) => Math.min(14, cell.h * 0.19);

        // Once the calendar is up, a trade still on the ball is a dim dot. Amounts are read at rest only: on the ball
        // before the calendar, and in the cell; a trade in flight is a bare dot, so crossing trades never overprint.
        const framed = ease(span(p, FRAMED[0], FRAMED[1]));
        const live = FLIGHTS.map((f, i) => {
          const rx = f.x * ca - f.z * sa, rz = f.x * sa + f.z * ca;
          const persp = 2.8 / (2.8 + rz * 0.6);
          const jitter = still ? 0 : Math.sin(clock * 0.65 + f.seed * 15) * 3;
          const front = clamp((1 - rz / 0.9) / 2);
          const cell = g.cells[f.day];
          const flown = span(p, f.start, f.start + FLIGHT);
          const m = travel(flown);
          const merged = ease(span(p, f.sum - SUM, f.sum));
          const row = f.slot - (f.of - 1) / 2;
          // Wide: the day's amounts stack in the cell, then slide as one toward where its total appears.
          const tx = compact ? cell.x + cell.w / 2 + row * 7 : cell.x + cell.w * lerp(0.36, 0.24, merged);
          const ty = compact ? cell.y + cell.h * 0.76 : cell.y + cell.h * lerp(0.5, 0.58, merged) + row * pitch(cell);
          return {
            f, i, front, m,
            x: lerp(cx + rx * radius * persp, tx, m),
            y: lerp(cy + f.y * radius * flat * persp + jitter, ty, m),
            alpha: lerp((0.4 + 0.6 * front) * lerp(1, 0.45, framed), 1, m) * (1 - merged),
            text: Math.max((1 - framed) * (1 - ease(span(flown, 0, 0.15))), ease(span(flown, 0.8, 1))),
            r: lerp(1.7 + 1.5 * front, compact ? 2 : 2.3, m),
          };
        });

        for (const t of live) {
          if (t.alpha < 0.01) continue;
          ctx.globalAlpha = t.alpha;
          ctx.fillStyle = `hsl(${t.f.win ? profit : loss})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
          ctx.fill();
          if (amounts * t.text > 0.01) {
            ctx.globalAlpha = t.alpha * amounts * t.text;
            ctx.font = rowFont;
            ctx.textBaseline = 'middle';
            ctx.fillText(t.f.label, Math.round(t.x + 7), Math.round(t.y) + 0.5);
          }
        }

        const tipBox = (t: (typeof live)[number]): Box => {
          const bw = 16 + width(tipFont, t.f.symbol) + 6 + width(tipMono, t.f.label);
          const above = t.y - 9 - tipH >= 4;
          return { x: Math.round(Math.max(4, Math.min(w - bw - 4, t.x - bw / 2))), y: Math.round(above ? t.y - 9 - tipH : t.y + 9), w: Math.round(bw), h: tipH };
        };
        const placed: Box[] = fileAlpha > 0.3 && fileBox ? [fileBox] : [];
        const want = FLIGHTS.map(() => 0);
        const cap = compact ? 4 : 9;
        let shown = 0;
        if (tipsOut > 0.01) {
          const order = live.filter((t) => t.front > 0.56).sort((a, b) => b.front + (tips[b.i] > 0.5 ? 0.25 : 0) - (a.front + (tips[a.i] > 0.5 ? 0.25 : 0)));
          for (const t of order) {
            if (shown >= cap) break;
            const b = tipBox(t);
            if (placed.some((o) => overlaps(o, b, 8))) continue;
            placed.push(b);
            want[t.i] = 1;
            shown++;
          }
        }
        for (const t of live) {
          tips[t.i] = lerp(tips[t.i], want[t.i], blend);
          const a = tips[t.i] * tipsOut;
          if (a < 0.01) continue;
          const b = tipBox(t);
          const above = b.y < t.y;
          const px = Math.max(b.x + 9, Math.min(b.x + b.w - 9, t.x));
          ctx.globalAlpha = a;
          ctx.fillStyle = `hsl(${surface})`;
          ctx.strokeStyle = `hsl(${edge} / 0.7)`;
          ctx.lineWidth = 1;
          const x0 = b.x + 0.5, y0 = b.y + 0.5, x1 = b.x + b.w - 0.5, y1 = b.y + b.h - 0.5, rad = 4;
          ctx.beginPath();
          ctx.moveTo(x0 + rad, y0);
          if (!above) {
            ctx.lineTo(px - 5, y0);
            ctx.lineTo(px, y0 - 4);
            ctx.lineTo(px + 5, y0);
          }
          ctx.arcTo(x1, y0, x1, y1, rad);
          ctx.arcTo(x1, y1, x0, y1, rad);
          if (above) {
            ctx.lineTo(px + 5, y1);
            ctx.lineTo(px, y1 + 4);
            ctx.lineTo(px - 5, y1);
          }
          ctx.arcTo(x0, y1, x0, y0, rad);
          ctx.arcTo(x0, y0, x1, y0, rad);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.textBaseline = 'middle';
          const mid = b.y + b.h / 2 + 0.5;
          ctx.font = tipFont;
          ctx.fillStyle = `hsl(${soft})`;
          ctx.fillText(t.f.symbol, b.x + 8, mid);
          ctx.font = tipMono;
          ctx.fillStyle = `hsl(${t.f.win ? profit : loss})`;
          ctx.fillText(t.f.label, b.x + 8 + width(tipFont, t.f.symbol) + 6, mid);
        }
        ctx.globalAlpha = 1;
      }

      if (reveal.current) reveal.current.dataset.on = String(p >= FRAME_AT);
      const gone = ease(span(p, FILE_OUT[0], FILE_OUT[1]));
      if (file.current) {
        file.current.style.opacity = String(1 - gone);
        file.current.style.transform = `translate(-50%, calc(-50% - ${gone * 24}px))`;
      }
      meter.current?.style.setProperty('--p', span(p, 0, DONE_P).toFixed(3));
      const next = p < FIRST - 0.02 ? 0 : p < DONE_P ? 1 : 2;
      if (next !== shownPhase) {
        shownPhase = next;
        setPhase(next);
      }
      const days = daysSortedAt(p);
      if (days !== shownFilled) {
        shownFilled = days;
        setFilled(days);
      }
    };

    const tick = (now: number) => {
      raf = 0;
      if (document.hidden) return;
      const dt = stamp ? Math.min(now - stamp, 50) : 16;
      stamp = now;
      clock += dt / 1000;
      spin += (dt / 1000) * 0.08 * (1 - ease(span(progress, GATHER[0], 0.2)));
      progress = lerp(progress, target, 1 - Math.exp(-dt / 70));
      if (Math.abs(progress - target) < 0.0001) progress = target;
      paint(1 - Math.exp(-dt / 160));
      const settled = progress === target && progress >= DONE_P;
      if (inView && !settled) raf = requestAnimationFrame(tick);
      else stamp = 0;
    };
    const read = () => {
      if (!section.current || !sticky.current) return;
      target = still ? manual : stickyProgress(section.current, sticky.current);
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
    // The stage rescales (and may switch to its compact design) after this effect has measured it.
    const fit = reveal.current.querySelector<HTMLElement>('.ss-fit');
    let fitHeight = fit?.offsetHeight;
    const stageSize =
      fit && 'ResizeObserver' in window
        ? new ResizeObserver(() => {
            if (fit.offsetHeight === fitHeight) return;
            fitHeight = fit.offsetHeight;
            onResize();
          })
        : null;
    if (fit) stageSize?.observe(fit);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      widths.clear();
      paint();
    });
    const onVis = () => {
      stamp = 0;
      read();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stageSize?.disconnect();
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [still, manual, inView]);

  const goTo = (i: number) => {
    if (still) setManual(STOPS[i]);
    else if (section.current && sticky.current) scrollToProgress(section.current, sticky.current, STOPS[i]);
  };

  const sorted = SAMPLE_DAYS.slice(0, filled).reduce((n, d) => n + d.trades, 0);
  const progressLabel =
    phase === 2 ? `${plural(MONTH.trades, 'trade')} in ${plural(MONTH.days, 'day')}` : sorted > 0 ? `${sorted} of ${MONTH.trades} trades sorted` : still ? 'Select a chapter' : 'Scroll to sort the file';

  return (
    <section ref={section} id="how" className="lp-asm lp-band lp-rule" aria-labelledby="asm-heading">
      <div ref={sticky} className="lp-asm__sticky">
        <div className="lp-wrap lp-asm__top">
          <div>
            <Eyebrow>From broker file to journal</Eyebrow>
            <h2 id="asm-heading" className="lp-asm__titles" aria-label="Every trade from the file, sorted into days and read as a month.">
              {TITLES.map((t, i) => (
                <span key={t} className="lp-asm__title" data-on={i === phase} aria-hidden="true">
                  {t}
                </span>
              ))}
            </h2>
          </div>
          <div className="lp-asm__aside">
            <strong>Less typing between the trade and the lesson.</strong>
            <span className="lp-asm__more">
              Import the broker file and every trade lands on its day; trades from Indian brokers carry estimated charges, so
              each day in the calendar is net.
            </span>
            <Eyebrow className="lp-asm__status">{STATUS[phase]}</Eyebrow>
          </div>
        </div>
        <div ref={scene} className="lp-wrap lp-asm__scene">
          <div ref={reveal} className="lp-asm__reveal" role="img" aria-label={CALENDAR_ALT} data-ss-fill="">
            <div aria-hidden="true">
              <CalendarStage play={!still} filled={filled} />
            </div>
          </div>
          <canvas ref={canvas} aria-hidden="true" />
          <div ref={file} className="lp-asm__file" aria-hidden="true">
            trades-2026-11.csv<span className="lp-asm__more"> · {plural(MONTH.trades, 'trade')}</span>
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
            {progressLabel}
            <i />
          </div>
        </div>
      </div>
    </section>
  );
}
