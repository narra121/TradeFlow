/**
 * Logic of scripts/infra/cf-router.mjs with every side effect injected (AWS CLI, fetch, files, sleeping), so it can be tested
 * against a mocked S3 / CloudFront client (src/content/__tests__/cf-router-apply.test.ts).
 *
 * Order enforced by `apply`: preflight (objects exist in the bucket) -> backup -> function test -> publish -> associate -> wait ->
 * verify -> automatic revert if verify fails. The preflight exists because the associated error responses point at
 * /_spa.html and /error.html: applying before the first deploy of dist/ would break every /app and /auth/callback URL.
 */

export const ENVS = {
  dev: { distribution: 'E2YV3RSX90ESV4', fn: 'tradequt-router-dev', site: 'https://dev.tradequt.com', host: 'dev.tradequt.com', bucket: 'tradequt.com-dev' },
  prod: { distribution: 'E1HW3I3EQVZLRD', fn: 'tradequt-router-prod', site: 'https://tradequt.com', host: 'tradequt.com', bucket: 'tradequt.com-prod' },
};

/** Any published article works as the probe; this one has existed since the first prerendered build. */
export const DEFAULT_PROBE_SLUG = 'how-to-keep-trading-journal';

export function createRouter(deps) {
  const { envName, cfg, aws, fetchImpl, readFile, writeFile, ensureDir, tmp, sleep, log, routerPath, backupDir, now } = deps;
  const probeSlug = deps.probeSlug ?? DEFAULT_PROBE_SLUG;
  const postDeployWaitMs = deps.postDeployWaitMs ?? 20000;

  const getDistribution = () => aws(['cloudfront', 'get-distribution-config', '--id', cfg.distribution]);

  /** Objects the router and the error responses depend on. */
  const requiredKeys = () => ['_spa.html', 'error.html', `blog/${probeSlug}/index.html`];

  /** Returns the keys missing from the target bucket (empty = ready). */
  function missingObjects() {
    return requiredKeys().filter((key) => !aws(['s3api', 'head-object', '--bucket', cfg.bucket, '--key', key], { allowFail: true }));
  }

  function preflight() {
    const missing = missingObjects();
    if (missing.length) {
      throw new Error(
        `refusing to apply: s3://${cfg.bucket} is missing ${missing.join(', ')}. ` +
          'The 403/404 -> /_spa.html and 5xx -> /error.html responses would break every /app and /auth/callback URL. ' +
          'Deploy dist/ first, then apply, then verify.',
      );
    }
    log(`preflight OK: s3://${cfg.bucket} has ${requiredKeys().join(', ')}`);
  }

  function saveBackup() {
    ensureDir(backupDir);
    const dist = getDistribution();
    const stamp = now().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
    const file = `${backupDir}/${envName}-${cfg.distribution}-${stamp}.json`;
    writeFile(file, JSON.stringify({ env: envName, distribution: cfg.distribution, ETag: dist.ETag, DistributionConfig: dist.DistributionConfig, newFunctionCode: readFile(routerPath) }, null, 2));
    return { file, dist };
  }

  const event = (type, uri, host = cfg.host, extra = {}) => ({
    version: '1.0',
    context: { eventType: type },
    viewer: { ip: '203.0.113.9' },
    request: { method: 'GET', uri, querystring: {}, headers: { host: { value: host } }, cookies: {} },
    ...extra,
  });

  const TESTS = [
    { name: 'root', ev: event('viewer-request', '/'), check: (o) => o.request?.uri === '/index.html' },
    { name: 'article', ev: event('viewer-request', `/blog/${probeSlug}`), check: (o) => o.request?.uri === `/blog/${probeSlug}/index.html` },
    { name: 'app shell', ev: event('viewer-request', '/app/dashboard'), check: (o) => o.request?.uri === '/_spa.html' },
    { name: 'auth callback', ev: event('viewer-request', '/auth/callback'), check: (o) => o.request?.uri === '/_spa.html' },
    { name: 'trailing slash', ev: event('viewer-request', '/blog/'), check: (o) => o.response?.statusCode === 301 && o.response.headers?.location?.value === '/blog' },
    { name: 'asset untouched', ev: event('viewer-request', '/assets/index-abc.js'), check: (o) => o.request?.uri === '/assets/index-abc.js' },
    {
      name: 'www redirect',
      ev: event('viewer-request', '/pricing', 'www.tradequt.com'),
      check: (o) => o.response?.statusCode === 301 && o.response.headers?.location?.value === 'https://tradequt.com/pricing',
    },
    {
      name: 'noindex off canonical host',
      ev: event('viewer-response', '/x', 'dev.tradequt.com', { response: { statusCode: 200, headers: {} } }),
      check: (o) => (envName === 'prod' ? true : o.response?.headers?.['x-robots-tag']?.value === 'noindex, nofollow'),
    },
  ];

  const describeFunction = (stage) => aws(['cloudfront', 'describe-function', '--name', cfg.fn, '--stage', stage], { allowFail: true });

  function upsertFunction() {
    const code = tmp('router.js', readFile(routerPath));
    const config = JSON.stringify({ Comment: `TradeQut router (${envName}): prerendered pages, SPA shell, www redirect`, Runtime: 'cloudfront-js-2.0' });
    const existing = describeFunction('DEVELOPMENT');
    if (!existing) return aws(['cloudfront', 'create-function', '--name', cfg.fn, '--function-config', config, '--function-code', `fileb://${code}`]);
    return aws(['cloudfront', 'update-function', '--name', cfg.fn, '--if-match', existing.ETag, '--function-config', config, '--function-code', `fileb://${code}`]);
  }

  function runTests(etag) {
    let failed = 0;
    for (const t of TESTS) {
      const ev = tmp(`ev-${t.name.replace(/\W/g, '')}.json`, JSON.stringify(t.ev));
      const res = aws(['cloudfront', 'test-function', '--name', cfg.fn, '--if-match', etag, '--stage', 'DEVELOPMENT', '--event-object', `fileb://${ev}`]);
      const out = JSON.parse(res.TestResult.FunctionOutput || '{}');
      const ok = !res.TestResult.FunctionErrorMessage && t.check(out);
      if (!ok) failed++;
      log(`  test ${ok ? 'PASS' : 'FAIL'}: ${t.name}${ok ? '' : ` -> ${res.TestResult.FunctionOutput} ${res.TestResult.FunctionErrorMessage ?? ''}`}`);
    }
    if (failed) throw new Error(`${failed} function test(s) failed; nothing was associated`);
  }

  function applyAssociation(functionArn) {
    const { ETag, DistributionConfig: dc } = getDistribution();
    dc.DefaultCacheBehavior.FunctionAssociations = {
      Quantity: 2,
      Items: [
        { FunctionARN: functionArn, EventType: 'viewer-request' },
        { FunctionARN: functionArn, EventType: 'viewer-response' },
      ],
    };
    // Unknown paths: SPA shell with a real 404. Origin failures: the static brand page (public/error.html), status code kept.
    const notFound = [403, 404].map((code) => ({ ErrorCode: code, ResponsePagePath: '/_spa.html', ResponseCode: '404', ErrorCachingMinTTL: 10 }));
    const serverErrors = [500, 502, 503, 504].map((code) => ({ ErrorCode: code, ResponsePagePath: '/error.html', ResponseCode: String(code), ErrorCachingMinTTL: 10 }));
    dc.CustomErrorResponses = { Quantity: 6, Items: [...notFound, ...serverErrors] };
    aws(['cloudfront', 'update-distribution', '--id', cfg.distribution, '--if-match', ETag, '--distribution-config', `file://${tmp('dist.json', JSON.stringify(dc))}`]);
  }

  async function head(path, hostHeader) {
    const r = await fetchImpl(`${cfg.site}${path}`, { redirect: 'manual', headers: hostHeader ? { host: hostHeader } : {} });
    const text = r.status === 200 || r.status === 404 ? await r.text() : '';
    return { status: r.status, title: /<title[^>]*>([^<]*)</.exec(text)?.[1] ?? '', robots: r.headers.get('x-robots-tag'), location: r.headers.get('location') };
  }

  /** Live checks against the site; returns the number of failed checks. */
  async function verify() {
    const home = await head('/');
    let bad = 0;
    const expect = (cond, label, got) => {
      if (!cond) bad++;
      log(`  verify ${cond ? 'PASS' : 'FAIL'}: ${label} ${cond ? '' : JSON.stringify(got)}`);
    };
    for (const p of ['/guide', '/blog', `/blog/${probeSlug}`, '/glossary', '/resources/position-size']) {
      const r = await head(p);
      expect(r.status === 200 && r.title && r.title !== home.title, `${p} serves its own page`, r);
    }
    expect((await head('/unlazy-should-404-xyz')).status === 404, 'unknown path returns 404', null);
    const app = await head('/app/dashboard');
    expect(app.status === 200, '/app/dashboard returns the SPA shell with 200', app);
    const cb = await head('/auth/callback');
    expect(cb.status === 200, '/auth/callback returns the SPA shell with 200 (Google sign-in)', cb);
    const slash = await head('/blog/');
    expect(slash.status === 301, '/blog/ redirects to /blog', slash);
    if (envName !== 'prod') expect(/noindex/.test(home.robots ?? ''), 'x-robots-tag noindex on the non-canonical host', home);
    return bad;
  }

  /** Restores the saved distribution config, waits for it to deploy and deletes the function. */
  function revert(backupFile) {
    const backup = JSON.parse(readFile(backupFile));
    if (backup.distribution !== cfg.distribution) throw new Error('backup is for a different distribution');
    const { ETag } = getDistribution();
    aws(['cloudfront', 'update-distribution', '--id', cfg.distribution, '--if-match', ETag, '--distribution-config', `file://${tmp('restore.json', JSON.stringify(backup.DistributionConfig))}`]);
    deps.waitDeployed();
    const fn = describeFunction('DEVELOPMENT');
    if (fn) aws(['cloudfront', 'delete-function', '--name', cfg.fn, '--if-match', fn.ETag], { allowFail: true });
    log(`reverted distribution config from ${backupFile}`);
  }

  /** Dry run: reads only. */
  function plan() {
    log(`plan (${envName}): preflight s3://${cfg.bucket} -> backup ${cfg.distribution} -> test + publish ${cfg.fn} -> associate viewer-request/response -> 403/404 => /_spa.html 404, 5xx => /error.html -> wait -> verify -> auto-revert if verify fails`);
    const missing = missingObjects();
    log(missing.length ? `preflight would FAIL: s3://${cfg.bucket} is missing ${missing.join(', ')} (deploy dist/ first)` : `preflight OK: s3://${cfg.bucket} has ${requiredKeys().join(', ')}`);
    return { ready: missing.length === 0, missing };
  }

  async function apply() {
    preflight();
    const { file, dist } = saveBackup();
    log(`backup saved: ${file} ETag ${dist.ETag}`);
    const created = upsertFunction();
    runTests(created.ETag);
    const published = aws(['cloudfront', 'publish-function', '--name', cfg.fn, '--if-match', created.ETag]);
    applyAssociation(published.FunctionSummary.FunctionMetadata.FunctionARN);
    deps.waitDeployed();
    if (envName === 'dev') aws(['cloudfront', 'create-invalidation', '--distribution-id', cfg.distribution, '--paths', '/*']);
    await sleep(postDeployWaitMs);
    const bad = await verify();
    if (bad) {
      log(`${bad} verification(s) failed; reverting automatically from ${file}`);
      try {
        revert(file);
      } catch (e) {
        throw new Error(`verify failed AND the automatic revert failed (${e.message}); run: node scripts/infra/cf-router.mjs --env ${envName} --revert "${file}"`);
      }
      throw new Error(`${bad} verification(s) failed; the distribution was reverted to the backup ${file}`);
    }
    log(`done. Revert with: node scripts/infra/cf-router.mjs --env ${envName} --revert "${file}"`);
    return { backupFile: file };
  }

  return { preflight, missingObjects, requiredKeys, plan, apply, revert, verify, saveBackup };
}
