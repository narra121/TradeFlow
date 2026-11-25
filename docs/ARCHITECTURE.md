# TradeFlow architecture

How the TradeQut frontend is built and where to change things. The code in the working tree is the source of truth; this document points to it and does not copy lists that live in code (routes, prices, tokens).

Related docs: [README](../README.md) (setup and commands), [UI-STYLING](UI-STYLING.md) (tokens, components, styling rules), [SEO runbook](growth/SEO-RUNBOOK.md) (indexing, CloudFront router, audit), [article template](growth/ARTICLE-TEMPLATE.md), backend: `JournalAWSSetup/README.md` ("Error contract") and `JournalAWSSetup/docs/ARCHITECTURE.md`.

## 1. Overview

TradeFlow is one Vite + React 18 + TypeScript project that ships two things from one build:

| Half | URLs | How it is delivered | Needs store and auth? |
|---|---|---|---|
| Public site (marketing, SEO, calculators, blog, legal) | `/`, `/pricing`, `/blog/*`, `/resources/*`, and every other route in `src/content/route-registry.ts` | Prerendered to `dist/<path>/index.html` at build time; React then renders over the saved HTML (`createRoot`, not hydration) | No |
| Signed-in app | `/app/*`, `/login`, `/signup`, `/auth/callback` | One SPA shell, `dist/_spa.html` for `/app/*` and `/auth/*`; login and signup are also prerendered | Yes |

Shared code: both halves use the same `src/components/ui`, `src/lib` helpers and Tailwind theme. The public half must not import the store, RTK Query or Amplify: that keeps the public bundle small (budgets in `scripts/perf/budgets.json`). Today nothing in `src/PublicApp.tsx`, `src/content`, `src/pages/{blog,glossary,resources,seo}`, `src/components/public` or `src/components/content` imports the store or auth code (checked with `rg`). Keep it that way.

How a request is served:

1. The browser asks CloudFront (dev: `dev.tradequt.com`, prod: `tradequt.com`). The origin is the S3 bucket `tradequt.com-dev` or `tradequt.com-prod` (bucket names are in `scripts/infra/cf-router-lib.mjs`, `ENVS`).
2. A CloudFront Function (the "router") rewrites the request. It is the same code on both distributions:
   - `/` serves `/index.html`; `/path` serves `/path/index.html`;
   - `/app/*` and `/auth/*` serve `/_spa.html` (status 200);
   - `www` redirects (301) to the apex; `/x/index.html` and trailing slashes redirect to the clean path;
   - on responses it adds security headers, and `x-robots-tag: noindex` on any host that is not `tradequt.com`.
3. Unknown paths: S3 answers 403/404 and CloudFront returns `/_spa.html` with status 404 (the React `NotFound` page). Origin 5xx returns `/error.html` (from `public/error.html`).
4. The API is a separate host (`api-dev.tradequt.com`, `api.tradequt.com`), called from the browser. See section 6.

Which router file is live:

| File | Role |
|---|---|
| `infra/cloudfront/router.js` | **The deployed function source.** Generated, committed, never edited by hand. |
| `scripts/seo/cf-router.ts` | **The generator** of `router.js` (reads `route-registry.ts` for hosts and SPA prefixes, and `index.html` for the inline-script hash used in the CSP). Run `bun scripts/seo/cf-router.ts --write`. The test `src/content/__tests__/cf-router.test.ts` fails when `router.js` is stale. |
| `scripts/infra/cf-router.mjs` + `scripts/infra/cf-router-lib.mjs` | **The deployer** of `router.js` to a distribution (preflight, backup, test, publish, associate, verify, auto-revert). See section 12. |

## 2. Boot sequence

`index.html` is the SPA shell and also the base of every prerendered page.

1. **Inline head script in `index.html`** runs before first paint. It reads the Amplify keys in `localStorage` (`CognitoIdentityServiceProvider.<clientId>.LastAuthUser` and its `accessToken`). If a session exists it adds class `tq-signed-in` to `<html>`; if the path is `/`, `/login` or `/signup` it also rewrites the URL to `/app/dashboard` and adds `tq-app-boot`, which hides `#root`. CSS in the same file shows `.signed-out-only` or `.signed-in-only` elements by that class. The key shape is duplicated in `src/lib/auth/storedSession.ts`: change both together. Editing this script changes the CSP hash, so regenerate the router (section 12).
2. **`src/main.tsx`**: `initErrorReporter()` (`src/lib/errorReporter.ts`), `retireLegacySession()` (removes tokens of the pre-Amplify login), drops the hidden prerendered markup when `tq-app-boot` is set, then `await preloadRoute(pathname)` so the chunk of the opened page is loaded before React renders (no spinner over the prerendered HTML). Then it picks an entry.
3. **`src/entry.ts` `entryFor(pathname, hasSession)`**: `'app'` when the path matches `/app|login|signup|auth` or a stored session exists; otherwise `'public'`.
4. **Public entry `src/PublicApp.tsx`** (signed-out visitor on a public page): `HelmetProvider`, `BrowserRouter`, `AnalyticsRoot`, `ChunkErrorBoundary`, `Suspense`, the routes from `src/PublicRoutes.tsx`. No store, no auth code, no tooltip or toast provider. `/login`, `/signup`, `/auth/*` and `/app/*` render `LeaveToApp`, which does a full navigation so the app entry loads.
5. **App entry `src/App.tsx`** (inside `react-redux` `Provider` with `src/store`): toasters, `TooltipProvider`, router, and `AppRoutes`:
   - `/` goes to `/app/dashboard` when authenticated, else the landing page; `/login` and `/signup` (lazy, from `src/content/publicPages.ts`); `/auth/callback` (`AuthCallbackPage`); `/app/*` wrapped in `RequireAuth` rendering `AppPage`; then `PublicRoutes`; then the `*` NotFound route (add new routes above it).
   - The `authReady` gate: a stored session with an expired ID token waits for `getIdToken()` before `/app` renders. A public page never waits.
   - Session end: a window event `unauthorized` (dispatched by `baseApi`) and Amplify's `onSessionEnded` both run one handler: `clearAuth()`, redirect to `/login` only when the user is on `/app`, then `discardSession()`.
6. **`src/pages/AppPage.tsx`** (the app frame, under `ChromeProvider`): sidebar, `TopBar`, `ScopeBar`, `NoticeSlot`, `PaneHost` (the trade side pane) and a nested `<Routes>` for the views. It also mounts the data hooks every screen relies on: `useTradesSync`, `useSyncServerPreferences`, `useGetSavedOptionsQuery`, `useGlobalShortcuts`, and hover/focus prefetch (`src/components/shell/prefetchPage.ts`).
7. **Shared boot helpers in `src/appRoot/shared.tsx`**: `ChunkErrorBoundary`, `ReloadGuardReset`, `PageLoadingFallback`.

Lazy loading and chunk errors:

