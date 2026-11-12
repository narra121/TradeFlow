import { test as base, type Page } from '@playwright/test';

/**
 * A structurally valid, unexpired JWT: the app only decodes it (sub, exp) and never verifies the signature.
 */
function createFakeJWT(): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'test-user-id-123', email: 'test@example.com', name: 'Test User', exp: now + 86400, iat: now })}.${Buffer.from('fake-signature').toString('base64url')}`;
}

const ago = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const ACCOUNTS = [
  { id: 'acc-usd', accountId: 'acc-usd', name: 'FTMO 100K', type: 'PROP', status: 'active', initialBalance: 100000, balance: 100000, currency: 'USD', createdAt: ago(60, 9) },
  { id: 'acc-inr', accountId: 'acc-inr', name: 'Zerodha F&O', type: 'LIVE', status: 'active', initialBalance: 500000, balance: 500000, currency: 'INR', createdAt: ago(60, 9) },
];

const trade = (id: string, symbol: string, side: 'BUY' | 'SELL', accountId: string, days: number, pnl: number, over: Record<string, unknown> = {}) => ({
  tradeId: id,
  symbol,
  side,
  entryPrice: 100,
  exitPrice: pnl >= 0 ? 101 : 99,
  stopLoss: 99,
  takeProfit: 102,
  quantity: 1,
  openDate: ago(days, 9),
  closeDate: ago(days, 10),
  outcome: pnl >= 0 ? 'TP' : 'SL',
  pnl,
  accountId,
  setupType: 'Breakout',
  tradingSession: 'London Open',
  mistakes: [],
  images: [],
  ...over,
});

export const TRADES = [
  trade('t-1', 'EURUSD', 'BUY', 'acc-usd', 1, 250),
  trade('t-2', 'GBPJPY', 'SELL', 'acc-usd', 2, -120, { setupType: 'Reversal', mistakes: ['FOMO'] }),
  trade('t-3', 'NAS100', 'BUY', 'acc-usd', 3, 410),
  trade('t-4', 'RELIANCE', 'BUY', 'acc-inr', 2, 5200, { setupType: undefined }),
  trade('t-5', 'NIFTY', 'SELL', 'acc-inr', 4, -3100),
  trade('t-6', 'BANKNIFTY', 'BUY', 'acc-inr', 5, 1800, { accountId: undefined }),
];

const ok = (data: unknown) => ({ success: true, data, message: 'OK' });

const STATS = {
  totalTrades: TRADES.length, wins: 4, losses: 2, breakeven: 0, grossProfit: 7660, grossLoss: -3220, totalPnl: 4440, totalVolume: 6,
  winRate: 66.7, profitFactor: 2.4, avgWin: 1915, avgLoss: -1610, expectancy: 740, avgRiskReward: 1.2, bestTrade: 5200, worstTrade: -3100,
  avgHoldingTime: 60, minDuration: 60, maxDuration: 60, consecutiveWins: 2, consecutiveLosses: 1, maxDrawdown: 3100, sharpeRatio: 1.1,
  durationBuckets: [], symbolDistribution: { EURUSD: { count: 1, wins: 1, pnl: 250 }, NIFTY: { count: 1, wins: 0, pnl: -3100 } },
  strategyDistribution: { Breakout: { count: 5, wins: 4, pnl: 7660 } }, sessionDistribution: { 'London Open': { count: 6, wins: 4, pnl: 4440 } },
  outcomeDistribution: {}, hourlyStats: [{ hour: '09', trades: 6, wins: 4, pnl: 4440, winRate: 66.7 }], dailyWinRate: [], dailyPnl: [],
};

export interface ApiCall {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

/** Answers every `/v1` call from one handler (Playwright runs the last registered matching route first, so several overlapping routes cannot be used). */
async function mockApi(page: Page, calls: ApiCall[]) {
  await page.route('**/v1/**', async (route) => {
    const req = route.request();
    const sent = req.postData();
    calls.push({ method: req.method(), path: new URL(req.url()).pathname.replace(/^.*\/v1/, ''), body: sent ? (JSON.parse(sent) as Record<string, unknown>) : null });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/v1/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path.startsWith('/trades')) {
      if (req.method() === 'GET') return json(ok({ trades: TRADES, pagination: { hasMore: false } }));
      if (req.method() === 'POST' && path === '/trades') return json(ok({ trade: trade('t-new', 'EURUSD', 'BUY', 'acc-usd', 0, 100) }));
      if (req.method() === 'PUT') {
        const id = path.split('/')[2];
        const body = (sent ? JSON.parse(sent) : {}) as Record<string, unknown>;
        return json(ok({ trade: { ...(TRADES.find((t) => t.tradeId === id) ?? TRADES[0]), ...body } }));
      }
      return json(ok({}));
    }
    if (path.startsWith('/accounts')) return json(ok({ accounts: ACCOUNTS }));
    if (path.startsWith('/me/entitlements')) {
      return json(ok({ entitlements: { plan: 'free', status: 'free', limits: {}, features: {} }, usage: {}, periodResetsAt: ago(-20, 0), writableAccountIds: null }));
    }
    if (path.startsWith('/options')) return json(ok({ options: { strategies: ['Breakout', 'Reversal'], sessions: ['London Open'], marketConditions: [], newsEvents: [], mistakes: ['FOMO'], symbols: [], lessons: [], timeframes: [], tags: [] } }));
    if (path.startsWith('/stats')) return json(ok(STATS));
    if (path.startsWith('/goals/progress')) {
      return json(ok({ goalProgress: {}, ruleCompliance: { totalRules: 0, followedCount: 0, brokenRulesCounts: {} }, goals: [], rules: [] }));
    }
    if (path === '/rules') return json(ok({ rules: [] }));
    if (path === '/goals') return json(ok({ goals: [] }));
    if (path.startsWith('/rules-goals')) return json(ok({ rules: [], goals: [] }));
    if (path.startsWith('/user/profile')) return json(ok({ user: { id: 'test-user-id-123', name: 'Test User', email: 'test@example.com' } }));
    if (path.startsWith('/auth/refresh')) return json(ok({ IdToken: createFakeJWT() }));
    return json(ok({}));
  });
}

/** Signs in by seeding the tokens before any page script runs. */
async function signIn(page: Page) {
  const token = createFakeJWT();
  await page.addInitScript((t) => {
    localStorage.setItem('idToken', t);
    localStorage.setItem('accessToken', t);
    localStorage.setItem('refreshToken', 'fake-refresh-token');
  }, token);
}

/**
 * Extended test fixture that provides a signed-in page with a mocked API and collected page errors.
 * Usage: import { test, expect } from './fixtures/auth';
 */
export const test = base.extend<{ authedPage: Page; pageErrors: string[]; apiCalls: ApiCall[] }>({
  apiCalls: async ({}, use) => {
    await use([]);
  },
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|DevTools|Failed to load resource/.test(m.text())) errors.push(m.text());
    });
    await use(errors);
  },
  authedPage: async ({ page, pageErrors, apiCalls }, use) => {
    void pageErrors;
    await mockApi(page, apiCalls);
    await signIn(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
