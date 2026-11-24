import { createElement, lazy, type ComponentType } from 'react';

export type LazyPage<P extends object = object> = ComponentType<P> & { preload: () => Promise<void> };

/**
 * `lazy()` that renders without suspending once `preload()` has resolved. React 18's `lazy` suspends on its first render
 * even when the chunk is already loaded, and that commits the Suspense spinner over the prerendered page.
 */
export function lazyPage<P extends object = object>(load: () => Promise<{ default: ComponentType<P> }>): LazyPage<P> {
  let loaded: ComponentType<P> | undefined;
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
  const Page = (props: P) => createElement((loaded ?? Lazy) as ComponentType<P>, props);
  return Object.assign(Page, { preload });
}