- `lazyPage(load)` in `src/content/lazyPage.ts` wraps `React.lazy` and adds `.preload()`. After `preload()` resolves it renders without suspending, so a prerendered page is not replaced by a spinner. `lazyContent(key, loader)` (`src/content/lazyContent.ts`) caches one lazy component per article body.
- `preloadRoute(pathname)` (`src/content/preloadRoute.ts`) finds the loaders for a URL: `PAGE_AT` in `publicPages.ts` for static paths, plus the content chunk for `/blog/:slug` and `/case-studies/:slug`.
- Inside the app, `AppPage.tsx` keeps `VIEW_AT` (segment to lazy view). It preloads the opened view, then all others when the browser is idle, and again on pointer-over of any `/app/...` link.
- After a deploy an old tab may request a chunk that no longer exists. `ChunkErrorBoundary` detects a chunk-load error, reloads once with a `_cb` timestamp query (guard: `sessionStorage['chunk-reload']`), and shows a "new version" message with a Reload button if it fails again. `ReloadGuardReset` clears the guard once a route chunk has loaded.
- Inside `/app` a second boundary, `RouteErrorBoundary` in `AppPage.tsx`, shows a reference id and keeps the frame usable; it is reset on route change.
- `vite.config.ts` `manualChunks` splits `react-vendor`, `redux-vendor`, `date-vendor`, `ui-vendor` (recharts) and `cn-vendor`. Public pages must not pull recharts.

## 3. Folder map of `src/`

| Folder / file | What lives there | Put new code here when |
|---|---|---|
| `main.tsx`, `entry.ts`, `App.tsx`, `PublicApp.tsx`, `PublicRoutes.tsx`, `appRoot/` | Boot, entry choice, root routers, shared boundaries | You change what loads first or add a root-level route |
| `pages/` | One component per URL. `AppPage.tsx` is the app frame; auth pages (`LoginPage`, `SignupPage`, `AuthCallbackPage`); public pages; subfolders `blog/`, `glossary/`, `resources/`, `case-studies/`, `changelog/`, `seo/` | A new public URL |
| `components/views/` | The app screens: `DashboardView`, `TradeLogView`, `CalendarView`, `AnalyticsView`, `GoalsView`, `SettingsView`, `AccountsView`, `ImportView` (Insights and Chat views live in `components/insights` and `components/chat`) | A new app screen |
| `components/shell/` | App chrome: top bar, `ScopeBar`, account switcher, command palette, shortcuts dialog, mobile tab bar, `navItems.ts`, notices, `prefetchPage.ts` | You change navigation or global controls |
| `components/layout/` | `Sidebar.tsx` | The desktop sidebar |
| `components/trade/`, `components/tradelog/` | Trade form and pane (`TradeForm`, `TradePane`, `PaneHost`, `tradeFormState.ts`), trade table, bulk bar, filters | Anything on a single trade or the trade list |
| `components/dashboard/`, `calendar/`, `analysis/`, `goals/`, `insights/`, `chat/`, `import/`, `account/`, `settings/`, `profile/`, `onboarding/`, `help/` | Pieces of one screen or feature, named after it | The piece belongs to that feature only |
| `components/stats/` | Shared statistic parts: `StatStrip`/`StatCell`, `MetricInfo`, `metricDefs.ts` (label, definition, formula per metric), period/compare/currency hooks | A figure shown on more than one screen |
| `components/billing/` | Plan UI: `PlanCard`, `PlansTable`, `UpgradeDialog`, `ProGate` (locked previews), `BillingView`, `useUpgrade` (the billing interval every upgrade entry opens with: monthly, or yearly once the user picked it on Plan & billing; kept in `localStorage` `tq.billing.interval`) | Plan, quota or upgrade UI |
| `components/auth/` | Auth screens and helpers: `AuthPage`, `RequireAuth`, `useLogout`, Google button, `loggingOut.ts` | Login, signup, reset flows |
| `components/public/` | Public frame: `PublicLayout`, header, footer, `nav.ts` (link lists), `PricingTable` | Public header or footer |
| `components/content/` | Building blocks of public content pages: `ContentPageShell`, article card/TOC/share, calculator frame | Shared by several public pages |
| `components/landing/`, `components/showcase/` | Landing page sections, and product mock-ups with sample data (`sampleJournal.ts`) | Landing page visuals |
| `components/analytics/` | `AnalyticsRoot` (GA4, consent banner, page views, ads loader) | Tracking setup |
| `components/ui/` | shadcn/Radix primitives plus project primitives (`panel`, `money`, `picker`, `error-state`, `empty-state`, `field`) | A reusable control with no feature logic. Styling rules: [UI-STYLING](UI-STYLING.md) |
| `components/SEO.tsx` | `<SEO>`: title, description, canonical, robots, Open Graph, JSON-LD through Helmet | Every public page uses it |
| `store/` | Redux store, RTK Query APIs (`api/`), slices, middleware, typed hooks | Server data or app-wide state |
| `hooks/` | App hooks: `useEntitlements`, `useScopeTrades`, `useUiState`, `useSavedOptions`, `useTradeParam`, `useTradesSync`, `useGlobalShortcuts`, `useAccounts`, `useProfile`, `useFormDraft`, `useUndoableDelete` | A hook used by several components |
| `lib/` | Pure logic and helpers, see below | Calculations, formatting, parsing: no React state |
| `types/` | Shared types: `trade.ts`, `stats.ts`, `analysis.ts`, `entitlements.ts`, `import.ts`, `insights.ts`, `chat.ts` | A type shared by store, lib and components |
| `content/` | Public-site data and registries (section 9) | Public copy, facts, articles, SEO metadata |
| `copy/` | `copy` object: UI sentences of the app frame and the Trades screen | Wording of app UI text |
| `config/seo.ts` | JSON-LD builders and `pageTitle()` | Structured data |
| `test/` | `setup.ts` (vitest setup), `test-utils.tsx` (`renderWithProviders`) | Test helpers |
| `__tests__/` (also in most folders) | Unit and component tests next to the code they cover | Always add tests here |

Important parts of `lib/`:

| Path | Owns |
|---|---|
| `lib/api.ts`, `lib/api/*` | Request payload types (`CreateTradePayload`, account, goals, user, stripe types) and `config.ts` (`API_BASE_URL` from `VITE_API_URL`). Not an HTTP client: requests go through `store/api` |
| `lib/apiError.ts`, `lib/planErrors.ts` | Reading API errors; 402 plan signals (section 6) |
| `lib/auth/*` | Amplify configuration and every Cognito call (section 7) |
| `lib/scope.ts` | Date presets, `resolveRange`, scope persistence |
| `lib/appTimeZone.ts`, `lib/dateUtils.ts`, `lib/dateTimeField.ts` | Time zone and date handling (day keys, wall-clock conversion) |
| `lib/format.ts` | Money, price, date formatting; account currency fallback |
| `lib/pnl/*` | P&L, R-multiple, pip size (`computePnl`, `rMultiple`, `pipSize`) and mark-to-market (`mtm.ts`) |
| `lib/charges/*`, `lib/tax/*` | Indian statutory charge rate history (`foRateHistory.ts`), F&O turnover for tax audit (`foTurnover.ts`) |
| `lib/forex/*` | Calculators for public pages: margin, compounding, prop drawdown, risk of ruin, sessions engine |
| `lib/positionSize.ts`, `riskReward.ts`, `expectancy.ts`, `equityCurve.ts`, `glossaryCalc.ts` | Public calculator maths |
| `lib/import/*` | Import flow helpers: mapping memory, row editing, screenshot limits, skipped-line recovery, conversion to create payloads (`toCreateItems`) |
| `lib/importFlowStore.ts` | Small module store for the import-in-progress state; `importFlow.queue(files)` hands files to the import page (section 5) |
| `lib/tradeColumns.ts`, `tradeFilters.ts`, `tradeGroups.ts`, `savedViews.ts`, `stickyRows.ts` | Trade list: columns, filters and sort, grouping, saved views |
| `lib/tradePreview.ts` | Asset-class inference, lot sizes, quantity labels for the form |
| `lib/patchTrade.ts`, `bulkPatch.ts` | Partial trade updates and bulk edit operations |
| `lib/exportCsv.ts` | CSV export (fixed 32-column schema) |
| `lib/calendar.ts`, `dashboard.ts`, `analyticsRows.ts`, `drillDown.ts`, `evidence.ts` | Calendar month model, dashboard tallies and equity series, analytics breakdown rows, drill-down links, evidence thresholds (mirrors the backend) |
| `lib/ai/*` | Chat streaming (`chatStream.ts`, `sse.ts`), safe markdown (`markdown.tsx`), chat/insight/review text formatting |
| `lib/analytics/*` | GA4 loader, consent, web vitals. `initAnalytics()` turns the tag's own page view off and gives it a sanitized `page_location` through a global `gtag('set', ...)` made before the tag loads, because the Google tag ignores both as on-page `config` parameters. `trackPageView()` sends the one page view per route and sets the location again. `sanitizeLocation()` keeps only campaign parameters (`utm_*`, `gclid`, `gbraid`, `wbraid`, `msclkid`), so an OAuth `code` or a Stripe `session_id` never reaches GA |
| `lib/keymap.ts`, `regions.ts`, `paletteRecent.ts` | Keyboard map, F6 landmarks, recent palette items |
| `lib/errorReporter.ts`, `incident.ts` | Browser error reports to the API; status banner parsing |
| `lib/cache/trade-cache.ts` | Only `clearDatabase()`: removes the retired IndexedDB trade cache on logout |

