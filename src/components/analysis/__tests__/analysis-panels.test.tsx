import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/auth/authService', () => ({ getIdToken: async () => null }));

import { renderWithProviders } from '@/test/test-utils';
import type { Analysis } from '@/types/analysis';
import type { AggregatedStats } from '@/types/stats';
import type { AnalysisState } from '../useAnalysis';
import type { AnalyticsContext } from '../drill';
import { ConcentrationPanel, EdgeSummaryPanel, ResultBridgePanel, RollingExpectancyChart, WorkingPanel } from '../OverviewPanels';
import { BeyondStopPanel, DrawdownFactsPanel, PlannedVsCapturedPanel, RiskPerTradePanel, ScenarioPanel } from '../RiskPanels';
import { DetectorBoard, RULE_TEXT, WhatIfPanel } from '../BehaviourPanels';
import { TimingTab } from '../TimingTab';
import { OverviewTab } from '../OverviewTab';
import { RiskTab } from '../RiskTab';
import { QA_INR, QA_SCOPE, QA_USD, QA_USD_ACCOUNT } from './qaFixtures';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const scope = { accountId: QA_USD_ACCOUNT, ...QA_SCOPE };
const st = (over: Partial<AnalysisState> = {}): AnalysisState => ({ data: QA_USD, scope, isLoading: false, isError: false, mixed: null, refetch: vi.fn(), ...over });
const empty: Analysis = { ...QA_USD, tradeCount: 0 };
const ctx = (state: AnalysisState, pro = true): AnalyticsContext => ({ stats: { dailyPnl: [] } as unknown as AggregatedStats, prevRange: null, multi: false, zone: 'Asia/Kolkata', currency: 'USD', pro, analysis: state });

type Render = (s: AnalysisState) => React.ReactElement;
const PANELS: [string, Render][] = [
  ['Do I have an edge?', (s) => <EdgeSummaryPanel state={s} currency="USD" />],
  ['Where the result came from', (s) => <ResultBridgePanel state={s} currency="USD" pro />],
  ['Dependence on a few trades', (s) => <ConcentrationPanel state={s} currency="USD" pro />],
  ['What is working · what is not', (s) => <WorkingPanel ctx={ctx(s)} />],
  ['Losses beyond the stop', (s) => <BeyondStopPanel state={s} currency="USD" />],
  ['Planned against captured', (s) => <PlannedVsCapturedPanel state={s} />],
  ['Risk per trade', (s) => <RiskPerTradePanel state={s} currency="USD" />],
  ['Drawdown facts', (s) => <DrawdownFactsPanel state={s} currency="USD" />],
  ['Next 100 trades: a scenario', (s) => <ScenarioPanel state={s} currency="USD" />],
  ['What do I do that costs money?', (s) => <DetectorBoard state={s} currency="USD" pro />],
  ['What if I had followed a rule?', (s) => <WhatIfPanel state={s} currency="USD" />],
  ['Rolling expectancy', (s) => <RollingExpectancyChart state={s} />],
];

