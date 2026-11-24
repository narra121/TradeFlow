# SEO runbook

How the public site is served, indexed and kept honest. Owner of the process: whoever runs the monthly checklist.

## 1. How a public page reaches a visitor

```
src/content/route-registry.ts  (the one list of public routes; lastmod comes from content)
   |-- scripts/seo/manifest.ts      -> dist/_seo/routes.json
   |-- scripts/prerender-routes.js  -> dist/<path>/index.html   (Playwright; waits for the page's own canonical)
   |-- scripts/generate-og-image.js -> dist/og-image.png
   |-- scripts/seo/postbuild.ts     -> sitemap.xml, llms.txt, llms-full.txt, then verify-dist
   |-- scripts/seo/cf-router.ts     -> infra/cloudfront/router.js (CloudFront Function, generated; deployed by scripts/infra/cf-router.mjs)
```

- `bun run build` runs all of it; `bun run build:dev` does the same with `noindex` on every page.
- `verify-dist` fails the build if any registered route lacks its own prerendered HTML, a unique `<title>`, a self-canonical,
  a meta description, parseable JSON-LD, or the right robots value. Fix the page, never the check.
- CloudFront Function (viewer-request): `www` redirects to the apex; `/path` serves `/path/index.html`; `/app/*` and `/auth/*`
  serve `/_spa.html` (the SPA shell, status 200); `/x/index.html` and trailing slashes redirect (301) to the clean path.
  Viewer-response: hosts other than `tradequt.com` get `x-robots-tag: noindex, nofollow`; every response gets HSTS
  (`max-age=31536000`), `x-content-type-options: nosniff` and `referrer-policy: strict-origin-when-cross-origin`; HTML responses
  also get an enforced `content-security-policy: frame-ancestors 'none'` and the full policy as
  `content-security-policy-report-only` (sources in `scripts/seo/cf-router.ts`; the `'sha256-...'` of the inline boot script in
  `index.html` is computed from that file, so editing the script makes `cf-router.test` fail until you regenerate).
  Report-Only logs violations in the browser console and blocks nothing: after a deploy, browse the site and fix the policy for
  any violation before moving it to `content-security-policy`.
- Origin failures (500, 502, 503, 504): CloudFront returns `/error.html` (static, inline CSS, brand mark) with the original
  status code. `public/maintenance.html` is the full-page maintenance screen; to use it, copy it over `index.html` on the
  bucket (and invalidate) only while the API is switched off, then redeploy to restore.
- Missing objects: the S3 origin answers 403/404, and CloudFront returns `/_spa.html` with status **404**, so unknown URLs are
  real 404s for crawlers and the React `NotFound` page for people.
- `infra/cloudfront/router.js` is generated. Change `SPA_PREFIXES` or hosts in `route-registry.ts`, run
  `bun scripts/seo/cf-router.ts --write`, and the unit test then passes. New posts need no function change.

## 2. Add a page or an article

Article (see `ARTICLE-TEMPLATE.md`): add `src/content/blog/<slug>.tsx`, add its entry to `BLOG_ARTICLES`
(`slug`, title, description <= 200 chars, tags, `publishedAt`, `readingTime`, `summary`, `faq`, optional `updatedAt` and `howTo`,
`content`), run `bun run test` and `bun run build`.
Stand-alone page (pricing, comparison, landing for a topic): add an entry to `SEO_PAGES` in `src/content/seo-pages.ts`, a
component in `src/pages/seo/`, and its loader in `SEO_PAGE_LOADERS` in `src/content/routes.ts` (a test fails if the two
lists differ). Utility pages that must not be indexed (`/goodbye`, `/status`, `/security`) go in `UTILITY_PAGE_LOADERS` and in
`STATIC_ROUTES` of `route-registry.ts` with `noindex: true`. A page with its own `<Route>` (legal, hubs, calculators) needs a
`lazyPage` export and a `PAGE_AT` entry in `src/content/publicPages.ts`, a `<Route>` in `src/PublicRoutes.tsx`, and a
`STATIC_ROUTES` entry; `preloadRoute.test.ts` fails if a registered route has no preload loader.

Rules: one `h1`; the short answer first; every number linked to a primary source with the date checked; no performance claims;
product claims only from `src/content/product-facts.ts`.

## 3. Deploy and verify