## 4. Routing

| What | Where it is declared |
|---|---|
| App routes (inside `/app`) | `Routes` in `src/pages/AppPage.tsx` and the lazy view map `VIEW_AT` above it. Sidebar and titles: `src/components/shell/navItems.ts` (`NAV_GROUPS`, `titleForPath`, `isScopedPath`, `TAB_ITEMS`). Settings sections: `SECTIONS` in `components/views/SettingsView.tsx` |
| Root routes (login, signup, callback, `/app/*`) | `src/App.tsx` (full entry) and `src/PublicApp.tsx` (leaves to the app) |
| Public routes (rendering) | `src/PublicRoutes.tsx`: explicit `<Route>` per static page, plus `CONTENT_ROUTES` for SEO and utility pages |
| Lazy page components | `src/content/publicPages.ts` (`lazyPage(...)` per page and the `PAGE_AT` path map used for first-paint preload) |
| SEO and utility page loaders | `src/content/routes.ts` (`SEO_PAGE_LOADERS`, `UTILITY_PAGE_LOADERS`, `CONTENT_ROUTES`) |
| Public route registry (prerender, sitemap, router, llms.txt, verify) | `src/content/route-registry.ts`: `STATIC_ROUTES` plus entries derived from `BLOG_ARTICLES`, `CASE_STUDIES`, `SEO_PAGES` in `getPublicRoutes()`. Also `SPA_PREFIXES`, `CANONICAL_HOST` |
| SEO page metadata | `src/content/seo-pages.ts` (`SEO_PAGES`) |

How a public route becomes prerendered and enters the sitemap: it is returned by `getPublicRoutes()`. `scripts/seo/manifest.ts` writes the list to `dist/_seo/routes.json`; `scripts/prerender-routes.js` renders each one; `scripts/seo/postbuild.ts` builds `sitemap.xml` from the routes with `inSitemap: true` (`scripts/seo/generators.ts`) and verifies every page. A route not in the registry is never prerendered or listed, even if it has a `<Route>`.

Guard tests that tie these lists together: `src/content/__tests__/route-registry.test.ts` (unique canonical paths, every article and SEO page registered, SEO loaders equal `SEO_PAGES`) and `src/content/__tests__/preloadRoute.test.ts` (every prerendered route has a preload loader).

## 5. State and data

**Store** (`src/store/index.ts`): reducers `api` (RTK Query), `auth`, `accounts`, `trades`; middleware `api.middleware`, `toastMiddleware`, `sessionResetMiddleware`. A `store.subscribe` in the same file saves the scope to `localStorage` (`tq.scope`). Use `useAppDispatch` / `useAppSelector` from `src/store/hooks.ts`.

**Slices** (`src/store/slices/`):

| Slice | Holds |
|---|---|
| `authSlice` | `isAuthenticated` (starts from `hasStoredSession()`), `user`, `signupSuccess`. Updated by `setUser`, `clearAuth` and the auth mutations |
| `accountsSlice` | `selectedAccountId` (null means all accounts; `useTradesSync` turns it into `filters.accountId` `'ALL'`) |
| `tradesSlice` | `filters`: `accountId`, `startDate`, `endDate`, `datePreset`, custom range. Not trades themselves |

**RTK Query** (`src/store/api/`). `baseApi.ts` creates the one `api` with `reducerPath: 'api'`. Each file adds endpoints with `api.injectEndpoints({ overrideExisting: 'throw', ... })`:

| File | Endpoints about |
|---|---|
| `tradesApi.ts` | Trades: `getScopeTrades` (pages `/trades` until the scope is complete, ceiling `SCOPE_TRADE_CEILING`), `getNewestTrade`, `getTrade`, create, update, delete, restore, bulk update/delete, `getTradeDebrief`; the backend-to-`Trade` mapper `mapBackendTradeToTrade` |
| `accountsApi.ts`, `goalsRulesApi.ts`, `journalApi.ts` (day notes), `savedOptionsApi.ts` | Accounts, goals and rules, day notes, saved dropdown lists |
| `statsApi.ts`, `analysisApi.ts` | Aggregated stats and tax report; analysis, what-if, focus rule |
| `importApi.ts`, `insightsApi.ts`, `chatApi.ts` | Import parse/save/batches, AI reports, AI chat sessions |
| `billingApi.ts`, `userApi.ts`, `profileApi.ts` | Entitlements and checkout; profile and preferences; data export and account delete |
| `authApi.ts` | Auth mutations that call Amplify through `lib/auth/authService.ts` using `queryFn`, not HTTP |
| `textApi.ts`, `imageCache.ts` | Text enhancer; trade screenshots (`getImage`, blob URLs, cached) |

Rules the code follows:

- **Base query** (`baseApi.ts`): `fetchBaseQuery` with `baseUrl = API_BASE_URL`, 30 s timeout, header `Authorization: Bearer <ID token>` from `getIdToken()`. It unwraps the backend envelope (`{ success, data }`, or the older `{ data, error }`) and turns a `success: false` body into an error. Network and timeout errors get the text from `connectionMessage()` (`lib/apiError.ts`).
- **401**: the token is renewed once (`getIdToken({ forceRefresh: true })`) and the request retried. If still 401, or no session is left, the window event `unauthorized` is dispatched (handled in `App.tsx`).
- **402**: converted to a plan signal (section 6).
- **Cache defaults**: `refetchOnFocus`, `refetchOnReconnect`, `refetchOnMountOrArgChange` are all off. Endpoints that need freshness invalidate tags or patch the cache.
- **Tags**: base list in `baseApi.ts` `tagTypes` (`Auth`, `Accounts`, `Trades`, `Stats`, `Goals`, `Rules`, `User`, `Subscription`, `SavedOptions`). A file that needs more calls `api.enhanceEndpoints({ addTagTypes: [...] })` (`Entitlements`, `ChatSessions`, `ChatMessages`, `ImportSources`, `ImportBatches`, `Insights`, `InsightSettings`).
- **Cache patching**: trade mutations do not refetch the lists. `onQueryStarted` in `tradesApi.ts` patches every cached `getScopeTrades` entry with `updateQueryData` (an inserted trade is added only to scopes it falls in), and `debouncedInvalidateStreamDeps` invalidates `Accounts`, `Goals`, `Rules`, `SavedOptions`, `Stats` after 4 s because the backend recomputes balances and daily stats asynchronously. Accounts, rules, goals and insights patch their own queries the same way.
- **Index of hooks**: `store/api/index.ts` re-exports only some files. `analysisApi`, `billingApi`, `chatApi`, `importApi`, `insightsApi`, `journalApi`, `profileApi` are imported by file path (for example `@/store/api/billingApi`).

