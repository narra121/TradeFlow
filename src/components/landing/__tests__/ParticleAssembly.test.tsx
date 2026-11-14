import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ParticleAssembly } from '../ParticleAssembly';
import { LandingMotionProvider } from '../motion';

/** A 2-D context whose every method is a no-op (jsdom has no canvas). */
const fakeContext = () =>
  new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, key) => (key in target ? target[key] : key === 'measureText' ? () => ({ width: 10 }) : () => undefined),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });

/** Every observed element is on screen, so the section's scroll and resize handlers are installed. */
class SeenObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** Mounted in the same commit that removes the section: its layout effect runs after the refs detach and before the section's cleanup. */
function ScrollsDuringUnmount() {
  useLayoutEffect(() => {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
  }, []);
  return null;
}

const getContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', SeenObserver);
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  HTMLCanvasElement.prototype.getContext = (() => fakeContext()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = getContext;
  vi.unstubAllGlobals();
});

describe('ParticleAssembly', () => {
  it('a scroll or resize while the page is leaving does not throw (refs detach before the cleanup runs)', () => {
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => {
      errors.push(e.message);
      e.preventDefault();
    };
    window.addEventListener('error', onError);
    const page = (on: boolean) => (
      <MemoryRouter>
        <LandingMotionProvider>{on ? <ParticleAssembly /> : <ScrollsDuringUnmount />}</LandingMotionProvider>
      </MemoryRouter>
    );
    const { rerender } = render(page(true));
    rerender(page(false));
    window.removeEventListener('error', onError);
    expect(errors).toEqual([]);
  });
});
