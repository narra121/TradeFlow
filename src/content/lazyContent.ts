import type { ComponentType } from 'react';
import { lazyPage, type LazyPage } from './lazyPage';

const cache = new Map<string, LazyPage>();

/** One lazy component per content key; creating it inside a render would remount the article on every re-render. */
export function lazyContent(key: string, loader: () => Promise<{ default: ComponentType }>): LazyPage {
  let component = cache.get(key);
  if (!component) {
    component = lazyPage(loader);
    cache.set(key, component);
  }
  return component;
}
