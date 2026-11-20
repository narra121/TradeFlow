import { createElement, lazy, type ComponentType } from 'react';

export type LazyPage = ComponentType & { preload: () => Promise<void> };

/**
 * `lazy()` that renders without suspending once `preload()` has resolved. React 18's `lazy` suspends on its first render
 * even when the chunk is already loaded, and that commits the Suspense spinner over the prerendered page.
 */
export function lazyPage(load: () => Promise<{ default: ComponentType }>): LazyPage {
  let loaded: ComponentType | undefined;
  let loading: Promise<void> | undefined;
  const preload = () =>
    (loading ??= load().then(
      (module) => {
        loaded = module.default;
      },
      (error: unknown) => {
        // Let the next render retry the import instead of replaying the failure.
        loading = undefined;
        throw error;
      },
    ));
  const Lazy = lazy(() => preload().then(() => ({ default: loaded! })));
  const Page = () => createElement(loaded ?? Lazy);
  return Object.assign(Page, { preload });
}
