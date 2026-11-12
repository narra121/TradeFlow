/** Writes dist/_seo/routes.json so the Node prerender step reads the registry instead of a hard-coded list. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPublicRoutes } from '../../src/content/route-registry';

const dir = resolve(process.cwd(), 'dist', '_seo');
mkdirSync(dir, { recursive: true });
const routes = getPublicRoutes().map((r) => ({ path: r.path, kind: r.kind }));
writeFileSync(resolve(dir, 'routes.json'), JSON.stringify({ routes }, null, 2), 'utf8');
console.log(`manifest: ${routes.length} routes`);
