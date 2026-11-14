import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A `vite preview` plugin that serves prerendered pages the way the CloudFront router does (infra/cloudfront/router.js):
 * `/pricing` gets `dist/pricing/index.html`. Without it preview answers every such path with `dist/index.html`, the
 * landing page's prerender, so a measured route would also load the landing's chunks.
 */
export function prerenderedRoutes(outDir = 'dist') {
  return {
    name: 'prerendered-routes',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query = ''] = (req.url ?? '/').split('?');
        const last = path.slice(path.lastIndexOf('/') + 1);
        if (path !== '/' && !last.includes('.') && existsSync(join(outDir, path, 'index.html'))) {
          req.url = `${path.replace(/\/+$/, '')}/index.html${query ? `?${query}` : ''}`;
        }
        next();
      });
    },
  };
}