**Middleware** (`src/store/middleware/`):

- `toastMiddleware.ts`: toasts are opt-in per endpoint name in two maps, `SUCCESS_TOASTS` and `ERROR_TOASTS`. Everything else shows its error where the user acted. A 402 never toasts (it opens the upgrade dialog).
- `sessionResetMiddleware.ts`: on `clearAuth` or a fulfilled logout it clears persisted view state, resets the RTK Query cache, the selected account and the filters.

**Local UI state** (not in Redux):

| Hook / module | Storage | Holds |
|---|---|---|
| `hooks/useUiState.ts` | `localStorage` `tq.ui` | Device preferences: sidebar, pane width, single-key shortcuts, P&L palette, density, time zone, default period. Readable without React via `readUiState()` |
| `hooks/useSavedOptions.ts` | server (`savedOptionsApi`) | Dropdown lists for the trade form (symbols, strategies, mistakes ...) |
| `hooks/useFormDraft.ts` | `sessionStorage`, key set by the caller | Unsaved trade form (keys starting `tq.draft.` are what `lib/scope.ts` `hasTradeDrafts()` counts) |
| `hooks/useTradeParam.ts` | URL query | Trade pane state: `?trade=<id or new>&edit=1&pane=full` |
| `lib/savedViews.ts`, `lib/tradeColumns.ts` | `localStorage` | Saved trade list views, column choice |
| `lib/importFlowStore.ts` | memory | Import in progress, and files another screen hands to the import page. The first-run page (`components/onboarding/FirstRunPage.tsx`) keeps a dropped or chosen file, fills in the account form (name `My trading account`, balance 0, only where nothing was typed) and labels its button "Create account and import"; once the account exists it queues the file and opens `/app/import`, where `ImportCenter` reads `queued` |

**Scope (account + period).** The scope decides which trades every scoped screen shows.

1. State: account in `accounts.selectedAccountId`; period in `trades.filters` (`datePreset`, `startDate`, `endDate`). `lib/scope.ts` defines presets, `resolveRange()` and `loadScope()`/`saveScope()`. Initial values come from `tq.scope`, else the default period from `useUiState`.
2. `ScopeBar` (`components/shell/ScopeBar.tsx`, with `AccountSwitcher` and `ScopePeriod`) edits it. `isScopedPath()` in `navItems.ts` lists which routes show it.
3. `hooks/useTradesSync.ts` mirrors the selected account into the filters and rolls relative presets at midnight.
4. `hooks/useScopeTrades.ts` reads the filters and calls `useGetScopeTradesQuery`. It uses `currentData` so a new scope never shows the previous scope's trades, and sorts newest first. Pass an override to ignore the global scope (Calendar, import batches).
5. Server statistics use the same scope arguments (see `components/stats/usePeriodStats.ts` `periodStatsArgs`).

## 6. API client and errors

