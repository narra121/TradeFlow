# TradeFlow (TradeQut frontend)

The web frontend of TradeQut (tradequt.com), a trading journal. React 18, TypeScript, Vite, Tailwind CSS with shadcn/ui (Radix), Redux Toolkit with RTK Query, React Router 6, AWS Amplify Auth (Cognito), Recharts. One build produces a prerendered public site (marketing, SEO, calculators, blog) and the signed-in app under `/app`.

| Environment | Site | API | Backend stack |
|---|---|---|---|
| dev | https://dev.tradequt.com | https://api-dev.tradequt.com | `tradequt-dev` |
| prod | https://tradequt.com | https://api.tradequt.com | `tradequt-prod` |

Backend: `../JournalAWSSetup` (see its [README](../JournalAWSSetup/README.md)). Deploy scripts and ops notes: `../TradeQut-Research/release/`.

## Docs

| Doc | Read it for |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the app is structured, where each thing lives, deploy, and step-by-step recipes for changes |
| [docs/UI-STYLING.md](docs/UI-STYLING.md) | Design tokens, components and styling rules |
| [docs/growth/SEO-RUNBOOK.md](docs/growth/SEO-RUNBOOK.md) | Prerender, sitemap, CloudFront router, indexing, audit and budgets |
| [JournalAWSSetup/README.md](../JournalAWSSetup/README.md) | Backend API, including the "Error contract" |

## Prerequisites

- [Bun](https://bun.sh) (CI uses 1.3.12) for installs and scripts; Node for the `node scripts/...` steps.
- Chromium for Playwright (`bunx playwright install chromium`): needed by `bun run build` (prerender, OG image) and `bun run test:e2e`.
- To deploy: AWS CLI with the `personal` profile (region `us-east-1`).

## Quick start (against the dev API)

1. `bun install`
2. Create `.env.development.local` from `.env.example` with the dev backend's values (next section). The file is git-ignored.
3. `bun run dev` and open http://localhost:8080. In this mode the app calls `/v1` on its own origin and Vite proxies it to the dev API (the dev API allows only its own CORS origins).
4. Sign in with a dev account, or sign up.

Checks before you hand work over: `bunx tsc -p tsconfig.app.json --noEmit`, `bun run lint`, `bun run test` (details in [ARCHITECTURE.md](docs/ARCHITECTURE.md), section 11).

## Environment variables

Vite reads `.env`, `.env.local`, `.env.<mode>` and `.env.<mode>.local`. `dev` and `build:dev` use mode `development`; `build` uses `production`. The build stops if a required variable is missing. Never commit values.

| Variable | Required | Where the value comes from |
|---|---|---|
| `VITE_API_URL` | yes | Backend stack output `ApiBaseUrl` (includes the `/v1` stage) |
| `VITE_COGNITO_USER_POOL_ID` | yes | Stack output `UserPoolId` |
| `VITE_COGNITO_CLIENT_ID` | yes | Stack output `UserPoolClientId` |
| `VITE_COGNITO_DOMAIN` | no | Stack output `CognitoDomain`; empty hides Google sign-in |
| `VITE_GA_MEASUREMENT_ID` | no | GA4 property; empty turns analytics off |
| `VITE_ADS_ENABLED` | no | `true` turns ads on (public content pages only) |
| `VITE_GSC_VERIFICATION`, `VITE_BING_VERIFICATION` | no | Search Console and Bing verification tags |
| `VITE_FEEDBACK_API` | no | `true` enables the in-app feedback request |

Read the stack outputs with: `aws cloudformation describe-stacks --stack-name tradequt-dev --query "Stacks[0].Outputs" --profile personal --region us-east-1`.

## Scripts

From `package.json`:

| Script | What it does |
|---|---|
| `bun run dev` | Vite dev server on port 8080, mode development, proxies `/v1` to the dev API |
| `bun run dev:local` | Dev server in mode `localdev`: reads `.env.localdev` (create it yourself) and proxies `/v1` to `127.0.0.1:3001` |
| `bun run build` | Production build: Vite, route manifest, prerender, OG image, sitemap and `llms.txt`, verify-dist |
| `bun run build:dev` | Same in development mode: every page is `noindex` |
| `bun run preview` | Serves `dist/` with `vite preview` |
| `bun run lint` | ESLint |
| `bun run test` | Vitest, one run |
| `bun run test:watch` | Vitest watch mode |
| `bun run test:coverage` | Vitest with v8 coverage |
| `bun run test:ui` | `vitest --ui`; needs `@vitest/ui`, which is not in `devDependencies` |
| `bun run test:e2e` | Playwright end-to-end tests (starts the dev server itself) |
| `bun run test:e2e:ui`, `bun run test:e2e:headed` | Playwright UI mode and headed mode |
| `bun run deploy:dev`, `deploy:prod`, `infra:setup` | Broken: they call `deploy-frontend-dev.ps1`, `deploy-frontend-prod.ps1` and `infra/setup-cloudfront.ps1`, which are not in the repo. Use the deploy steps below |

There is no typecheck script: use `bunx tsc -p tsconfig.app.json --noEmit`.

## Deploy

Order: backend, then frontend, then (only if it changed) the CloudFront router. Details, rollback and the router steps: [ARCHITECTURE.md](docs/ARCHITECTURE.md), section 12.

- **Dev**: `bun run build:dev`, then `bash C:/Users/narpra1/Work/Personal/TradeQut-Research/release/deploy-fe-dev.sh` (backs up the bucket, syncs to `tradequt.com-dev`, sets cache headers, invalidates CloudFront).
- **Prod**: `powershell C:/Users/narpra1/Work/Personal/TradeQut-Research/release/deploy-fe-prod.ps1 [-Ref <git ref>]`. It builds from a clean temporary worktree of the ref (default `origin/main`), backs up the bucket, syncs to `tradequt.com-prod` and invalidates CloudFront. Only committed code is deployed: pass `-Ref <branch or commit>` when the work is not on `origin/main`. Analytics and verification tags are off in this build (see `docs/ARCHITECTURE.md` section 12).
- **CloudFront router**: `node scripts/infra/cf-router.mjs --env dev|prod [--apply]` (prod also needs `--confirm-prod`).
- `.github/workflows` has `test.yml` (push and pull request to `main`/`develop`), `deploy.yml` (dev, after Tests pass on `main` or manual) and `deploy-prod.yml` (manual). Work is done on local branches and deploys are run locally.

## Making changes

Full ordered file lists are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), section 13.

| Change | Recipe |
|---|---|
| New app screen or tab | 13(a): view, `AppPage.tsx`, `navItems.ts`, palette keywords, prefetch, e2e route list |
| New public page or article | 13(b) and [ARTICLE-TEMPLATE](docs/growth/ARTICLE-TEMPLATE.md): page, `seo-pages.ts` + `routes.ts` (or `publicPages.ts` + `PublicRoutes.tsx` + `route-registry.ts`) |
| New backend endpoint | 13(c): types, RTK Query endpoint with tags, error handling |
| New trade field, setting, shortcut or stat card | 13(d), 13(f), 13(g), 13(h) |
| Prices or plan limits on the site | 13(e): edit `src/content/product-facts.ts` only |

After every change run:

1. `bunx tsc -p tsconfig.app.json --noEmit`
2. `bun run lint`
3. `bun run test`
4. For public pages or content: `bun run build`, which must end with `verify-dist OK`.
