# TradeQut Frontend

React + TypeScript trading journal frontend. Deployed to CloudFront + S3.

## Tech Stack

React 18, TypeScript, Vite, Redux Toolkit (RTK Query), shadcn/ui, Tailwind CSS, Recharts, React Router, Axios, Zod.

## Local Development

### Against remote dev API (default)

```powershell
bun install
cp .env.example .env.development   # fill in values from deployed backend
bun run dev                         # http://localhost:8080 -> remote AWS dev API
```

### Against local backend (full stack)

Requires Docker Desktop running + backend SAM local (see JournalAWSSetup README).

**Terminal 1 - Backend:**
```powershell
cd ..\JournalAWSSetup
sam build --parallel --cached
sam local start-api --port 3001 --env-vars env-local.json
```

**Terminal 2 - Frontend:**
```powershell
bun run dev:local                   # http://localhost:8080 -> proxied to localhost:3001
```

`dev:local` uses `.env.localdev` which sets `VITE_API_URL=/v1`. Vite proxies `/v1/*` requests to `http://127.0.0.1:3001` to avoid CORS issues.

### Environment Variables

Copy `.env.example` and fill in values from the backend stack outputs:

```bash
# Get values from deployed backend
aws cloudformation describe-stacks --stack-name tradequt-dev \
  --query "Stacks[0].Outputs" --output table
```

| Variable | Source |
|----------|--------|
| `VITE_API_URL` | Backend stack output `ApiBaseUrl` |
| `VITE_AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `VITE_COGNITO_USER_POOL_ID` | Backend stack output `UserPoolId` |
| `VITE_COGNITO_CLIENT_ID` | Backend stack output `UserPoolClientId` |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain (e.g. `auth-tradequt-dev.tradequt.com`) |
| `VITE_EXTRACT_TRADES_URL` | Lambda Function URL for AI trade extraction |
| `VITE_GENERATE_INSIGHTS_URL` | Lambda Function URL for AI insights |

## Build

```bash
bun run build     # production build -> dist/
bun run preview   # preview production build locally
```

## Deploy to CloudFront + S3

Deployment is automated via GitHub Actions on push to `main` (dev) or manual dispatch (prod).

### Dev (automatic on push to main)

```bash
bun run build:dev
aws s3 sync dist/ s3://tradequt.com-dev --delete
aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION_ID_DEV --paths "/*"
```

### Prod (manual trigger in GitHub Actions)

Go to Actions -> "Deploy to Production" -> Run workflow.

### GitHub Secrets

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `VITE_API_URL_DEV` / `_PROD`, `VITE_COGNITO_DOMAIN_DEV` / `_PROD`
- `VITE_COGNITO_CLIENT_ID_DEV` / `_PROD`
- `VITE_EXTRACT_TRADES_URL_DEV` / `_PROD`, `VITE_GENERATE_INSIGHTS_URL_DEV` / `_PROD`
- `CF_DISTRIBUTION_ID_DEV` / `_PROD`

### Build Pipeline

```bash
bun run build          # vite build
node scripts/prerender-routes.js   # SEO pre-rendering (8 public routes)
node scripts/generate-sitemap.js   # sitemap.xml
node scripts/generate-og-image.js  # OG images (1200x630)
node scripts/convert-images.js     # WebP conversion
```

## Project Structure

```
src/
  components/
    views/       # Page views (Dashboard, TradeLog, Analytics, Goals, etc.)
    ui/          # shadcn/ui primitives
    trade/       # Trade-specific components
    account/     # Account components
    dashboard/   # Dashboard components
  store/
    api/         # RTK Query endpoints
    slices/      # Redux slices (auth, accounts, trades)
  lib/
    api/         # Type definitions + extractTrades API
    api.ts       # Axios client with token refresh
    cache/       # IndexedDB trade cache (sync, crypto, proactive)
  hooks/         # Custom React hooks
  types/         # TypeScript interfaces
```

## Trade Cache (IndexedDB)

Encrypted per-user cache for the Insights page. Uses `POST /v1/trades/sync` for efficient sync:

1. Sends local day hashes to server, server compares and returns only stale trades
2. Stores in IndexedDB with AES-GCM encryption (per-user key derived from userId)
3. Always reads from IndexedDB (single source of truth for Insights/Chat)

Key files in `src/lib/cache/`:

| File | Purpose |
|------|---------|
| `sync.ts` | Orchestrates hash-based sync with `/v1/trades/sync` endpoint |
| `trade-cache.ts` | IndexedDB read/write operations |
| `crypto.ts` | AES-GCM encryption/decryption for cached trades |
| `proactive-cache.ts` | Background sync triggered after trade mutations |
| `hash.ts` | Day-level hash computation for change detection |
