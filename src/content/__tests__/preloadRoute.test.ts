import { describe, it, expect } from 'vitest';
import { preloadRoute, routeLoaders } from '../preloadRoute';
import { getPublicRoutes, isSpaPath } from '../route-registry';

describe('routeLoaders', () => {
  it('has a loader for every prerendered public route that App.tsx lazy-loads', () => {
    const skipped = new Set(['/login', '/signup']);
    for (const r of getPublicRoutes()) {
      if (skipped.has(r.path)) continue;
      expect(routeLoaders(r.path).length, r.path).toBeGreaterThan(0);
    }
  });

  it('loads the page and the article chunk for a blog post, ignoring a trailing slash', () => {
    expect(routeLoaders('/blog/r-multiple-explained')).toHaveLength(1);
    expect(routeLoaders('/blog/r-multiple-explained/')).toHaveLength(1);
    expect(routeLoaders('/case-studies/forex-session-edge')).toHaveLength(1);
  });

  it('does nothing for the app, auth callback and unknown paths', () => {
    expect(routeLoaders('/app/dashboard')).toEqual([]);
    expect(isSpaPath('/app/dashboard')).toBe(true);
    expect(routeLoaders('/nope')).toEqual([]);
  });
});

describe('preloadRoute', () => {
  it('loads an article page and its content chunk, and tolerates an unknown slug', async () => {
    await expect(preloadRoute('/blog/r-multiple-explained', 20000)).resolves.toBeUndefined();
    await expect(preloadRoute('/blog/not-a-post', 20000)).resolves.toBeUndefined();
    await expect(preloadRoute('/case-studies/forex-session-edge', 20000)).resolves.toBeUndefined();
  });

  it('resolves for unknown paths without loading anything', async () => {
    await expect(preloadRoute('/nope')).resolves.toBeUndefined();
  });

  it('resolves once the real chunk has loaded', async () => {
    await expect(preloadRoute('/pricing', 20000)).resolves.toBeUndefined();
  });
});