- There is no separate HTTP client. All requests go through RTK Query `baseApi.ts`. Code that calls `fetch` directly: the AI chat stream (`lib/ai/chatStream.ts`, because RTK Query cannot read SSE; started from `chatApi.sendChatMessage`), screenshot upload (`components/trade/imageUpload.ts`) and the error reporter (`lib/errorReporter.ts`, `POST /errors/report`).
- `API_BASE_URL` is `VITE_API_URL`, including the `/v1` stage (`lib/api/config.ts`). The build refuses to start without it (`vite.config.ts`).
- **Reading errors**: always use `readApiError(err, fallback)` from `src/lib/apiError.ts`. It accepts RTK Query errors, fetch errors or thrown `Error`s and returns `{ message, code, status, kind, retryAfter }`. Use `readResponseError(res)` for a raw `fetch` response. Do not read `err.data.message` by hand.
- **Error shape**: the backend's envelope is described in `JournalAWSSetup/README.md` under "Error contract"; this repo does not copy it. `readApiError` is the single place that maps it.
- **Showing errors**: a failed read renders `ErrorState` (`components/ui/error-state.tsx`) with `error` and `onRetry`. A failed write shows an inline message at the control; field errors in the trade form go through `serverFieldErrors` in `components/trade/tradeFormState.ts`. A global toast needs an entry in `toastMiddleware.ts`.
- **Plan and quota errors (HTTP 402)**: `classifyPlanError()` in `lib/planErrors.ts` turns a 402 body into a `PlanSignal` with code `QUOTA_EXCEEDED`, `PLAN_REQUIRED` or `TRIAL_EXPIRED`. `baseApi.ts` calls it for every 402 and `emitPlanSignal()` fires window event `tq:plan-signal`; `components/billing/UpgradeDialog.tsx` listens and opens. `isPlanRefusal(err)` lets a caller skip its own message for a 402. Code outside RTK Query emits the signal itself: `lib/ai/chatStream.ts`, `components/chat/ChatView.tsx`, `components/insights/InsightsView.tsx`, `components/import/useImportActions.ts` and `components/billing/readOnly.ts`.
- **Entitlements**: `hooks/useEntitlements.ts` reads `GET /me/entitlements` through `billingApi.getEntitlements` and exposes `plan`, `isPro`, `isTrial`, `readOnly` (trial over: reads work, writes answer 402), `can(feature)`, quota `usage`, billing facts and `writableAccountIds`. Gate a feature with `can()` or the `ProGate`/`LockedPreview` components (`components/billing/ProGate.tsx`). Types are in `types/entitlements.ts`, a hand copy of `QuotaFeature` / `GatedFeature` in `JournalAWSSetup/src/app/types.ts`: add new keys on both sides (today the frontend `QuotaFeature` lacks the backend's `ai_enhance`).

## 7. Auth

- **Library**: AWS Amplify v6 Auth against a Cognito user pool. Values come from `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, optional `VITE_COGNITO_DOMAIN` (empty hides Google sign-in); read in `lib/auth/authEnv.ts`.
- **Configuration**: `lib/auth/amplifyConfig.ts` (`configureAuth`, `buildAuthConfig`; OAuth callback path `/auth/callback`, sign-out redirects). `lib/auth/authService.ts` calls `configureAuth()` when imported.
- **All Cognito calls** go through `lib/auth/authService.ts`: `login` (SRP, email and password), `signup`, `confirmSignup`, `resendCode`, `forgotPassword`, `confirmPasswordReset`, `getIdToken`, `logout`, `logoutEverywhere`, `startGoogleSignIn`, `finishGoogleSignIn`, `discardSession`, `onSessionEnded`. Failures leave as `AuthServiceError` shaped like API errors, so `readApiError` reads them. `store/api/authApi.ts` wraps them as RTK mutations.
- **Token handling**: Amplify stores tokens in `localStorage` under `CognitoIdentityServiceProvider.<clientId>.*`. The API gets the **ID token** (it carries email and name). `getIdToken()` renews it when expired. `lib/auth/storedSession.ts` reads the same keys synchronously with no library (`hasStoredSession`, `readStoredIdToken`, `readStoredClaims`, `clearStoredSession`). `lib/auth/legacySession.ts` removes tokens of the old login.
- **Signed-in detection on public pages**: `entryFor()` and the `index.html` script use `hasStoredSession()` (section 2). Public pages show or hide parts with `.signed-in-only`/`.signed-out-only` classes; `PublicHeader` uses this.
- **Pages**: `pages/LoginPage.tsx` and `SignupPage.tsx` render `components/auth/AuthPage.tsx` (multi-step: login, signup, confirm, reset). `pages/AuthCallbackPage.tsx` finishes the Google redirect and goes to the remembered `/app/...` destination (`lib/auth/destination.ts` only accepts `/app` paths). `components/auth/RequireAuth.tsx` guards `/app/*`.
- **Logout**: `components/auth/useLogout.tsx` asks first when an unsaved trade draft exists, runs the `logout` mutation (clears caches, Amplify `signOut`), then navigates to `/login?view=logged-out` (`components/auth/loggingOut.ts`). `sessionResetMiddleware` clears Redux and view state. "Log out everywhere" is `logoutEverywhere` (global sign-out).
- **Session ended by itself** (another tab, refused refresh, a 401 after renewal): see the handler in `App.tsx` (section 2).

## 8. Domain logic: which module owns what

Put a change where the calculation lives; screens only call these.

| Calculation | Owner |
|---|---|
| Trade P&L, R-multiple, pip size | `lib/pnl/index.ts` |
| Mark-to-market settlement P&L | `lib/pnl/mtm.ts` (used by `content/components/MtmCalculator.tsx`) |
| Net P&L, fees, gross P&L shown in lists | Server values on the `Trade` (`fees`, `grossPnl`, `pnl`); display via `lib/format.ts` and `lib/tradeColumns.ts` |
| Charges and STT rates by date, tax turnover | `lib/charges/foRateHistory.ts`, `lib/tax/foTurnover.ts`; the tax report screen is `components/analysis/TaxReport.tsx` with data from `statsApi.getTaxReport` |
| Forex lot size, asset class inference, quantity labels | `lib/tradePreview.ts` |
| Position size, risk-reward, expectancy, margin, compounding, drawdown, risk of ruin | `lib/positionSize.ts`, `riskReward.ts`, `expectancy.ts`, `lib/forex/*` (public calculators) |
| Aggregated statistics and analysis (win rate, profit factor, drawdown, breakdowns) | Computed by the **server** (`statsApi`, `analysisApi`); the frontend formats them. Metric labels and formulas: `components/stats/metricDefs.ts` |
| Evidence thresholds for verdicts | `lib/evidence.ts` (mirrors the backend file named in its header comment) |
| Time zone and day buckets | `lib/appTimeZone.ts` (the one zone for every bucket and label) |
| Money and number formatting, currency fallback | `lib/format.ts` (never sum across currencies: group with `accountCurrency`) |
| Calendar month model | `lib/calendar.ts` |
| Dashboard tallies, equity series | `lib/dashboard.ts` |
| Import parsing | Server (`importApi.parseImport`); client side only mapping memory, row editing and payload building in `lib/import/*` |
| CSV export | `lib/exportCsv.ts` |
| Goals and rules progress | `components/goals/goalMath.ts`, `ruleMath.ts` plus server progress (`goalsRulesApi`) |
| AI text rendering | `lib/ai/*` (rendering only; the model runs on the server) |

## 9. Content for the public site

| Path | What it holds | Rule |
|---|---|---|
| `src/content/product-facts.ts` | Single source for product facts: definition, trial length, prices (`PRO_PRICES`, `proPrice()`), plan table (`PLAN_LIMITS`), import sources, FAQ, company facts, `SITE_URL` | Prices and limits are used by the pricing page, `PricingTable`, billing UI (`components/billing/freeLimits.ts`), JSON-LD (`config/seo.ts`), `llms.txt` and `seo-pages.ts`. Change them here only. A comment in the file says they must match the Stripe prices and the backend plan config |
| `src/content/seo-pages.ts` | Metadata of stand-alone SEO pages (`SEO_PAGES`) | Titles at most 60 characters (test) |
| `src/pages/seo/*` | The SEO page components; shared templates `BrokerJournalPage`, `MetaTraderJournalPage`, `AlternativePage` | Facts come from `content/brokers.ts`, `forex-platforms.ts`, `alternatives.ts`, `journal-pricing.ts` |
| `src/content/blog/` | `articles.ts` (registry `BLOG_ARTICLES`, type `BlogArticle`), one `<slug>.tsx` body per article, `see-also.ts` (related links per slug) | See [ARTICLE-TEMPLATE](growth/ARTICLE-TEMPLATE.md) |
| `src/content/case-studies/` | `studies.ts` registry plus one body per scenario. Scenarios are illustrative, never real customers | |
| `src/content/glossary/` | `terms.ts` (glossary index) and `metrics/` (long term pages) | |
| `src/content/changelog/entries.ts` | Changelog; also drives the in-app "What's new" dot | |
| `src/content/*.ts` (reference data) | `forexPairs`, `forex-sessions`, `gtt-charges`, `nse-lot-circulars`, `sebi-fo-study`, `guideAnchors` | Facts carry a "checked" date and source; tests (`checked-dates.test.tsx`) read them |
| `src/content/components/ArticleParts.tsx` | Article building blocks (`H2`, `P`, `Table`, `Callout`, `Sources`, `Disclaimer` ...) | |
| `src/copy/index.ts` | UI sentences for the app frame and Trades | Wording only |
| `src/config/seo.ts` | JSON-LD (`WEBSITE_SCHEMA`, `ORGANIZATION_SCHEMA`, `SOFTWARE_APP_SCHEMA`, FAQ, article schema) and `pageTitle()` | Built from product-facts |
| `public/` | Static files copied to `dist/`: `robots.txt`, `ads.txt`, `status.json` (read by `/status`), `error.html`, `maintenance.html`, fonts, `import-template.csv`, guide screenshots, the IndexNow key file | |

## 10. Build pipeline

`bun run build` runs, in order (see `package.json` `scripts.build`):

1. `vite build`: bundle into `dist/` (production mode; reads `.env.production*`).
2. `bun scripts/seo/manifest.ts`: writes `dist/_seo/routes.json` from `getPublicRoutes()`.
3. `node scripts/prerender-routes.js`: copies `dist/index.html` to `dist/_spa.html`, starts `vite preview` and headless Chromium (Playwright), loads each route (4 at a time) with `window.__PRERENDER__ = true`, waits until the page's own canonical link is set, then writes `dist/<path>/index.html` (`/` overwrites `dist/index.html`). It inlines CSS and the blocking text font and moves scripts to the end of `<body>`. All routes are written only after every route rendered.
4. `node scripts/generate-og-image.js`: renders `scripts/og-template.html` to `dist/og-image.png` (1200x630).
5. `bun scripts/seo/postbuild.ts`: writes `sitemap.xml`, `llms.txt`, `llms-full.txt`; verifies every registered route (**verify-dist**): one unique `<title>`, self-canonical, meta description of 20+ characters, parseable JSON-LD, correct robots value; also checks `_spa.html` and `robots.txt`; deletes `dist/_seo`. It exits non-zero on any error, which fails the build.

`bun run build:dev` is the same with `vite build --mode development` and `postbuild.ts --mode development`: every page must be `noindex` (`SEO.tsx` sets robots from `import.meta.env.MODE`).

Prerender needs Chromium installed for Playwright (`bunx playwright install chromium`).

## 11. Tests and quality gates

| Gate | Command | Notes |
|---|---|---|
| Unit and component tests | `bun run test` (`vitest run`) | Config `vitest.config.ts`: jsdom, globals, `src/**/*.{test,spec}.{ts,tsx}`, setup `src/test/setup.ts`. Run from a path spelled `C:/Users/...` (upper-case `C`) on Windows. One file: `bunx vitest run src/lib/__tests__/scope.test.ts` |
| Coverage | `bun run test:coverage` | v8 provider; `src/components/ui/**` excluded |
| Typecheck | `bunx tsc -p tsconfig.app.json --noEmit` | No package script. Passes on the current tree |
| Lint | `bun run lint` (`eslint .`) | `eslint.config.js`: typescript-eslint, react-hooks rules, react-refresh |
| E2E | `bun run test:e2e` (Playwright) | `playwright.config.ts`: `testDir e2e`, Chromium, starts `bun run dev --port 8080` (override with `E2E_PORT`). Fake Cognito ids; `e2e/fixtures/auth.ts` seeds a signed-in session and mocks the API; `e2e/fixtures/routes.ts` lists app routes |
| Public build gate | `bun run build` | Ends with `verify-dist OK` |
| Public audit | `bun run build && node scripts/seo/audit-public.mjs --out <dir>` | Console errors, overflow, headings, names, text and target sizes, style rules, focus, forced colours |
| Performance budgets | `bun run build && node scripts/perf/budget.mjs --out <dir>` | Targets and baseline in `scripts/perf/budgets.json`; `--record-baseline` lowers the baseline after an improvement |

Where tests live: next to the code in `__tests__/` folders (`src/lib/__tests__`, `src/store/api/__tests__`, `src/pages/__tests__`, ...). Render components with `renderWithProviders` from `src/test/test-utils.tsx` (real reducers, router, Helmet, tooltip provider). Guard tests worth knowing: `src/content/__tests__/route-registry.test.ts`, `cf-router.test.ts`, `cf-router-apply.test.ts`, `content-quality.test.tsx` (articles need summary, FAQ and no advice wording), `public-assets.test.ts`, `seo-build.test.ts`. E2E specs in `e2e/`: `smoke`, `auth`, `app-routes`, `trades`, `cache-sync`, `crawler`, `a11y`.

CI (`.github/workflows/test.yml`) runs unit tests, coverage, e2e, and the public-site job (build, audit, budgets). It does not run lint or the typecheck, so run them yourself.

## 12. Environments and deploy

**Env files.** Names only; values come from the backend stack outputs (`aws cloudformation describe-stacks --stack-name tradequt-dev` `Outputs`) and never go in git (the `.gitignore` ignores `.env*` and `*.local`). `.env.example` lists the four variables (`VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`). Its `VITE_API_URL` sample is an old execute-api URL: use `https://api-dev.tradequt.com/v1` for dev. Optional: `VITE_GA_MEASUREMENT_ID`, `VITE_GSC_VERIFICATION`, `VITE_BING_VERIFICATION`, `VITE_ADS_ENABLED`, `VITE_FEEDBACK_API` (empty = off).

| Variable | Used by |
|---|---|
| `VITE_API_URL` (required, ends with `/v1`) | `lib/api/config.ts` |
| `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID` (required) | `lib/auth/authEnv.ts` |
| `VITE_COGNITO_DOMAIN` (optional) | Google sign-in |
| `VITE_GA_MEASUREMENT_ID` (optional) | `lib/analytics` |
| `VITE_ADS_ENABLED` (`true` turns ads on) | `content/adsLoader.ts` |
| `VITE_GSC_VERIFICATION`, `VITE_BING_VERIFICATION` | `components/SEO.tsx` (home page only) |
| `VITE_FEEDBACK_API` (`true`) | `components/help/sendFeedback.ts` |

Which file each command reads (Vite loads `.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local`):

| Command | Mode | Env file |
|---|---|---|
| `bun run dev`, `bun run build:dev` | development | `.env.development.local` (local) or `.env.development` (CI) |
| `bun run build` | production | `.env.production.local` (local) or `.env.production` (CI and the prod script) |
| `bun run dev:local` | localdev | `.env.localdev` (not in the repo; create it with the four variables, `VITE_API_URL=/v1`). Proxies `/v1` to `127.0.0.1:3001` |

In `bun run dev` (development, serve) the app calls `/v1` on its own origin and Vite proxies it to the dev API origin, because the dev API allows only its own CORS origins (`vite.config.ts`). `vite.config.ts` throws if a required variable is missing, except for `vite preview` (used by prerender).

**Deploy order**: backend, then frontend, then the CloudFront router. Run from this repo unless noted. AWS profile `personal`, region `us-east-1`.

**Dev frontend**

1. `bun run build:dev` (must end with `verify-dist OK`).
2. `bash C:/Users/narpra1/Work/Personal/TradeQut-Research/release/deploy-fe-dev.sh`. It checks `dist/index.html` and `_spa.html`, backs up the bucket `tradequt.com-dev` to `TradeQut-Research/build/backups/nodecision-20261113/s3_tradequt.com-dev_<timestamp>/` (and writes a `.REVERT.txt` with the exact revert command), syncs `dist/` with `--delete`, sets cache headers (HTML no-cache, `assets/*.js|css` immutable, txt/xml 1 h), and invalidates distribution `E2YV3RSX90ESV4`.

**Prod frontend**: `pwsh -NoProfile -File TradeQut-Research/release/deploy-fe-prod.ps1 [-Ref <git ref>]` (default `origin/main`; PowerShell 7, because under Windows PowerShell 5.1 the run stops when bun writes to stderr). It fetches, creates a clean temporary git worktree at the ref, writes `.env.production` there (public values, API `https://api.tradequt.com/v1`), `bun install`, `bun run build`, refuses a dist that references `lambda-url`, `api-dev.tradequt` or `execute-api`, or lacks `_spa.html`/`error.html`, backs up the bucket to disk and to the artifacts bucket, syncs to `tradequt.com-prod` with the same cache headers, invalidates `E1HW3I3EQVZLRD`, prints a `REVERT:` line, and removes the worktree. It deploys only what is committed at the ref: commit first, and pass `-Ref <branch or commit>` while the work is not on `origin/main` (for example `-Ref feat/ux-redesign`). The script does not compare the ref with what is live: a ref that is already live is built and uploaded again as a new deploy. Before a deploy, compare `git rev-parse --short <ref>` with the `DEPLOYED` line of the newest `TradeQut-Research/release/fe-deploy-N.log` and read `git show --name-status <ref>`, and run the public-site audit and the budgets of section 11 on a fresh install (CI runs them on `origin/main`). It does not keep the PC awake either: if Windows sleeps during a run, the script pauses and goes on after the wake. Besides the API and Cognito values the script copies the public page values from `fe-prod-public.env` beside it (`VITE_GA_MEASUREMENT_ID`, `VITE_GSC_VERIFICATION`, `VITE_BING_VERIFICATION`; `.github/workflows/deploy-prod.yml` fills the same names from GitHub secrets). A line with an empty value is skipped, which leaves that feature off; today only the GA4 measurement ID is set. It does not run IndexNow: after a prod deploy run `node scripts/seo/indexnow.mjs --since-days 14` in a checkout that has `dist/sitemap.xml`. Run `TradeQut-Research/release/preflight.ps1` (read-only AWS checks) before a first cut-over and `browser-smoke.mjs` (loads prod pages, reports console errors) after.

**CloudFront router** (only when `route-registry.ts` hosts or SPA prefixes, or the `index.html` inline script, changed, or on a new environment):

1. `bun scripts/seo/cf-router.ts --write` to regenerate `infra/cloudfront/router.js`.
2. `node scripts/infra/cf-router.mjs --env dev` (dry run: plan and bucket preflight), then `--env dev --apply`: preflight (bucket must hold `_spa.html`, `error.html` and a prerendered article), backup of the distribution config to `infra/cloudfront/backups/`, nine function tests, publish, associate on viewer-request and viewer-response, set the error responses, wait, verify live URLs, **automatic revert** if verification fails.
3. Prod: `node scripts/infra/cf-router.mjs --env prod --apply --confirm-prod` after dev passes and `dist/` is deployed.

**GitHub workflows** (`.github/workflows/`): `test.yml` runs on push and pull request to `main` and `develop`. `deploy.yml` runs after a successful `Tests` run on `main` or by manual dispatch, and deploys dev with repository secrets. `deploy-prod.yml` is manual only and needs the confirmation text. Work happens on local branches and deploys are run locally with the scripts above; no workflow runs the CloudFront router, and only `deploy-prod.yml` pings IndexNow.

**Rollback**

| What | How |
|---|---|
| Dev frontend | Run the command in the `.REVERT.txt` beside the backup: `aws s3 sync <backup> s3://tradequt.com-dev --delete` then invalidate `/*` |
| Prod frontend | The `REVERT:` line the script printed: sync `s3://tradequt-artifacts-675016865482-us-east-1/fe-backups/prod-<ts>` back to `s3://tradequt.com-prod --delete`, then invalidate `/*` on `E1HW3I3EQVZLRD` |
| CloudFront router | `node scripts/infra/cf-router.mjs --env <dev or prod> --revert <backup.json>` (also `--confirm-prod` for prod) |
| Bad code | Deploy the previous good git ref with the same script (prod: `-Ref`) |

## 13. Making changes

Always finish with: `bunx tsc -p tsconfig.app.json --noEmit`, `bun run lint`, `bun run test` (or the affected files). For anything public also `bun run build` and check it ends with `verify-dist OK`. Add a test next to every new module.

### (a) Add a new app screen or tab

1. Create the view in `src/components/views/<Name>View.tsx` (or a feature folder). Export a named component.
2. `src/pages/AppPage.tsx`: add `const NameView = lazyPage(...)`, an entry in `VIEW_AT` (preload on hover and idle), and a `<Route path="name" ...>` inside the app `<Routes>`.
3. `src/components/shell/navItems.ts`: add to `NAV_GROUPS` (sidebar) or `ALL_NAV_ITEMS`; add the path to `isScopedPath()` if it needs the account/period bar; add to `TAB_ITEMS` only if it becomes a phone tab. `titleForPath` derives from the nav item.
4. `src/components/shell/CommandPalette.tsx`: add keywords in `NAV_KEYWORDS` for the palette entry.
5. If the screen loads data on open, add its queries to `src/components/shell/prefetchPage.ts` so hover prefetch matches.
6. `e2e/fixtures/routes.ts`: add to `APP_ROUTES`; add copy to `src/copy/index.ts` if the frame needs new sentences; add a `GUIDE_ANCHORS` entry in `src/content/guideAnchors.ts` if Help should link to a guide section.
7. Tests: `src/pages/__tests__/AppPage.test.tsx` pattern, and a view test in `src/components/views/__tests__/`.
8. A tab inside Analytics instead: edit `TABS` in `components/views/AnalyticsView.tsx` and add the tab component under `components/analysis/`.

### (b) Add a public page (SEO, prerender, sitemap)

Stand-alone SEO page (marketing, comparison, broker):

1. Component in `src/pages/seo/<Name>Page.tsx` using `<ContentPageShell>` (it adds `<SEO>` and the public layout); JSON-LD from `src/config/seo.ts`. Use `default export`.
2. `src/content/seo-pages.ts`: add an `SEO_PAGES` entry (path, title of 60 characters or fewer, description, label, `publishedAt`, `updatedAt`, optional `parent`).
3. `src/content/routes.ts`: add the same path to `SEO_PAGE_LOADERS` (a test fails if the two lists differ).
4. Links: `src/components/public/nav.ts` (header and footer lists) and `src/content/blog/see-also.ts` where relevant. Facts the page states go in `src/content/product-facts.ts` or a reference file, not in JSX.
5. Run `bun run test` (route-registry, preloadRoute, seo-build, content-quality) and `bun run build`. Optional: `node scripts/seo/audit-public.mjs --out <dir> --routes /your-path`.

Hand-wired page (legal, hub, calculator):

1. Page in `src/pages/...`, named export.
2. `src/content/publicPages.ts`: export `lazyPage(...)` and add it to `PAGE_AT`.
3. `src/PublicRoutes.tsx`: import it and add `<Route path=... />`.
4. `src/content/route-registry.ts`: add an entry to `STATIC_ROUTES` (kind, label, `lastmod`, `inSitemap`; `noindex: true` for utility pages).
5. A calculator also needs its `CalculatorCard` in `src/pages/resources/ResourcesPage.tsx`; the hub lists them by hand, so without it the page is prerendered and in the sitemap but not linked from `/resources`.
6. Checks as above. Run `bun scripts/seo/cf-router.ts --write` only if you changed hosts or `SPA_PREFIXES`. Then deploy (section 12); a new route needs no router change.

Blog article: follow [ARTICLE-TEMPLATE](growth/ARTICLE-TEMPLATE.md): `src/content/blog/<slug>.tsx`, an entry in `src/content/blog/articles.ts`, optional `see-also.ts`, then tests and build.

### (c) Call a new backend endpoint

1. Backend contract first: `JournalAWSSetup/docs/ARCHITECTURE.md` and the route in `JournalAWSSetup/README.md`.
2. Types: request/response types in `src/lib/api/<area>.ts` (exported through `src/lib/api/index.ts`) or `src/types/*.ts`.
3. Endpoint: in the matching `src/store/api/<area>Api.ts` add `builder.query` or `builder.mutation` with `query: () => '/path'` (relative to `API_BASE_URL`). Add `providesTags` / `invalidatesTags` (new tag types: `api.enhanceEndpoints({ addTagTypes: [...] })` at the top of that file). For a list shown immediately after a write, patch with `onQueryStarted` and `updateQueryData` as in `accountsApi.ts`. Export the hook; if the file is listed in `store/api/index.ts` it is re-exported, otherwise import by file path.
4. Errors: show failures with `ErrorState` (reads) or inline (writes) using `readApiError`; add a toast entry in `toastMiddleware.ts` only when no place on screen shows it. For gated endpoints, handle 402 through the existing plan signal: do not add your own.
5. Prefetch: if a screen should open warm, add the query to `components/shell/prefetchPage.ts`.
6. Tests: `src/store/api/__tests__/*` (see `featuresApi.test.ts`, `tradesApi.test.ts` for the mocking pattern), plus component tests.

### (d) Add a field to trades (frontend side)

Backend side (storage, validation, parsers) lives in `JournalAWSSetup/docs/ARCHITECTURE.md`; do it first.

1. `src/types/trade.ts`: add to `Trade`. `src/lib/api/trades.ts`: add to `CreateTradePayload`.
2. `src/store/api/tradesApi.ts`: map it from the backend in `mapBackendTradeToTrade` and to the backend in the create and update payloads. Extra optional fields are listed in `EXTRA_FIELDS` and handled by `mapExtraFieldsFromBackend` / `mapExtraFieldsToBackend`: add the key there to cover create, update and bulk at once.
3. `src/lib/patchTrade.ts` (and `lib/bulkPatch.ts` for bulk edits) if the field must survive partial updates.
4. Form: `components/trade/tradeFormState.ts` (`TradeFormState`, `emptyForm`, `formFromTrade`, `validateForm`, `LIMITS`, server field-error map), then `components/trade/TradeForm.tsx` (input and `buildPayload`). A range (for example 1 to 5) goes in `validateForm` as well as in the backend schema. Pane view: `components/trade/TradePane.tsx`.
5. Table: `src/lib/tradeColumns.ts` (`TRADE_COLUMNS` entry and presets), the cell in `components/tradelog/TradeTable.tsx`; filters and sort in `lib/tradeFilters.ts` if needed. The column shows for a preset only if its `presets` list names it; users on the Custom preset keep their saved list (`loadColumnConfig`, key `tq.tradelog.columns`) and add it themselves.
6. Import: `src/types/import.ts` (`NormalizedTrade`, `ImportCreateItem`), `lib/import/index.ts` (`toCreateItems`), `lib/import/rows.ts` and the review grid `components/import/ReviewGrid.tsx`.
7. Export: `src/lib/exportCsv.ts` (`EXPORT_COLUMNS`; the schema is fixed and ordered, so append and update its test).
8. Tests: `tradeColumns.test.ts`, `exportCsv.test.ts`, `tradesApi.test.ts`, `tradePreview.test.ts` as relevant; then typecheck.

### (e) Change prices or plan limits shown on the site

1. Confirm the live values in the backend (Stripe prices and plan config; the comment above `PRO_PRICES` in `product-facts.ts` names the backend files that must match).
2. `src/content/product-facts.ts`: edit `PRO_PRICES`, `PLAN_LIMITS`, `TRIAL_DAYS`, `PRICING_NOTE` or FAQ text. This updates the pricing page, `PricingTable`, billing screens, JSON-LD, `llms.txt` and SEO titles built from `proPrice()`.
3. Search for hard-coded copies: `rg "₹|\$[0-9]" src --glob '!**/__tests__/**'` (blog bodies and legal pages may quote prices in prose; update them; `src/pages/TermsOfServicePage.tsx` and `RefundPolicyPage.tsx` use product facts).
4. Competitor price tables are separate: `src/content/journal-pricing.ts` (`TRADEQUT_PRICING` for ours).
5. Set `updatedAt` of the pages in `seo-pages.ts` and `lastmod` in `route-registry.ts`.
6. `bun run test` (`content-quality.test.tsx` imports the product facts and checks content against them) and `bun run build`; check `dist/llms.txt` and `dist/pricing/index.html`.

### (f) Add a user setting or preference

Device-only (this browser):

1. `src/hooks/useUiState.ts`: add the field to `UiState` and `DEFAULTS`.
2. `src/components/settings/PreferencesSection.tsx`: add a `Row` calling `changeDevice({ field: value })`.
3. Apply it where used, read via `useUiState()` (global effects such as `data-density` are set in `AppPage.tsx`).

Account-wide (saved on the server):

1. Backend field first (`JournalAWSSetup` user preferences).
2. `src/components/settings/usePreferences.ts`: add to `ServerPreferences`, and to `deviceFromServer` if a device copy exists.
3. `PreferencesSection.tsx`: use `changeAccount(devicePatch, serverPatch)` (saves through `userApi.updatePreferences` and reverts the device value on failure). Notification toggles live in `NotificationsSection.tsx`. Its "Getting-started emails" switch saves `notifications.tradeReminders` (on by default, on every plan); the backend's daily job skips the day 1, 3 and 7 mails while it is `false` (`JournalAWSSetup/src/handlers/lifecycle-emails/app.ts`).
4. Tests: `src/components/settings/__tests__` and `hooks/__tests__`.

New dropdown list for the trade form instead: `SavedOptions` in `types/trade.ts`, `hooks/useSavedOptions.ts`, `components/settings/optionLists.ts` and the backend.

### (g) Add a keyboard shortcut

1. `src/lib/keymap.ts`: add an entry to `KEYMAP` (unique `id`, `keys`, `label`, `scope`, `single: true` for a single-key shortcut). It feeds the shortcuts dialog (`components/shell/ShortcutsDialog.tsx`) and palette hints automatically.
2. Implement the handler where the scope lives: app-wide in `src/hooks/useGlobalShortcuts.ts` (add a handler prop and a branch; wire it in `AppPage.tsx` `useGlobalShortcuts({...})`); list keys in `components/views/TradeLogView.tsx`; trade pane keys in `components/trade/TradePane.tsx`. Single keys must respect `ui.singleKeyShortcuts` and `isTypingTarget()` (exported from `useGlobalShortcuts.ts`).
3. To show it in the palette add `keymapId` to the command in `components/shell/CommandPalette.tsx`.
4. Tests: `src/hooks/__tests__/useGlobalShortcuts.test.tsx`, `src/lib/__tests__/keymap.test.ts`.

### (h) Add an analytics statistic or card

1. Value source: statistics are computed by the server. If the figure is not in `types/stats.ts` (`AggregatedStats`) or `types/analysis.ts` (`Analysis`), add it to the backend first (see backend doc), then the type. If it can be derived from loaded trades, add a pure function in `src/lib/` (`dashboard.ts`, `analyticsRows.ts` or a new file) with a test.
2. Definition: `src/components/stats/metricDefs.ts`: add the key to `MetricKey` and an entry in `METRICS` (label, definition, formula, optional glossary id from `content/glossary/terms.ts`).
3. Cell: render with `<StatStrip>` and `<StatCell metric=... value=... />` (`components/stats/StatStrip.tsx`). Dashboard cells: `components/views/DashboardView.tsx` and `components/dashboard/*`. Analytics tabs: `components/analysis/*Tab.tsx` with panels in `*Panels.tsx`; data from `useAnalysis` (`components/analysis/useAnalysis.ts`) or `usePeriodStats`.
4. Comparison, currency and pro gating: `components/stats/useCompare.ts`, `useCurrencyView.ts`; wrap Pro-only content in `LockedPreview`/`ProGate`.
5. If the screen is prefetched, update `components/shell/prefetchPage.ts` to match the query arguments.
6. Tests next to the component or lib file; typecheck and lint.
