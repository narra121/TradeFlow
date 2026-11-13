// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect } from 'vitest';
import { createRouter, ENVS, DEFAULT_PROBE_SLUG, type RouterDeps } from '../../../scripts/infra/cf-router-lib.mjs';

const ROUTER_PATH = 'infra/cloudfront/router.js';
const REAL_ROUTER = readFileSync(ROUTER_PATH, 'utf8');

type Handler = (event: unknown) => { statusCode?: number } & Record<string, unknown>;
function loadHandler(source: string): Handler {
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(`${source}\nthis.handler = handler;`, ctx);
  return ctx.handler as Handler;
}

interface DistConfig {
  DefaultCacheBehavior: { TargetOriginId?: string; FunctionAssociations: { Quantity: number; Items?: { EventType: string }[] } };
  CustomErrorResponses: { Quantity?: number; Items: { ErrorCode: number; ResponsePagePath: string; ResponseCode: string; ErrorCachingMinTTL?: number }[] };
  [k: string]: unknown;
}

const ORIGINAL_CONFIG: DistConfig = {
  Aliases: { Quantity: 1, Items: ['dev.tradequt.com'] },
  DefaultCacheBehavior: { TargetOriginId: 'o', FunctionAssociations: { Quantity: 0 } },
  CustomErrorResponses: {
    Quantity: 2,
    Items: [
      { ErrorCode: 403, ResponsePagePath: '/index.html', ResponseCode: '200', ErrorCachingMinTTL: 10 },
      { ErrorCode: 404, ResponsePagePath: '/index.html', ResponseCode: '200', ErrorCachingMinTTL: 10 },
    ],
  },
};

/** In-memory S3 bucket, CloudFront distribution and site: just enough behaviour for the router's commands. */
const OLD_ROUTER = '// router v1 (what is LIVE before the apply)';
const FN_CONFIG = { Comment: 'TradeQut router', Runtime: 'cloudfront-js-2.0' };

