import { describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BreakdownExplorer } from '@/components/stats/BreakdownExplorer';
import { TimingGrid } from '../TimingGrid';
import { StatementPanel } from '../StatementPanel';
import { explorerCsv } from '../explorerCsv';
import { rowLink, type AnalyticsContext } from '../drill';
import { timingGrid } from '@/lib/analyticsRows';
import type { AggregatedStats } from '@/types/stats';

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}
const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="*"
          element={
            <>
              {ui}
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const rows = [
  { key: 'Breakout', name: 'Breakout', trades: 14, wins: 9, winRate: 64.3, net: 1240, avgR: 1.4, drill: 'Breakout' },
  { key: 'Reversal', name: 'Reversal', trades: 9, wins: 2, winRate: 22.2, net: -860, avgR: -0.7, drill: 'Reversal' },
  { key: 'Tiny', name: 'Tiny', trades: 2, wins: 1, winRate: 50, net: 10, avgR: 0.1, drill: 'Tiny' },
];

describe('BreakdownExplorer', () => {
  const explorer = (over: Partial<React.ComponentProps<typeof BreakdownExplorer>> = {}) => (
    <BreakdownExplorer dimension="Strategy" rows={rows} currency="USD" caption="Breakdown by strategy" rowHref={(r) => rowLink('strategy', r)} {...over} />
  );

  it('ranks by net P&L with a totals row and expectancy', () => {
    wrap(explorer());
    const body = screen.getAllByRole('row').slice(1);
    expect(within(body[0]).getByText('Breakout')).toBeInTheDocument();
    expect(within(body[body.length - 1]).getByText('Total')).toBeInTheDocument();
    expect(within(body[body.length - 1]).getByText('+$390.00')).toBeInTheDocument();
    expect(within(body[0]).getByText('+$88.57')).toBeInTheDocument();
  });

  it('greys a segment under five trades and says so', () => {
    wrap(explorer());
    expect(screen.getByText(/n < 5/)).toBeInTheDocument();
  });

  it('sorts by a header and exposes aria-sort', async () => {
    const user = userEvent.setup();
    wrap(explorer());
    const header = screen.getByRole('columnheader', { name: /Trades/ });
    expect(header).toHaveAttribute('aria-sort', 'none');
    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(within(screen.getAllByRole('row')[1]).getByText('Breakout')).toBeInTheDocument();
    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(within(screen.getAllByRole('row')[1]).getByText('Tiny')).toBeInTheDocument();
  });

  it('opens the trades of a row on Enter and from its link', async () => {
    const user = userEvent.setup();
    wrap(explorer());
    const row = screen.getByText('Reversal').closest('tr')!;
    row.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/app/tradelog?strategy=Reversal&src=analytics');
    expect(screen.getByRole('link', { name: 'Open 14 trades for Breakout in Trades' })).toHaveAttribute('href', '/app/tradelog?strategy=Breakout&src=analytics');
  });

  it('draws the avg R column only when the server sent it', () => {
    wrap(explorer({ rows: rows.map((r) => ({ key: r.key, name: r.name, trades: r.trades, wins: r.wins, winRate: r.winRate, net: r.net, drill: r.drill })) }));
    expect(screen.queryByRole('columnheader', { name: /Avg R/ })).not.toBeInTheDocument();
  });

  it('draws no link for a segment Trades cannot filter by', () => {
    wrap(explorer({ rows: [{ key: 'Unknown', name: 'No session', trades: 6, wins: 3, winRate: 50, net: 5, drill: null }] }));
    expect(screen.queryByRole('link', { name: /Open 6 trades/ })).not.toBeInTheDocument();
  });
});

describe('TimingGrid', () => {
  const grid = timingGrid([
    { day: 1, hour: 9, trades: 4, wins: 3, net: 50 },
    { day: 1, hour: 10, trades: 2, wins: 0, net: -20 },
  ])!;

  it('names every cell with value, count and win rate and states the zone', () => {
    wrap(<TimingGrid grid={grid} currency="USD" zone="UTC" />);
    // The name starts with the figure printed in the cell (WCAG 2.5.3).
    expect(screen.getByRole('link', { name: '50, Monday 09:00, net +$50.00, 4 trades, win rate 75%, too few trades to tell' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^−20, Monday 10:00/ })).toHaveTextContent(/^−20/);
    expect(screen.getByText(/^Times in UTC\./)).toBeInTheDocument();
  });

  it('greys every cell under 30 trades, never tints it, and says the grid is mostly noise (report §3.3 rule 4)', () => {
    const g = timingGrid([
      { day: 1, hour: 9, trades: 40, wins: 30, net: 500 },
      { day: 1, hour: 10, trades: 2, wins: 0, net: -20 },
    ])!;
    wrap(<TimingGrid grid={g} currency="USD" zone="UTC" />);
    expect(screen.getByRole('link', { name: /Monday 10:00/ }).className).toContain('bg-muted');
    expect(screen.getByRole('link', { name: /Monday 09:00/ }).className).not.toContain('bg-muted');
    expect(screen.getByRole('link', { name: /Monday 09:00/ })).not.toHaveAccessibleName(/too few/);
    expect(screen.getByText(/1 of 2 cells have under 30 trades and are greyed: at that size a cell's result is mostly noise\./)).toBeInTheDocument();
  });

  it('moves with the arrow keys using a roving tab stop', async () => {
    const user = userEvent.setup();
    wrap(<TimingGrid grid={grid} currency="USD" zone="UTC" />);
    const first = screen.getByRole('link', { name: /Monday 09:00/ });
    const second = screen.getByRole('link', { name: /Monday 10:00/ });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    act(() => first.focus());
    await user.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('tabindex', '0');
  });
});

describe('StatementPanel', () => {
  const stats = {
    totalTrades: 68, wins: 40, losses: 28, winRate: 58.8, totalPnl: 3204.1, expectancy: 47.12, profitFactor: 1.84, avgWin: 184.2, avgLoss: 121.4, bestTrade: 640, worstTrade: -350,
    avgRiskReward: 1.5, maxDrawdown: 4.2, consecutiveWins: 6, consecutiveLosses: 4,
  } as AggregatedStats;
  const ctx = (over: Partial<AnalyticsContext> = {}): AnalyticsContext => ({ stats, prevRange: null, multi: false, zone: 'UTC', currency: 'USD', pro: true, ...over });

  it('prints the figures in three columns with change against the previous period', () => {
    const prev = { ...stats, totalPnl: 2794.1, maxDrawdown: 4.8 } as AggregatedStats;
    render(<StatementPanel ctx={ctx({ prev, prevRange: { startDate: '', endDate: '', name: 'Oct', spokenName: 'October' } })} />);
    expect(screen.getByRole('region', { name: 'Performance' })).toBeInTheDocument();
    expect(screen.getByText('+$3,204.10')).toBeInTheDocument();
    expect(screen.getByText('up $410.00 versus October')).toBeInTheDocument();
    expect(screen.getByText('down 0.6 pts versus October, better')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planned R:R' })).toBeInTheDocument();
    expect(screen.getByText('−$121.40')).toBeInTheDocument();
  });

  it('says there is nothing to compare with when the previous period has no trades, and prints no change', () => {
    render(<StatementPanel ctx={ctx({ prevEmpty: true, prevRange: { startDate: '2026-04-17', endDate: '2026-07-31', name: 'previous period', spokenName: 'the previous period' } })} />);
    expect(screen.getByText('No trades in the previous period (17 Apr 2026 – 31 Jul 2026), so there is nothing to compare with.')).toBeInTheDocument();
    expect(screen.queryByText(/versus the previous period/)).not.toBeInTheDocument();
  });

  it('does not show the drawdown percentage when several currencies share the scope', () => {
    render(<StatementPanel ctx={ctx({ multi: true })} />);
    expect(screen.queryByText('4.2%')).not.toBeInTheDocument();
    expect(screen.getByText('+$3,204.10')).toBeInTheDocument();
  });

  it('does not show a drawdown percentage when an account has no starting balance (X-016)', () => {
    render(<StatementPanel ctx={ctx({ noBalance: true })} />);
    expect(screen.queryByText('4.2%')).not.toBeInTheDocument();
    expect(screen.getByText('+$3,204.10')).toBeInTheDocument();
  });
});

describe('explorerCsv', () => {
  it('writes raw values, no symbols, and a currency column', () => {
    const lines = explorerCsv('Strategy', rows.slice(0, 2), 'USD').split('\r\n');
    expect(lines[0]).toBe('Strategy,trades,wins,win_rate_pct,net_pnl,currency,expectancy,avg_r');
    expect(lines[1]).toBe('Breakout,14,9,64.3,1240.00,USD,88.57,1.4');
    expect(lines).toHaveLength(3);
  });

  it('guards formula cells', () => {
    const lines = explorerCsv('Symbol', [{ key: '=A', name: '=A', trades: 1, wins: 1, winRate: 100, net: 5 }], 'INR').split('\r\n');
    expect(lines[1].startsWith("'=A")).toBe(true);
  });
});

describe('rowLink', () => {
  it('opens Trades with the row value, "no strategy" via the missing filter, and nothing without a filter', () => {
    expect(rowLink('hour', { key: '14', name: '14:00', trades: 1, wins: 0, winRate: 0, net: 0, drill: '14' })).toBe('/app/tradelog?hour=14&src=analytics');
    expect(rowLink('hour', { key: '14', name: '14:00', trades: 1, wins: 0, winRate: 0, net: 0, drill: '14' }, 'Asia/Kolkata')).toBe('/app/tradelog?hour=14&zone=Asia%2FKolkata&src=analytics');
    expect(rowLink('session', { key: 'London', name: 'London', trades: 1, wins: 0, winRate: 0, net: 0, drill: 'London' }, 'Asia/Kolkata')).toBe('/app/tradelog?session=London&src=analytics');
    expect(rowLink('strategy', { key: 'Unknown', name: 'No strategy', trades: 1, wins: 0, winRate: 0, net: 0, drill: '' })).toBe('/app/tradelog?missing=strategy&src=analytics');
    expect(rowLink('session', { key: 'Unknown', name: 'No session', trades: 1, wins: 0, winRate: 0, net: 0, drill: null })).toBeNull();
  });
});
