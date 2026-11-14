import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekTimeline } from '../WeekTimeline';
import { YearView, type YearMonth } from '../YearView';
import { buildMonth } from '@/lib/calendar';
import type { Trade, TradingAccount } from '@/types/trade';

const accounts = new Map([['usd', { id: 'usd', currency: 'USD', name: 'U' } as TradingAccount]]);
const t = (id: string, symbol: string, entry: string, exit: string, pnl: number, over: Partial<Trade> = {}): Trade =>
  ({ id, symbol, direction: 'LONG', entryDate: entry, exitDate: exit, pnl, accountId: 'usd', outcome: 'TP', entryPrice: 100, exitPrice: 101, stopLoss: 99, ...over }) as Trade;

const trades = [
  t('1', 'US30', '2026-11-02T21:00:00', '2026-11-02T22:00:00', -48, { direction: 'SHORT', brokenRuleIds: ['r'] }),
  t('2', 'XAUUSD', '2026-11-04T09:15:00', '2026-11-04T09:45:00', 5.8),
  t('3', 'EURUSD', '2026-11-04T14:30:00', '2026-11-04T16:15:00', 120),
  t('4', 'NAS100', '2026-11-04T14:40:00', '2026-11-04T15:10:00', -10),
  t('5', 'GBPUSD', '2026-11-07T10:00:00', '2026-11-07T11:00:00', 30),
];
const nov = buildMonth(trades, new Date(2026, 10, 1), accounts);
const week = nov.weeks.find((w) => w.days.some((d) => d.key === '2026-11-04'))!;

function week_(over: Partial<React.ComponentProps<typeof WeekTimeline>> = {}) {
  const h = { onOpenDay: vi.fn(), onOpenTrade: vi.fn() };
  render(<WeekTimeline week={week} accountMap={accounts} openKey={null} todayKey="2026-11-11" isMobile={false} {...h} {...over} />);
  return h;
}

describe('WeekTimeline', () => {
  it('has a column per weekday, and a weekend column only when it has trades', () => {
    week_();
    for (const d of ['Mon 2', 'Tue 3', 'Wed 4', 'Thu 5', 'Fri 6', 'Sat 7']) expect(screen.getByRole('button', { name: d })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sun 8' })).not.toBeInTheDocument();
  });

  it('names each block with day, time span, symbol, side, result and flags', () => {
    week_();
    expect(screen.getByRole('button', { name: 'EURUSD +$120.00, long, Wednesday 14:30 to 16:15' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'US30 −$48.00, short, Monday 21:00 to 22:00, rule broken' })).toBeInTheDocument();
  });

  it('opens a trade from its block and a day from its header', async () => {
    const user = userEvent.setup();
    const h = week_();
    await user.click(screen.getByRole('button', { name: /^EURUSD .*, long,/ }));
    expect(h.onOpenTrade).toHaveBeenCalledWith('3');
    await user.click(screen.getByRole('button', { name: 'Wed 4' }));
    expect(h.onOpenDay).toHaveBeenCalledWith('2026-11-04');
  });

  it('shows the net per day and the week figures', () => {
    week_();
    const group = screen.getByRole('group', { name: 'Wednesday 4 November, 3 trades' });
    expect(group).toBeInTheDocument();
    expect(screen.getByText('+$115.80')).toBeInTheDocument();
    expect(screen.getByText(/Week/)).toBeInTheDocument();
    expect(screen.getByText(/· \d+ trades? ·/)).toBeInTheDocument();
  });

  it('says there are no trades instead of zero counts on an empty week', () => {
    const empty = buildMonth([], new Date(2026, 10, 1), accounts).weeks[1];
    week_({ week: empty });
    expect(screen.getByText('No trades this week.')).toBeInTheDocument();
    expect(screen.queryByText(/· 0 ·/)).toBeNull();
  });

  it('shows one day at a time on a phone, with day chips', async () => {
    const user = userEvent.setup();
    week_({ isMobile: true, todayKey: '2026-11-04' });
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(screen.getByRole('group')).toHaveAccessibleName(/Wednesday 4 November/);
    // The name starts with the visible text (M 2) so voice users can say what they see (WCAG 2.5.3).
    await user.click(screen.getByRole('button', { name: 'M 2, Monday 2 November' }));
    expect(screen.getByRole('group')).toHaveAccessibleName(/Monday 2 November/);
    for (const chip of within(screen.getByRole('list', { name: 'Days of the week' })).getAllByRole('button')) expect(chip.className).toMatch(/h-11/);
  });
});

describe('YearView', () => {
  const months: YearMonth[] = Array.from({ length: 12 }, (_, m) => {
    const date = new Date(2026, m, 1);
    return { key: `2026-${String(m + 1).padStart(2, '0')}`, date, model: buildMonth(trades, date, accounts) };
  });
  const setup = (over: Partial<React.ComponentProps<typeof YearView>> = {}) => {
    const h = { onOpenMonth: vi.fn(), onOpenDay: vi.fn() };
    render(<YearView months={months} year={2026} metric="pnl" loading={false} capped={false} {...h} {...over} />);
    return h;
  };

  it('draws twelve mini months with a square per day and the exact figures in a table beside them', () => {
    setup();
    expect(within(screen.getByRole('group', { name: 'Months of 2026' })).getAllByRole('region').length).toBe(12);
    const nov = screen.getByRole('region', { name: 'November 2026' });
    expect(within(nov).getAllByRole('button')).toHaveLength(31);
    const table = screen.getByRole('table', { name: 'Months of 2026' });
    const row = within(table).getAllByRole('row').find((r) => r.textContent?.startsWith('November'))!;
    expect(row).toHaveTextContent('+$97.80');
    expect(row).toHaveTextContent('3');
  });

  it('has one tab stop per month and names each day square in full', () => {
    setup();
    const nov = screen.getByRole('region', { name: 'November 2026' });
    const squares = within(nov).getAllByRole('button').filter((b) => b.tabIndex === -1);
    expect(squares).toHaveLength(30);
    expect(within(nov).getByRole('button', { name: 'Wednesday 4 November, net +$115.80, 3 trades, 2 wins' })).toBeInTheDocument();
    expect(within(nov).getByRole('button', { name: /November 2026, 5 trades. Open the month/ }).tabIndex).toBe(0);
  });

  it('counts one trade in the singular in the month button name', () => {
    const one: YearMonth[] = [{ key: '2026-11', date: new Date(2026, 10, 1), model: buildMonth([trades[0]], new Date(2026, 10, 1), accounts) }];
    render(<YearView months={one} year={2026} metric="pnl" loading={false} capped={false} onOpenMonth={vi.fn()} onOpenDay={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'November 2026, 1 trade. Open the month' })).toBeInTheDocument();
  });

  it('opens a month from its name or table row and a day from its square', async () => {
    const user = userEvent.setup();
    const h = setup();
    const nov = screen.getByRole('region', { name: 'November 2026' });
    await user.click(within(nov).getByRole('button', { name: /Open the month/ }));
    expect(h.onOpenMonth).toHaveBeenCalledWith('2026-11');
    await user.click(within(nov).getByRole('button', { name: /Wednesday 4 November/ }));
    expect(h.onOpenDay).toHaveBeenCalledWith('2026-11-04');
  });

  it('shows a skeleton while loading and notes the ceiling', () => {
    const { unmount } = render(<YearView months={[]} year={2026} metric="pnl" loading capped={false} onOpenMonth={vi.fn()} onOpenDay={vi.fn()} />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    unmount();
    setup({ capped: true });
    expect(screen.getByText(/newest 5,000 trades/)).toBeInTheDocument();
  });
});
