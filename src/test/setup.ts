import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

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

// user-event waits one macrotask between keystrokes and clicks (delay: 0). That yield is what typing-heavy tests spend their time in on a busy CPU,
// so every call skips it. Direct calls (userEvent.type) keep their own defaults; only `delay` is added, at the position of each method's options argument.
const optionsArgAt = { click: 1, dblClick: 1, tripleClick: 1, hover: 1, unhover: 1, keyboard: 1, pointer: 1, paste: 1, type: 2, selectOptions: 2, deselectOptions: 2, upload: 2, copy: 0, cut: 0, tab: 0 };
const directApi = userEvent as unknown as Record<string, (...args: unknown[]) => unknown>;
for (const [name, at] of Object.entries(optionsArgAt)) {
  const call = directApi[name];
  directApi[name] = (...args) => {
    args[at] = { delay: null, ...(args[at] as object) };
    return call(...args);
  };
}
const setupUser = userEvent.setup;
directApi.setup = (options) => setupUser.call(userEvent, { delay: null, ...(options as object) });

// sonner injects a 15 KB stylesheet on import. jsdom matches every rule on each getComputedStyle call, and testing-library makes one per element in getByRole,
// so the sheet roughly doubles that cost; it only draws the toast, which no test asserts on.
beforeEach(() => {
  document.querySelectorAll('style').forEach((el) => {
    if (el.textContent?.includes('data-sonner-toaster')) el.remove();
  });
});
