import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatementPanel } from '../StatementPanel';
import { RiskTab } from '../RiskTab';
import { BehaviourTab } from '../BehaviourTab';
import type { AnalyticsContext } from '../drill';
import type { AggregatedStats } from '@/types/stats';

vi.mock('@/store/api', () => ({ useGetRulesQuery: () => ({ data: [{ ruleId: 'r1', rule: 'No revenge trades' }] }) }));
vi.mock('@/store/api/analysisApi', () => ({ useWhatIfMutation: () => [vi.fn(), {}] }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ currency: 'USD', isLoading: false, isError: false, can: () => true }) }));
vi.mock('@/components/billing/ProGate', () => ({ LockedPreview: ({ title }: { title: string }) => <p>{title} (locked)</p> }));

const base = {
  totalTrades: 68, wins: 40, losses: 28, winRate: 58.8, totalPnl: 3204.1, expectancy: 47.12, profitFactor: 1.84, avgWin: 184.2, avgLoss: 121.4, bestTrade: 640, worstTrade: -350,
  avgRiskReward: 2, maxDrawdown: 4.2, consecutiveWins: 6, consecutiveLosses: 4, dailyPnl: [],
} as unknown as AggregatedStats;
const withR = { ...base, avgR: 0.22, sdR: 1.5, rCount: 45 } as AggregatedStats;
const ctx = (stats: AggregatedStats, over: Partial<AnalyticsContext> = {}): AnalyticsContext => ({ stats, prevRange: null, multi: false, zone: 'UTC', currency: 'USD', pro: true, ...over });
const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('realised R on the Overview statement (A-03)', () => {
  it('shows the average R with the trades behind it and the plan beside it', () => {
    render(<StatementPanel ctx={ctx(withR)} />);
    const risk = screen.getByRole('region', { name: 'Risk' });
    expect(within(risk).getByRole('button', { name: 'Avg R' })).toBeInTheDocument();
    expect(within(risk).queryByRole('button', { name: 'Planned R:R' })).not.toBeInTheDocument();
    expect(within(risk).getByText('+0.22R')).toBeInTheDocument();
    expect(within(risk).getByText('45 trades with a stop · planned R:R 2.00')).toBeInTheDocument();
  });

  it('compares with the previous period in R', () => {
    const prev = { ...withR, avgR: 0.1 } as AggregatedStats;
    render(<StatementPanel ctx={ctx(withR, { prev, prevRange: { startDate: '', endDate: '', name: 'Oct', spokenName: 'October' } })} />);
    expect(screen.getByText(/0\.12R versus October/)).toBeInTheDocument();
  });

  it('falls back to the planned R:R and says why when no trade has a stop', () => {
    render(<StatementPanel ctx={ctx({ ...base, avgR: null, sdR: null, rCount: 0 } as AggregatedStats)} />);
    expect(screen.getByRole('button', { name: 'Planned R:R' })).toBeInTheDocument();
    expect(screen.getByText('2.00')).toBeInTheDocument();
    expect(screen.getByText('No trade with a stop · planned, not realised')).toBeInTheDocument();
  });

  it('shows a large R as it is (no plausibility cap)', () => {
    render(<StatementPanel ctx={ctx({ ...withR, avgR: 64.5 } as AggregatedStats)} />);
    expect(screen.getByText('+64.50R')).toBeInTheDocument();
  });
});

describe('realised R on the Risk tab (A-03)', () => {
  it('replaces "Planned R:R" with the average R and its sample', () => {
    inRouter(<RiskTab ctx={ctx(withR)} />);
    const strip = screen.getByLabelText('Risk statistics');
    expect(within(strip).getByRole('button', { name: 'Avg R' })).toBeInTheDocument();
    expect(within(strip).getByText('+0.22R')).toBeInTheDocument();
    expect(within(strip).getByTitle('45 trades with a stop · planned R:R 2.00')).toHaveTextContent('45 trades with a stop · planned R:R 2.00');
    expect(within(strip).queryByText('Planned, not realised')).not.toBeInTheDocument();
  });

  it('keeps the planned figure, marked as a plan, for a server without realised R', () => {
    inRouter(<RiskTab ctx={ctx(base)} />);
    expect(screen.getByRole('button', { name: 'Planned R:R' })).toBeInTheDocument();
    expect(screen.getByText('Planned, not realised')).toBeInTheDocument();
  });
});