describe.each(PANELS)('%s: the four states', (title, panel) => {
  it('loading: a placeholder of fixed height, no figures', () => {
    renderWithProviders(panel(st({ data: undefined, isLoading: true })));
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('error: the API message and a Retry that refetches', async () => {
    const s = st({ data: undefined, isError: true, error: { status: 500, data: { message: 'Analysis is being rebuilt.' } } });
    renderWithProviders(panel(s));
    expect(screen.getByRole('alert')).toHaveTextContent('Analysis is being rebuilt.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(s.refetch).toHaveBeenCalled();
  });

  it('empty: says the period has no trades', () => {
    renderWithProviders(panel(st({ data: empty })));
    expect(screen.getByText('No trades in this period.')).toBeInTheDocument();
  });

  it('mixed currencies: the pick-an-account notice, never a sum', () => {
    renderWithProviders(panel(st({ data: undefined, mixed: ['INR', 'USD'] })));
    expect(screen.getByText(/in INR and USD\. Pick one account in the top bar/)).toBeInTheDocument();
  });
});

describe('All accounts in several currencies: one notice per tab, not one per panel', () => {
  const stats = { totalTrades: 68, wins: 30, losses: 38, winRate: 44, totalPnl: 1, dailyPnl: [] } as unknown as AggregatedStats;
  it.each([['Overview', OverviewTab], ['Risk', RiskTab], ['Timing', TimingTab]] as const)('%s', (_n, Tab) => {
    renderWithProviders(<Tab ctx={{ ...ctx(st({ data: undefined, mixed: ['INR', 'USD'] })), stats }} />);
    expect(screen.getAllByText(/in INR and USD\. Pick one account in the top bar/)).toHaveLength(1);
  });
});

describe('too few trades', () => {
  it('Edge: no range below 20 trades, and it says so', () => {
    const a: Analysis = { ...QA_USD, tradeCount: 12, edge: { ...QA_USD.edge, winRateRange: null, expectancyRRange: null, tradesWithR: 12, tradesNeeded: null } };
    renderWithProviders(<EdgeSummaryPanel state={st({ data: a })} currency="USD" />);
    expect(screen.getByText(/Too few trades for a range \(12 of 20\)/)).toBeInTheDocument();
    expect(screen.getByText(/Too few trades with a stop for a range \(12 of 20\)/)).toBeInTheDocument();
  });

  it('Scenario: shown from 50 trades; the QA account has 45', () => {
    renderWithProviders(<ScenarioPanel state={st()} currency="USD" />);
    expect(screen.getByText(/Shown from 50 trades, so the resampling has enough to draw from; this period has 45\./)).toBeInTheDocument();
  });

  it('Rolling expectancy: shown from 20 trades with a stop', () => {
    renderWithProviders(<RollingExpectancyChart state={st({ data: { ...QA_USD, rolling: [], edge: { ...QA_USD.edge, tradesWithR: 10 } } })} />);
    expect(screen.getByText('Shown from 20 trades with a stop; this period has 10.')).toBeInTheDocument();
  });

  it('What is working: nothing meets the rule, and only patterns to watch are listed, by evidence', () => {
    renderWithProviders(<WorkingPanel ctx={ctx(st())} />);
    expect(screen.getByText(/Nothing meets the evidence rule yet\. A finding needs 30 trades in a group and 30 outside it; the closest is Long, with 24 in and 21 outside/)).toBeInTheDocument();
    const watch = screen.getByRole('list', { name: 'Patterns to watch' });
    expect(within(watch).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(watch).queryByText(/· weekday|· hour/)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Edges and leaks' })).not.toBeInTheDocument();
  });

  it('Detectors: none seen', () => {
    const a: Analysis = { ...QA_USD, detectors: QA_USD.detectors.map((d) => ({ ...d, count: 0, tradeIds: [] })) };
    renderWithProviders(<DetectorBoard state={st({ data: a })} currency="USD" pro />);
    expect(screen.getByText('None of the behaviours shows up in this period.')).toBeInTheDocument();
  });

  it('Risk panels: no losing trade, no target, no stop', () => {
    const a: Analysis = { ...QA_USD, risk: { ...QA_USD.risk, beyondStop: { count: 0, losingTrades: 0, amount: 0, tradeIds: [] }, plannedVsCaptured: null, riskPerTrade: null, drawdown: { current: 0, deepest: 0, longestDays: 0, since: null } } };
    renderWithProviders(<><BeyondStopPanel state={st({ data: a })} /><PlannedVsCapturedPanel state={st({ data: a })} /><RiskPerTradePanel state={st({ data: a })} /><DrawdownFactsPanel state={st({ data: a })} /></>);
    expect(screen.getByText('No losing trade in this period.')).toBeInTheDocument();
    expect(screen.getByText('No winning trade has both a target and a stop in this period.')).toBeInTheDocument();
    expect(screen.getByText('No trade has a stop loss, so the money at risk is unknown.')).toBeInTheDocument();
    expect(screen.getByText('At the high')).toBeInTheDocument();
  });
});

describe('figures from the QA fixture (report §4 examples)', () => {
  it('Overview edge: win rate with range beside break-even; expectancy in R with range and trades needed', () => {
    renderWithProviders(<EdgeSummaryPanel state={st()} currency="USD" />);
    expect(screen.getByText('53.3%')).toBeInTheDocument();
    expect(screen.getByText(/Range 39\.1%–67\.1% · 45 trades/)).toBeInTheDocument();
    expect(screen.getByText('37.6%')).toBeInTheDocument();
    expect(screen.getByText(/of 1\.66\. Above break-even even at the low end of its range\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'payoff' })).toBeInTheDocument();
    expect(screen.getByText('+0.22R')).toBeInTheDocument();
    expect(screen.getByText(/Range −0\.23R to \+0\.67R\. Not proven yet: about 180 trades with a stop would be needed at this spread; you have 45\./)).toBeInTheDocument();
    expect(screen.getByText('Provisional · 45 trades')).toBeInTheDocument();
  });

  it('INR: below break-even, and an expectancy range wholly below zero', () => {
    renderWithProviders(<EdgeSummaryPanel state={st({ data: QA_INR })} currency="INR" />);
    expect(screen.getByText('26.1%')).toBeInTheDocument();
    expect(screen.getByText('50.2%')).toBeInTheDocument();
    expect(screen.getByText(/The whole range is below zero\./)).toBeInTheDocument();
    expect(screen.getByText('Early: numbers will move a lot · 23 trades')).toBeInTheDocument();
  });

  it('Bridge (INR): 11 of 17 losing trades past the stop, ₹26,382.89, parts that add up to the net', () => {
    renderWithProviders(<ResultBridgePanel state={st({ data: QA_INR })} currency="INR" pro />);
    expect(screen.getByText(/11 of 17 losing trades went past the stop; the part beyond the stop cost ₹26,382\.89\./)).toBeInTheDocument();
    const split = screen.getByRole('list', { name: 'Result split' });
    expect(within(split).getByText('−₹56,787.78')).toBeInTheDocument();
    expect(within(split).getByText('None recorded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the 11 trades past the stop' })).toBeInTheDocument();
  });

  it('Concentration (USD): 43% from the 3 best, $93.72 without them; Free gets no trade lists', () => {
    renderWithProviders(<ConcentrationPanel state={st()} currency="USD" pro={false} />);
    expect(screen.getByText('43%')).toBeInTheDocument();
    expect(screen.getByText('+$93.72')).toBeInTheDocument();
    expect(screen.getByText('instead of +$1,108.72')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open the 3 best/ })).not.toBeInTheDocument();
  });

  it('Risk (USD): 15 of 21 past the stop, planned 2.00R against 1.55R captured, risk per trade', () => {
    renderWithProviders(<><BeyondStopPanel state={st()} currency="USD" /><PlannedVsCapturedPanel state={st()} /><RiskPerTradePanel state={st()} currency="USD" /><DrawdownFactsPanel state={st()} currency="USD" /></>);
    expect(screen.getByText('15 of 21')).toBeInTheDocument();
    expect(screen.getByText('−$390.40')).toBeInTheDocument();
    expect(screen.getByText('+2.00R')).toBeInTheDocument();
    expect(screen.getByText('+1.55R')).toBeInTheDocument();
    expect(screen.getByText('77% of the plan')).toBeInTheDocument();
    expect(screen.getByText('8 of 24 winners reached the target.')).toBeInTheDocument();
    expect(screen.getByText('$22.50')).toBeInTheDocument();
    expect(screen.getByText(/22 trades risked more than 1\.5× the median; together they made \+\$1,174\.46\./)).toBeInTheDocument();
    expect(screen.getByText('−$152.10')).toBeInTheDocument();
    expect(screen.getByText('24 days')).toBeInTheDocument();
  });

  it('Scenario: labelled as a scenario with its percentiles when the server sends one', () => {
    const a: Analysis = { ...QA_USD, tradeCount: 60, scenario: { basedOn: 60, runs: 5000, horizon: 100, profitableShare: 0.71, final: { p5: -400, p50: 2200, p95: 5100 }, maxDrawdown: { p50: 600, p95: 1500 }, drawdownRisk: { amount: 5000, share: 0.02 }, targetBeforeLimit: null } };
    renderWithProviders(<ScenarioPanel state={st({ data: a })} currency="USD" />);
    expect(screen.getByText('If your next trades resemble your past ones. A scenario, not a forecast.')).toBeInTheDocument();
    expect(screen.getByText('71%')).toBeInTheDocument();
    expect(screen.getByText('5th to 95th: −$400.00 to +$5,100.00')).toBeInTheDocument();
    expect(screen.getByText(/Drawn 5,000 times from your last 60 trades, 100 trades a run\./)).toBeInTheDocument();
  });

  it('Detector board: one row per behaviour seen, verdict wording, trades and Make this a rule', () => {
    renderWithProviders(<DetectorBoard state={st({ data: QA_INR })} currency="INR" pro />);
    const table = screen.getByRole('table', { name: 'Behaviour checks' });
    const row = within(table).getByRole('rowheader', { name: /Losses beyond the stop/ }).closest('tr')!;
    expect(within(row).getAllByText('−₹67,182.89').length).toBeGreaterThan(0);
    expect(within(row).getAllByText('Too early to tell').length).toBeGreaterThan(0);
    expect(within(row).getByRole('button', { name: 'Open 11 trades: Losses beyond the stop' })).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /Make this a rule/ })).toHaveAttribute('href', `/app/goals?addRule=${encodeURIComponent(RULE_TEXT.beyondStop).replace(/%20/g, '+')}`);
    expect(screen.getByText(/Not seen in this period: re-entry after a loss/)).toBeInTheDocument();
  });

  it('Detector board on Free: counts only, money, R and trade lists are Pro', () => {
    renderWithProviders(<DetectorBoard state={st({ data: QA_INR })} currency="INR" pro={false} />);
    const table = screen.getByRole('table', { name: 'Behaviour checks' });
    expect(within(table).queryByText('−₹67,182.89')).not.toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: /Net P&L/ })).not.toBeInTheDocument();
    expect(screen.getByText(/R against your normal, evidence and the trades behind each row are part of/)).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /^Open/ })).not.toBeInTheDocument();
    expect(within(table).getAllByRole('link', { name: /Make this a rule/ }).length).toBeGreaterThan(0);
  });

  it('Timing: trade number in the day, trades-per-day bands with the average day, holding winners against losers', () => {
    renderWithProviders(<TimingTab ctx={ctx(st())} />);
    const byNumber = screen.getByRole('table', { name: 'Results by trade number in the day' });
    expect(within(byNumber).getByText('1st trade of the day')).toBeInTheDocument();
    expect(within(byNumber).getAllByText('+0.33R').length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: 'Results by trades per day' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Average day/ })).toBeInTheDocument();
    expect(screen.getByText('2h 56m')).toBeInTheDocument();
    expect(screen.getByText('2h 4m')).toBeInTheDocument();
    expect(screen.getByText('Losers are not held longer than winners.')).toBeInTheDocument();
  });
});