1. `bun run build` (production) must end with `verify-dist OK`.
2. Deploy `dist/` to the bucket, then invalidate CloudFront: dev with `TradeQut-Research/release/deploy-fe-dev.sh`, prod with
   `TradeQut-Research/release/deploy-fe-prod.ps1` (the GitHub deploy workflows do the same but deploys are run locally). A new environment needs the CloudFront Function applied **after** this step (section 4).
3. Check three URLs: a new article returns 200 with its own title; `/definitely-missing` returns 404; `/app/dashboard` returns 200.
4. In Search Console, request indexing for new URLs the first time; the sitemap is read automatically.
5. Production only: `deploy-prod.yml` runs `node scripts/seo/indexnow.mjs --since-days 14` after deploying. `deploy-fe-prod.ps1`
   does not, so run that command yourself in a checkout that has `dist/sitemap.xml` (add `--dry-run` to only count the URLs).

## 4. CloudFront Function: apply and revert

**Order: deploy `dist/` to the bucket, then apply, then verify.** The associated error responses send every unknown or
missing path (403/404) to `/_spa.html` and every origin failure (5xx) to `/error.html`. If the bucket does not hold those
files yet (a first deploy, or an environment that never received this build), every `/app/*` URL and Google's
`/auth/callback` would break the moment the distribution updates. The script therefore checks first.

```
node scripts/infra/cf-router.mjs --env dev                    # dry run: the plan, plus the bucket preflight (reads only)
node scripts/infra/cf-router.mjs --env dev --apply            # preflight, backup, test, publish, associate, wait, verify
node scripts/infra/cf-router.mjs --env dev --revert <backup>  # restore the saved config and the previous function code
node scripts/infra/cf-router.mjs --env prod --apply --confirm-prod   # owner only, after dev passes and dist/ is deployed
```

What `--apply` does, in order:

1. **Preflight**: `head-object` on the target bucket for `_spa.html`, `error.html` and one prerendered article
   (`blog/how-to-keep-trading-journal/index.html`, override with `--probe-slug`). If any is missing it stops before any write and
   prints `Deploy dist/ first, then apply, then verify`.
2. **Backup** of the whole distribution config to `infra/cloudfront/backups/` (git-ignored; keep a copy elsewhere).
3. **Function tests**: nine `test-function` cases (root, article, `/app/*`, `/auth/callback`, trailing slash, assets, `www`
   redirect, `noindex` off the canonical host, security headers on HTML) against the DEVELOPMENT stage; nothing is associated if
   one fails.
4. Publish, associate (viewer-request and viewer-response), set the error responses, wait for the deployment.
5. **Verify** against the live site: own pages, a real 404, `/app/dashboard` and `/auth/callback` answer 200 with the shell,
   `/blog/` redirects, the home page carries HSTS, `frame-ancestors` and the Report-Only CSP, dev sends `noindex`.
6. **Automatic revert**: if verify fails, the saved config is restored, the function's previous LIVE code is published again (or the
   function is deleted when it did not exist before), and the command exits non-zero. If that revert also fails, the message names the exact `--revert "<backup>"` command to run by hand.

The logic lives in `scripts/infra/cf-router-lib.mjs` with every side effect injected; `src/content/__tests__/cf-router-apply.test.ts`
runs it against a mocked S3 and CloudFront (using the real `router.js`), including the refusal when an object is missing and
the automatic revert.

## 5. Search Console, Bing and IndexNow (owner accounts)

- Google Search Console: add the `tradequt.com` Domain property with the DNS TXT record, submit
  `https://tradequt.com/sitemap.xml`. Optional: set `VITE_GSC_VERIFICATION` for the HTML-tag method.
- Bing Webmaster Tools: import from Search Console or add the site; `VITE_BING_VERIFICATION` renders the verification tag.
- IndexNow: the key file lives in `public/<key>.txt`; `scripts/seo/indexnow.mjs --since-days 14` pings changed URLs.
- Analytics: set `VITE_GA_MEASUREMENT_ID` (empty = analytics off). Consent defaults to denied in EEA, UK and Switzerland.
- Prod values for the three public variables above live in `TradeQut-Research/release/fe-prod-public.env`; the prod deploy script appends
  every non-empty line to `.env.production`.