function fakeCloud(opts: { keys?: string[]; routerSource?: string; siteBroken?: boolean; revertFails?: boolean; deleteFails?: boolean; alreadyAssociated?: boolean; env?: 'dev' | 'prod' } = {}) {
  const env = opts.env ?? 'dev';
  const keys = new Set(opts.keys ?? ['_spa.html', 'error.html', `blog/${DEFAULT_PROBE_SLUG}/index.html`]);
  const fnArn = 'arn:aws:cloudfront::1:function/tradequt-router';
  const associated = (): DistConfig['DefaultCacheBehavior']['FunctionAssociations'] => ({ Quantity: 2, Items: [{ EventType: 'viewer-request' }, { EventType: 'viewer-response' }] });
  /** A router that an earlier apply already published and associated: LIVE holds the old code. */
  const initial: DistConfig = structuredClone(ORIGINAL_CONFIG);
  if (opts.alreadyAssociated) initial.DefaultCacheBehavior.FunctionAssociations = associated();
  let config: DistConfig = structuredClone(initial);
  let functionExists = !!opts.alreadyAssociated;
  let devCode: string | null = opts.alreadyAssociated ? OLD_ROUTER : null;
  let liveCode: string | null = opts.alreadyAssociated ? OLD_ROUTER : null;
  let deployedFn = !!opts.alreadyAssociated;
  const calls: string[][] = [];
  const files = new Map<string, string>();
  const handler = loadHandler(opts.routerSource ?? REAL_ROUTER);

  const aws = (args: string[], o: { allowFail?: boolean } = {}) => {
    calls.push(args);
    const [svc, cmd] = args;
    const arg = (name: string) => args[args.indexOf(name) + 1];
    const fileArg = (name: string) => files.get(arg(name).replace(/^fileb?:\/\//, ''));
    if (svc === 's3api' && cmd === 'head-object') {
      expect(arg('--bucket')).toBe(ENVS[env].bucket);
      if (keys.has(arg('--key'))) return { ContentLength: 1 };
      if (o.allowFail) return null;
      throw new Error('404 Not Found');
    }
    switch (cmd) {
      case 'get-distribution-config':
        return { ETag: 'EDIST', DistributionConfig: structuredClone(config) };
      case 'update-distribution': {
        const next = JSON.parse(fileArg('--distribution-config')!);
        if (opts.revertFails && next.DefaultCacheBehavior.FunctionAssociations.Quantity === 0) throw new Error('update rejected');
        config = next;
        deployedFn = next.DefaultCacheBehavior.FunctionAssociations.Quantity > 0;
        return {};
      }
      case 'describe-function': {
        const code = arg('--stage') === 'LIVE' ? liveCode : devCode;
        if (functionExists && code !== null) return { ETag: 'EFN', FunctionSummary: { FunctionConfig: FN_CONFIG } };
        if (o.allowFail) return null;
        throw new Error('no function');
      }
      case 'get-function':
        files.set(args[args.length - 1], liveCode as string);
        return { ETag: 'EFN', ContentType: 'application/octet-stream' };
      case 'create-function':
      case 'update-function':
        functionExists = true;
        devCode = fileArg('--function-code')!;
        return { ETag: 'EFN2' };
      case 'test-function': {
        const ev = JSON.parse(fileArg('--event-object')!);
        const out = handler(ev);
        const output = ev.context.eventType === 'viewer-response' || out.statusCode ? { response: out } : { request: out };
        return { TestResult: { FunctionOutput: JSON.stringify(output), FunctionErrorMessage: '' } };
      }
      case 'publish-function':
        liveCode = devCode;
        return { FunctionSummary: { FunctionMetadata: { FunctionARN: fnArn } } };
      case 'create-invalidation':
        return {};
      case 'delete-function':
        // CloudFront refuses to delete a function a distribution still uses.
        if (opts.deleteFails || config.DefaultCacheBehavior.FunctionAssociations.Quantity > 0) throw new Error('FunctionInUse');
        functionExists = false;
        devCode = liveCode = null;
        return {};
      default:
        throw new Error(`unexpected aws call: ${args.join(' ')}`);
    }
  };

  /** The headers the real router adds to an HTML response once it is associated. */
  const htmlHeaders = (): Record<string, string> => {
    const response = {
      statusCode: 200,
      headers: { 'content-type': { value: 'text/html' } },
    };
    const event = { version: '1.0', context: { eventType: 'viewer-response' }, request: { method: 'GET', uri: '/', querystring: {}, headers: { host: { value: ENVS[env].host } }, cookies: {} }, response };
    const out = handler(event) as unknown as { headers: Record<string, { value: string }> };
    return Object.fromEntries(Object.entries(out.headers).map(([k, v]) => [k, v.value]));
  };

  /** What a visitor sees: the router only works once associated, and the app shell needs _spa.html in the bucket. */
  const fetchImpl: RouterDeps['fetchImpl'] = async (url) => {
    const path = new URL(url).pathname;
    const res = (status: number, title = '', headers: Record<string, string> = {}) => ({
      status,
      text: async () => (title ? `<html><title>${title}</title></html>` : ''),
      headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
    });
    const noindex = env === 'dev' ? { 'x-robots-tag': 'noindex, nofollow' } : {};
    if (path === '/') return res(200, 'Home', { ...noindex, ...(deployedFn ? htmlHeaders() : {}) });
    if (path === '/blog/') return res(301, '', { location: '/blog' });
    if (/^\/(app|auth)(\/|$)/.test(path)) return res(deployedFn && keys.has('_spa.html') && !opts.siteBroken ? 200 : 404, 'Shell');
    if (['/guide', '/blog', `/blog/${DEFAULT_PROBE_SLUG}`, '/glossary', '/resources/position-size'].includes(path)) return res(200, `Page ${path}`);
    return res(404, 'Shell');
  };

  const log: string[] = [];
  const router = createRouter({
    envName: env,
    cfg: ENVS[env],
    aws,
    fetchImpl,
    readFile: (p) => (p === ROUTER_PATH ? REAL_ROUTER : (files.get(p) as string)),
    writeFile: (p, d) => void files.set(p, d),
    ensureDir: () => undefined,
    tmp: (name, data) => {
      const p = `/mem/${name}`;
      files.set(p, data);
      return p;
    },
    sleep: async () => undefined,
    log: (m) => void log.push(m),
    now: () => new Date('2026-11-12T10:00:00Z'),
    routerPath: ROUTER_PATH,
    backupDir: '/backups',
    postDeployWaitMs: 0,
    waitDeployed: () => undefined,
  });

  const writes = () => calls.filter((c) => ['update-distribution', 'create-function', 'update-function', 'publish-function', 'create-invalidation'].includes(c[1]));
  return { router, calls, log, files, writes, config: () => config, keys, isDeployed: () => deployedFn, liveCode: () => liveCode, functionExists: () => functionExists, initial };
}

describe('cf-router preflight (G-01)', () => {
  for (const missing of ['_spa.html', 'error.html', `blog/${DEFAULT_PROBE_SLUG}/index.html`]) {
    it(`refuses to apply when ${missing} is not in the bucket, before any write`, async () => {
      const cloud = fakeCloud({ keys: ['_spa.html', 'error.html', `blog/${DEFAULT_PROBE_SLUG}/index.html`].filter((k) => k !== missing) });
      await expect(cloud.router.apply()).rejects.toThrow(new RegExp(`missing .*${missing.replace(/[./]/g, '\\$&')}`));
      await expect(cloud.router.apply()).rejects.toThrow(/Deploy dist\/ first/);
      expect(cloud.writes()).toEqual([]);
      expect(cloud.files.size).toBe(0);
    });
  }

  it('the dry run reports a failing preflight and writes nothing', () => {
    const cloud = fakeCloud({ keys: ['index.html'] });
    const plan = cloud.router.plan();
    expect(plan.ready).toBe(false);
    expect(plan.missing).toHaveLength(3);
    expect(cloud.log.join('\n')).toContain('preflight would FAIL');
    expect(cloud.writes()).toEqual([]);
  });

  it('checks the target environment bucket (prod uses the prod bucket)', () => {
    const cloud = fakeCloud({ env: 'prod' });
    expect(cloud.router.plan().ready).toBe(true);
    expect(ENVS.prod.bucket).toBe('tradequt.com-prod');
    expect(ENVS.dev.bucket).toBe('tradequt.com-dev');
  });
});

describe('cf-router apply', () => {
  it('associates the function and the error responses once the objects exist, and verifies', async () => {
    const cloud = fakeCloud();
    const { backupFile } = await cloud.router.apply();
    const dc = cloud.config();
    expect(dc.DefaultCacheBehavior.FunctionAssociations.Items!.map((i) => i.EventType)).toEqual(['viewer-request', 'viewer-response']);
    const errors = Object.fromEntries(dc.CustomErrorResponses.Items.map((e) => [e.ErrorCode, [e.ResponsePagePath, e.ResponseCode]]));
    expect(errors).toEqual({
      403: ['/_spa.html', '404'],
      404: ['/_spa.html', '404'],
      500: ['/error.html', '500'],
      502: ['/error.html', '502'],
      503: ['/error.html', '503'],
      504: ['/error.html', '504'],
    });
    expect(cloud.writes().filter((c) => c[1] === 'update-distribution')).toHaveLength(1);
    expect(JSON.parse(cloud.files.get(backupFile)!).DistributionConfig).toEqual(ORIGINAL_CONFIG);
    expect(cloud.log.join('\n')).toContain('preflight OK');
  });

  it('runs the real router against the fixture events, including /auth/callback, before associating anything', async () => {
    const cloud = fakeCloud();
    await cloud.router.apply();
    const tests = cloud.calls.filter((c) => c[1] === 'test-function');
    expect(tests.length).toBeGreaterThanOrEqual(8);
    expect(cloud.log.filter((l) => l.includes('test PASS')).join('\n')).toContain('auth callback');
    expect(cloud.calls.findIndex((c) => c[1] === 'test-function')).toBeLessThan(cloud.calls.findIndex((c) => c[1] === 'update-distribution'));
  });

  it('does not associate anything when a function test fails', async () => {
    const broken = REAL_ROUTER.replace("var SPA_SHELL = '/_spa.html';", "var SPA_SHELL = '/wrong.html';");
    expect(broken).not.toBe(REAL_ROUTER);
    const cloud = fakeCloud({ routerSource: broken });
    await expect(cloud.router.apply()).rejects.toThrow(/function test\(s\) failed; nothing was associated/);
    expect(cloud.calls.some((c) => c[1] === 'update-distribution')).toBe(false);
  });

  it('does not associate a router that adds no CSP headers to HTML', async () => {
    const noCsp = REAL_ROUTER.replace("type.value.indexOf('text/html') === 0", 'false');
    expect(noCsp).not.toBe(REAL_ROUTER);
    const cloud = fakeCloud({ routerSource: noCsp });
    await expect(cloud.router.apply()).rejects.toThrow(/function test\(s\) failed; nothing was associated/);
    expect(cloud.log.join('\n')).toContain('test FAIL: security headers on html');
  });

  it('reverts automatically when the live verification fails', async () => {
    const cloud = fakeCloud({ siteBroken: true });
    await expect(cloud.router.apply()).rejects.toThrow(/reverted to the backup/);
    expect(cloud.writes().filter((c) => c[1] === 'update-distribution')).toHaveLength(2);
    expect(cloud.config()).toEqual(ORIGINAL_CONFIG);
    expect(cloud.isDeployed()).toBe(false);
    expect(cloud.calls.some((c) => c[1] === 'delete-function')).toBe(true);
    expect(cloud.log.join('\n')).toMatch(/verification\(s\) failed; reverting automatically/);
  });

  it('says how to revert by hand when the automatic revert fails too', async () => {
    const cloud = fakeCloud({ siteBroken: true, revertFails: true });
    await expect(cloud.router.apply()).rejects.toThrow(/automatic revert failed .* --revert "\/backups\/dev-E2YV3RSX90ESV4-20261112_100000\.json"/);
  });

  it('verify itself passes on a healthy site and reports each failing check', async () => {
    const healthy = fakeCloud();
    await healthy.router.apply();
    expect(await healthy.router.verify()).toBe(0);
    const broken = fakeCloud({ siteBroken: true });
    expect(await broken.router.verify()).toBeGreaterThanOrEqual(2); // /app/dashboard and /auth/callback
    expect(broken.log.join('\n')).toContain('/auth/callback returns the SPA shell with 200');
  });

  it('a second apply that fails verification puts the previous LIVE router code back and does not hide a refused delete (FE-006)', async () => {
    const cloud = fakeCloud({ siteBroken: true, alreadyAssociated: true });
    await expect(cloud.router.apply()).rejects.toThrow(/reverted to the backup/);
    expect(cloud.liveCode()).toBe(OLD_ROUTER);
    expect(cloud.config()).toEqual(cloud.initial);
    expect(cloud.functionExists()).toBe(true);
    expect(cloud.calls.some((c) => c[1] === 'delete-function')).toBe(false);
    expect(cloud.log.join('\n')).toContain('restored the previous LIVE code');
  });

  it('keeps the previous LIVE code in the backup file, taken before anything is published', async () => {
    const cloud = fakeCloud({ alreadyAssociated: true });
    const { backupFile } = await cloud.router.apply();
    const saved = JSON.parse(cloud.files.get(backupFile)!);
    expect(saved.previousFunction).toEqual({ config: FN_CONFIG, code: OLD_ROUTER });
    expect(cloud.calls.findIndex((c) => c[1] === 'get-function')).toBeLessThan(cloud.calls.findIndex((c) => c[1] === 'publish-function'));
    expect(cloud.liveCode()).toBe(REAL_ROUTER);
    cloud.router.revert(backupFile);
    expect(cloud.liveCode()).toBe(OLD_ROUTER);
  });

  it('records no previous function on a first apply', async () => {
    const cloud = fakeCloud();
    const { backupFile } = await cloud.router.apply();
    expect(JSON.parse(cloud.files.get(backupFile)!).previousFunction).toBeNull();
  });

  it('reports a delete the revert could not do instead of logging "reverted"', async () => {
    const cloud = fakeCloud({ siteBroken: true, deleteFails: true });
    await expect(cloud.router.apply()).rejects.toThrow(/automatic revert failed .*was not deleted.*FunctionInUse/);
    expect(cloud.log.join('\n')).not.toContain('deleted tradequt-router');
  });

  it('the manual revert restores the saved config and deletes the function', async () => {
    const cloud = fakeCloud();
    const { backupFile } = await cloud.router.apply();
    expect(cloud.config().DefaultCacheBehavior.FunctionAssociations.Quantity).toBe(2);
    cloud.router.revert(backupFile);
    expect(cloud.config()).toEqual(ORIGINAL_CONFIG);
    expect(cloud.calls.some((c) => c[1] === 'delete-function')).toBe(true);
  });
});
