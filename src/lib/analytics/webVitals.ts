/**
 * Field web vitals for public pages (DESIGN-ENTERPRISE D.10). LCP, CLS and INP are observed with PerformanceObserver and sent
 * once, when the page is hidden, as a `web_vital` GA4 event. Nothing is sent unless GA is initialised (consent and
 * VITE_GA_MEASUREMENT_ID), so this adds no third-party request of its own.
 */
export type VitalName = 'LCP' | 'CLS' | 'INP';
export type VitalRating = 'good' | 'needs-improvement' | 'poor';

const THRESHOLDS: Record<VitalName, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
};

export function rateVital(name: VitalName, value: number): VitalRating {
  const [good, poor] = THRESHOLDS[name];
  return value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor';
}

/** INP is roughly the 98th-percentile interaction; with few interactions it is the slowest one. */
export function interactionNextPaint(durations: number[]): number | undefined {
  if (durations.length === 0) return undefined;
  const sorted = [...durations].sort((a, b) => b - a);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length / 50))];
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}
interface EventTimingEntry extends PerformanceEntry {
  interactionId?: number;
}

export type VitalSender = (vital: { name: VitalName; value: number; rating: VitalRating }) => void;

let started = false;

/** Starts observing; returns false when the browser lacks PerformanceObserver or it was already started. */
export function observeWebVitals(send: VitalSender): boolean {
  if (started || typeof PerformanceObserver === 'undefined' || typeof document === 'undefined') return false;
  started = true;

  let lcp: number | undefined;
  let cls = 0;
  const interactions = new Map<number, number>();

  const watch = (type: string, onEntry: (e: PerformanceEntry) => void, extra: Record<string, unknown> = {}) => {
    try {
      new PerformanceObserver((list) => list.getEntries().forEach(onEntry)).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
    } catch {
      // Entry type not supported by this browser: that vital is simply not reported.
    }
  };

  watch('largest-contentful-paint', (e) => {
    lcp = e.startTime;
  });
  watch('layout-shift', (e) => {
    const shift = e as LayoutShiftEntry;
    if (!shift.hadRecentInput) cls += shift.value;
  });
  watch(
    'event',
    (e) => {
      const id = (e as EventTimingEntry).interactionId;
      if (id) interactions.set(id, Math.max(interactions.get(id) ?? 0, e.duration));
    },
    { durationThreshold: 40 },
  );

  let reported = false;
  const report = () => {
    if (reported || document.visibilityState !== 'hidden') return;
    reported = true;
    const inp = interactionNextPaint([...interactions.values()]);
    const values: [VitalName, number | undefined][] = [
      ['LCP', lcp],
      ['CLS', cls],
      ['INP', inp],
    ];
    for (const [name, value] of values) {
      if (value === undefined) continue;
      const rounded = name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value);
      send({ name, value: rounded, rating: rateVital(name, value) });
    }
  };
  document.addEventListener('visibilitychange', report);
  window.addEventListener('pagehide', report);
  return true;
}

/** Test-only reset. */
export function __resetWebVitalsForTests(): void {
  started = false;
}
