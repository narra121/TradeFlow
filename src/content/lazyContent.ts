import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const cache = new Map<string, LazyExoticComponent<ComponentType>>();

/** One lazy component per content key; creating it inside a render would remount the article on every re-render. */
export function lazyContent(key: string, loader: () => Promise<{ default: ComponentType }>): LazyExoticComponent<ComponentType> {
  let component = cache.get(key);
  if (!component) {
    component = lazy(loader);
    cache.set(key, component);
  }
  return component;
}
