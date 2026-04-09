# TradeFlow Frontend

React + TypeScript trading journal frontend. Deployed to GitHub Pages.

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
aws cloudformation describe-stacks --stack-name tradeflow-dev \
  --query "Stacks[0].Outputs" --output table
```

| Variable | Source |
|----------|--------|
| `VITE_API_URL` | Backend stack output `ApiBaseUrl` |
| `VITE_AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `VITE_COGNITO_USER_POOL_ID` | Backend stack output `UserPoolId` |
| `VITE_COGNITO_CLIENT_ID` | Backend stack output `UserPoolClientId` |
| `VITE_RAZORPAY_KEY_ID` | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) - Test or Live key |

## Build

```bash
bun run build     # production build -> dist/
bun run preview   # preview production build locally
```

## Deploy to GitHub Pages

Deployment is automated via GitHub Actions on push to `main`.

### Setup (one-time)

1. **Enable GitHub Pages**: Repository Settings -> Pages -> Source: `gh-pages` branch
2. **Add secrets** in Repository Settings -> Secrets and variables -> Actions:
   - `VITE_API_URL_PROD`
   - `VITE_AWS_REGION`
   - `VITE_COGNITO_USER_POOL_ID_PROD`
   - `VITE_COGNITO_CLIENT_ID_PROD`
   - `VITE_RAZORPAY_KEY_ID_PROD`

3. Push to `main` -> GitHub Actions builds and deploys automatically.

### Custom Domain (optional)

1. Add CNAME DNS record pointing to `your-username.github.io`
2. Uncomment the `cname` line in `.github/workflows/deploy.yml`
3. Enable HTTPS in Repository Settings -> Pages

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
  hooks/         # Custom React hooks
  types/         # TypeScript interfaces
```
