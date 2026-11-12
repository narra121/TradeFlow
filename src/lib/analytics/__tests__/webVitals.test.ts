/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url": "https://tradequt.com/"}
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __resetWebVitalsForTests, interactionNextPaint, observeWebVitals, rateVital } from '../webVitals';

type Callback = (list: { getEntries: () => unknown[] }) => void;
const observers: { type: string; cb: Callback }[] = [];

class FakeObserver {
  private cb: Callback;
  constructor(cb: Callback) {
    this.cb = cb;
  }
  observe(opts: { type: string }) {
    observers.push({ type: opts.type, cb: this.cb });
  }
}

const emit = (type: string, entries: unknown[]) => observers.filter((o) => o.type === type).forEach((o) => o.cb({ getEntries: () => entries }));
const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  observers.length = 0;
  __resetWebVitalsForTests();
  vi.stubGlobal('PerformanceObserver', FakeObserver);
  setVisibility('visible');
});
afterEach(() => vi.unstubAllGlobals());

describe('rateVital', () => {
  it('uses the web-vitals thresholds', () => {
    expect(rateVital('LCP', 2400)).toBe('good');
    expect(rateVital('LCP', 3000)).toBe('needs-improvement');
    expect(rateVital('LCP', 4500)).toBe('poor');
    expect(rateVital('CLS', 0.05)).toBe('good');
    expect(rateVital('CLS', 0.3)).toBe('poor');
    expect(rateVital('INP', 200)).toBe('good');
    expect(rateVital('INP', 600)).toBe('poor');
  });
});

describe('interactionNextPaint', () => {
  it('is undefined with no interactions, the slowest with few, and near the 98th percentile with many', () => {
    expect(interactionNextPaint([])).toBeUndefined();
    expect(interactionNextPaint([40, 120, 80])).toBe(120);
    const many = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(interactionNextPaint(many)).toBe(98);
  });
});

describe('observeWebVitals', () => {
  it('sends nothing while the page is visible and one event per vital once it is hidden', () => {
    const send = vi.fn();
    expect(observeWebVitals(send)).toBe(true);
    emit('largest-contentful-paint', [{ startTime: 1800 }]);
    emit('layout-shift', [{ value: 0.04, hadRecentInput: false }, { value: 0.5, hadRecentInput: true }]);
    emit('event', [{ interactionId: 1, duration: 90 }, { interactionId: 1, duration: 140 }, { interactionId: 2, duration: 60 }]);
    expect(send).not.toHaveBeenCalled();

    setVisibility('hidden');
    expect(send).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledWith({ name: 'LCP', value: 1800, rating: 'good' });
    expect(send).toHaveBeenCalledWith({ name: 'CLS', value: 0.04, rating: 'good' });
    expect(send).toHaveBeenCalledWith({ name: 'INP', value: 140, rating: 'good' });

    setVisibility('hidden');
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('skips a vital that was never measured (no interactions, no LCP)', () => {
    const send = vi.fn();
    observeWebVitals(send);
    setVisibility('hidden');
    expect(send.mock.calls.map((c) => c[0].name)).toEqual(['CLS']);
  });

  it('starts only once and returns false without PerformanceObserver', () => {
    expect(observeWebVitals(vi.fn())).toBe(true);
    expect(observeWebVitals(vi.fn())).toBe(false);
    __resetWebVitalsForTests();
    vi.stubGlobal('PerformanceObserver', undefined);
    expect(observeWebVitals(vi.fn())).toBe(false);
  });
});
