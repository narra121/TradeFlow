import '@testing-library/jest-dom/vitest';

// Polyfill localStorage/sessionStorage for jsdom in vitest threads pool
// The jsdom environment sometimes provides a localStorage object without working methods
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const createStorage = (): Storage => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] ?? null,
    };
  };
  Object.defineProperty(globalThis, 'localStorage', { value: createStorage(), writable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: createStorage(), writable: true });
}

// Mock window.matchMedia for jsdom (used by useIsMobile hook)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
