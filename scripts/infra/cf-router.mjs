#!/usr/bin/env node
/**
 * Deploys the CloudFront Function in infra/cloudfront/router.js to one distribution and points the SPA error
 * responses at /_spa.html (403/404, status 404) and /error.html (5xx).
 *
 * ORDER: deploy dist/ to the bucket  ->  apply  ->  verify.  `--apply` refuses unless _spa.html, error.html and a prerendered
 * blog page already exist in the bucket, and reverts automatically if its live verification fails.
 *
 *   node scripts/infra/cf-router.mjs --env dev                 # dry run: prints the plan and the bucket preflight (reads only)
 *   node scripts/infra/cf-router.mjs --env dev --apply         # preflight, backup, test, publish, associate, wait, verify, auto-revert on failure
 *   node scripts/infra/cf-router.mjs --env dev --revert <backup.json>
 *   node scripts/infra/cf-router.mjs --env prod ... --confirm-prod   # owner/main only
 *
 * Needs the `personal` AWS profile (override with AWS_PROFILE). Backups go to --backup-dir
 * (default infra/cloudfront/backups, git-ignored) and hold the full DistributionConfig plus its ETag.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRouter, ENVS } from './cf-router-lib.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const envName = opt('env');
if (!ENVS[envName]) fail('usage: --env dev|prod [--apply | --revert <backup.json>] [--backup-dir <dir>] [--probe-slug <slug>]');
if (envName === 'prod' && !flag('confirm-prod')) fail('refusing to touch prod without --confirm-prod (owner/main only)');
const profile = process.env.AWS_PROFILE || 'personal';

function aws(cliArgs, { allowFail = false } = {}) {
  const r = spawnSync('aws', ['--no-cli-pager', '--profile', profile, '--region', 'us-east-1', ...cliArgs, '--output', 'json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    if (allowFail) return null;
    throw new Error(`aws ${cliArgs.slice(0, 2).join(' ')} failed: ${r.stderr.slice(0, 500)}`);
  }
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
}

const cfg = ENVS[envName];
const router = createRouter({
  envName,
  cfg,
  aws,
  fetchImpl: fetch,
  readFile: (p) => readFileSync(p, 'utf8'),
  writeFile: (p, data) => writeFileSync(p, data),
  ensureDir: (d) => mkdirSync(d, { recursive: true }),
  tmp: (name, data) => {
    const p = join(tmpdir(), `cfrouter-${process.pid}-${name}`);
    writeFileSync(p, data);
    return p.replace(/\\/g, '/');
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  log: (m) => console.log(m),
  now: () => new Date(),
  routerPath: resolve('infra/cloudfront/router.js'),
  backupDir: resolve(opt('backup-dir') ?? 'infra/cloudfront/backups'),
  probeSlug: opt('probe-slug'),
  waitDeployed: () => {
    console.log('waiting for distribution to deploy (several minutes)...');
    const r = spawnSync('aws', ['--profile', profile, '--region', 'us-east-1', 'cloudfront', 'wait', 'distribution-deployed', '--id', cfg.distribution], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`wait failed: ${r.stderr}`);
  },
});

try {
  if (opt('revert')) router.revert(resolve(opt('revert')));
  else if (flag('apply')) await router.apply();
  else {
    router.plan();
    console.log('dry run; add --apply');
  }
} catch (e) {
  fail(String(e.message ?? e));
}