- Traffic without an analytics tag: CloudFront standard logs for the prod distribution land in
  `s3://tradequt-cf-logs-675016865482-us-east-1/prod/` (kept 90 days). `python TradeQut-Research/seo/tracking/cf_traffic.py --days 7`
  reports human sessions by source, landing pages, the pricing/signup/app funnel and crawler hits. Outreach links carry `?ref=<channel>` so the
  report can attribute them.
- Ads are off at launch; they load only when `VITE_ADS_ENABLED=true` and never inside `/app`.

## 5a. Status and incidents

`/status` renders `public/status.json` (`updated`, `status` = operational | degraded | outage | maintenance, `message`,
`incidents[]`). To announce an incident, edit that file, deploy (or upload just that file), and invalidate `/status.json`.
The shape is deliberately small; align it with the in-app incident bar when that spec lands.

## 5b. Fonts, audit and budgets

- Fonts: DM Sans (400-700) and JetBrains Mono (400-500) are self-hosted in `public/fonts/` (woff2, latin plus latin-ext,
  `font-display: swap`, except `block` on the preloaded DM Sans latin file, two preloads in `index.html`). To change a font, download the subset, slim it with
  `fontTools.varLib.instancer` (pin `opsz`, limit `wght`), keep the total under 120 kB and 4 files; `public-assets.test.ts` checks it.
- Audit: `node scripts/seo/audit-public.mjs --out <dir>` after a build checks every public route at 1280 and 375 px for console
  errors, overflow, one `h1`, names and labels, text and target sizes, no blur or gradient, radii in {0, 2, 4, 6}, at most 6
  type sizes, focus never entirely under the sticky header, and a forced-colors smoke test (CI job `public-site`).
- Budgets: `node scripts/perf/budget.mjs` measures gzip JS and CSS, fonts, LCP and CLS on four public routes against the
  targets in `scripts/perf/budgets.json`. The baseline is a ratchet: a metric that is over its target may not exceed its baseline
  by more than 5%; lower the baseline with `--record-baseline` after an improvement. Reports are written to `--out`.
- Import template: `public/import-template.csv` (three sample rows) is the file users download on the Import page; it parses
  through the backend's generic importer ("Other broker").

## 6. Entity consistency (for AI assistants)

Use the one definition sentence from `product-facts.ts` on the pricing page, the home JSON-LD, `llms.txt` and the About page.
`llms.txt` and `llms-full.txt` are generated at build; if a price, limit or broker list changes, change `product-facts.ts` only.
Do not add ratings, reviews, user counts or testimonials anywhere (no real ones exist; fabricating them breaks advertising
rules and Google policy).

## 7. India notes for content

- Never state tax or legal conclusions; link to the primary source and suggest a chartered accountant.
- Forex and prop-firm pages: RBI publishes an Alert List of unauthorised forex platforms and residents trading forex on
  unauthorised platforms can face FEMA action. Check RBI's current list before writing, say TradeQut recommends no firm,
  and keep the framing educational.
- Charges and STT change by budget and exchange circulars: re-read the broker's charges page and cite its date.

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails with `title duplicates ...` | two pages share a title | give each its own title in the registry/page |
| Prerender times out on one route | the route has no `<Route>` (it renders NotFound, so the canonical never matches) or the page throws | add the route (`CONTENT_ROUTES` via `routes.ts` for SEO pages, `PublicRoutes.tsx` for others); check the page in `vite preview` |
| `cf-router.test` fails | `route-registry.ts` changed | `bun scripts/seo/cf-router.ts --write` |
| Dev page serves the home page | the function is not associated or the bucket is stale | re-run `--apply`; deploy the new `dist/` |
| Page not indexed after weeks | thin or duplicate content, or blocked | Search Console URL Inspection; improve the page; check `robots` and canonical |

## 9. Making changes

1. New page or article: section 2 above, and [ARCHITECTURE.md](../ARCHITECTURE.md) section 13(b) for the ordered file list.
2. Changed routes, hosts, `SPA_PREFIXES` or the `index.html` inline script: `bun scripts/seo/cf-router.ts --write`, then `bun run test` (`cf-router.test`), deploy `dist/`, then section 4 (`cf-router.mjs` dev, then prod).
3. Before deploy: `bun run test`, `bun run build` (ends with `verify-dist OK`), optionally `node scripts/seo/audit-public.mjs --out <dir>` and `node scripts/perf/budget.mjs --out <dir>`.
