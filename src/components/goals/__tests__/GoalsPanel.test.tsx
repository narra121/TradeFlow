import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalsPanel, type Track } from '../GoalsPanel';
import { periodOf, type Glyph, type GoalType } from '../goalMath';

const week = periodOf('weekly', new Date(2026, 10, 11));
const strip = (g: Glyph[]) => g.map((glyph, i) => ({ period: periodOf('weekly', new Date(2026, 9, 5 + i * 7)), glyph }));
const history = { profit: strip(['met', 'missed', 'met', 'met', 'none', 'met', 'met', 'met']), winRate: strip(Array(8).fill('none')), maxDrawdown: strip(Array(8).fill('met')), maxTrades: strip(Array(8).fill('none')) } as Record<GoalType, ReturnType<typeof strip>>;

const tracks: Track[] = [
  { type: 'profit', current: 380, target: 500, isDefault: false, tradeCount: 12 },
  { type: 'winRate', current: 58.3, target: 65, isDefault: false, tradeCount: 12 },
  { type: 'maxDrawdown', current: 1.2, target: 3, isDefault: false, tradeCount: 12 },
  { type: 'maxTrades', current: 5, target: 8, isDefault: true, tradeCount: 12 },
];

function setup(over: Partial<React.ComponentProps<typeof GoalsPanel>> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<GoalsPanel tracks={tracks} period={week} live readOnly={false} currency="USD" history={history} historyLoading={false} onSave={onSave} {...over} />);
  return { onSave };
}

describe('GoalsPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 11, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('shows each goal as a named progress bar with the figures spoken', () => {
    setup();
    const bar = screen.getByRole('progressbar', { name: 'Profit target' });
    expect(bar).toHaveAttribute('aria-valuetext', '$380.00 of $500.00, On pace · $120.00 to go');
    expect(screen.getByText('On pace · $120.00 to go')).toBeInTheDocument();
    expect(screen.getByText('Below target by 6.7 pts')).toBeInTheDocument();
    expect(screen.getByText('Within limit')).toBeInTheDocument();
    expect(screen.getByText(/58\.3% of 65\.0% · 12 trades/)).toBeInTheDocument();
  });

  it('says a drawdown limit needs a starting balance instead of showing a percentage of nothing (X-016)', () => {
    setup({ tracks: tracks.map((t) => (t.type === 'maxDrawdown' ? { ...t, current: 99.8, unavailable: 'Set a starting balance on the account to track drawdown.' } : t)) });
    expect(screen.getByText('Set a starting balance on the account to track drawdown.')).toBeInTheDocument();
    expect(screen.queryByText(/99\.8/)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Max drawdown — limit target' })).not.toBeInTheDocument();
    expect(screen.queryByText('Within limit')).not.toBeInTheDocument();
  });

  it('gives a default target no verdict and no history strip', () => {
    setup();
    expect(screen.getByText('Default — set your own')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Max trades — limit, last 8 weeks/ })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: /Profit target, last 8 weeks/ })).toBeInTheDocument();
  });

  it('names every history cell and the streak', () => {
    setup();
    const strips = screen.getByRole('list', { name: 'Max drawdown — limit, last 8 weeks' });
    expect(within(strips).getAllByRole('listitem')).toHaveLength(8);
    expect(within(strips).getAllByText(/within the limit/)).toHaveLength(8);
    expect(screen.getByText('Within the limit 8 weeks in a row')).toBeInTheDocument();
    expect(screen.getByText('Met 3 weeks in a row')).toBeInTheDocument();
  });

  it('edits in place: an invalid number stays open with the error under the field', async () => {
    const { onSave } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit Profit target' }));
    const input = screen.getByRole('textbox', { name: 'Profit target' });
    await user.clear(input);
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a valid target with Enter and closes the field', async () => {
    const { onSave } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit Win rate' }));
    const input = screen.getByRole('textbox', { name: 'Win rate' });
    await user.clear(input);
    await user.type(input, '70{Enter}');
    expect(onSave).toHaveBeenCalledWith('winRate', 70);
    await vi.waitFor(() => expect(screen.queryByRole('textbox', { name: 'Win rate' })).not.toBeInTheDocument());
  });

  it('cancels with Escape', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit Max trades — limit' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', { name: 'Max trades — limit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Max trades — limit' })).toBeInTheDocument();
  });

  it('shows the failure of a save under the field and keeps it open', async () => {
    const user = userEvent.setup();
    setup({ onSave: vi.fn().mockRejectedValue({ status: 400, data: { message: 'A target must be above zero.' } }) });
    await user.click(screen.getByRole('button', { name: 'Edit Profit target' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A target must be above zero.');
    expect(alert).not.toHaveTextContent(/connection/i);
  });

  it('a save with no HTTP response says the connection failed', async () => {
    const user = userEvent.setup();
    setup({ onSave: vi.fn().mockRejectedValue({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }) });
    await user.click(screen.getByRole('button', { name: 'Edit Profit target' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/internet connection/i);
  });

  it('has no edit buttons in a past period', () => {
    setup({ readOnly: true, live: false });
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
  });
});