/** jsdom's AbortSignal is not accepted by Node's Request, so the request object is a stand-in; `fetch` is what answers. */
class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

describe('What-if replay posts the rule and shows the result', () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal('Request', StandInRequest);
    vi.stubGlobal('fetch', vi.fn(async (req: StandInRequest) => {
      calls.push({ url: req.url, method: req.init.method, body: req.init.body ? JSON.parse(String(req.init.body)) : null });
      const result = { actualNet: 1108.72, replayNet: 1104.81, removed: 5, removedTradeIds: ['t1', 't2', 't3', 't4', 't5'], actualAvgR: 0.2228, replayAvgR: 0.2406 };
      return new Response(JSON.stringify({ success: true, data: { result, truncated: false } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends {accountId, from, to, rule} and prints actual against replayed, trades not taken and R', async () => {
    renderWithProviders(<WhatIfPanel state={st()} currency="USD" />);
    const n = screen.getByLabelText('Losing trades');
    fireEvent.change(n, { target: { value: '1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Replay' }));
    await waitFor(() => expect(screen.getByText('Stop for the day after 1 losing trade')).toBeInTheDocument());
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.test/v1/analysis/what-if');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toEqual({ accountId: QA_USD_ACCOUNT, from: '2026-08-01', to: '2026-11-13', rule: { kind: 'stopAfterLosses', n: 1 } });
    expect(screen.getByText('+$1,108.72')).toBeInTheDocument();
    expect(screen.getByText('+$1,104.81')).toBeInTheDocument();
    expect(screen.getByText('of 45')).toBeInTheDocument();
    expect(screen.getByText('+0.24R')).toBeInTheDocument();
    expect(screen.getByText('Without those 5 trades the period would have ended $3.91 lower.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the 5 trades not taken' })).toBeInTheDocument();
  });

  it('does not send an invalid value', async () => {
    renderWithProviders(<WhatIfPanel state={st()} currency="USD" />);
    fireEvent.change(screen.getByLabelText('Losing trades'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Replay' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/whole number from 1 to 100/);
    expect(calls).toHaveLength(0);
  });
});