describe('Behaviour: Net P&L and the comparison with untagged trades (A-08)', () => {
  const stats = {
    ...withR,
    mistakesDistribution: { FOMO: { count: 5, totalPnl: -420, rCount: 5, avgR: -1.18 }, Late: { count: 2, totalPnl: -30, rCount: 0, avgR: null } },
    noMistakeTrades: { count: 40, totalPnl: 900, rCount: 30, avgR: -0.62 },
    brokenRulesDistribution: { r1: { count: 3, totalPnl: -90, rCount: 3, avgR: -2 } },
    noBrokenRuleTrades: { count: 65, totalPnl: 3294.1, rCount: 42, avgR: 0.4 },
  } as unknown as AggregatedStats;

  it('names the column Net P&L and shows each tag against the untagged trades in R with the sample band', () => {
    inRouter(<BehaviourTab ctx={ctx(stats)} />);
    const mistakes = screen.getByRole('table', { name: 'Mistakes' });
    expect(within(mistakes).getByRole('columnheader', { name: 'Net P&L' })).toBeInTheDocument();
    expect(within(mistakes).queryByRole('columnheader', { name: 'Cost' })).not.toBeInTheDocument();
    expect(within(mistakes).getByRole('columnheader', { name: 'vs untagged' })).toBeInTheDocument();
    const fomo = within(mistakes).getByText('FOMO').closest('tr')!;
    expect(within(fomo).getByText('−$420.00')).toBeInTheDocument();
    expect(within(fomo).getByText('−1.18R')).toBeInTheDocument();
    expect(within(fomo).getByText('−0.62R')).toBeInTheDocument();
    expect(within(fomo).getByText('5 with a stop · too few to tell')).toBeInTheDocument();
    expect(within(within(mistakes).getByText('Late').closest('tr')!).getByText('No trade with a stop')).toBeInTheDocument();
    expect(screen.getByText(/against trades with no mistake tag \(−0\.62R over 30 with a stop\)/)).toBeInTheDocument();
  });

  it('compares broken rules with the trades that broke none', () => {
    inRouter(<BehaviourTab ctx={ctx(stats)} />);
    const rules = screen.getByRole('table', { name: 'Broken rules' });
    const row = within(rules).getByText('No revenge trades').closest('tr')!;
    expect(within(row).getByText('−2.00R')).toBeInTheDocument();
    expect(within(row).getByText('+0.40R')).toBeInTheDocument();
    expect(screen.getByText(/against trades that broke no rule/)).toBeInTheDocument();
  });

  it('Free plans see neither the money nor the comparison', () => {
    inRouter(<BehaviourTab ctx={ctx(stats, { pro: false })} />);
    const mistakes = screen.getByRole('table', { name: 'Mistakes' });
    expect(within(mistakes).getByRole('columnheader', { name: 'Net P&L' })).toBeInTheDocument();
    expect(within(mistakes).queryByRole('columnheader', { name: 'vs untagged' })).not.toBeInTheDocument();
    expect(within(mistakes).queryByText('−$420.00')).not.toBeInTheDocument();
    expect(within(mistakes).queryByText('−1.18R')).not.toBeInTheDocument();
    expect(within(mistakes).getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('draws no comparison when the server sends no R per tag', () => {
    inRouter(<BehaviourTab ctx={ctx({ ...withR, mistakesDistribution: { FOMO: { count: 5, totalPnl: -420 } } } as unknown as AggregatedStats)} />);
    expect(screen.queryByRole('columnheader', { name: 'vs untagged' })).not.toBeInTheDocument();
    expect(screen.getByText('−$420.00')).toBeInTheDocument();
  });
});
