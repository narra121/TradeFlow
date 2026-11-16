import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { DayPanel, WeekPanel } from '../DayPanel';
import { hoursOpen, netText, plural, winLoss } from '../dayText';
import { buildMonth } from '@/lib/calendar';
import type { Trade, TradingAccount } from '@/types/trade';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';

const accounts = new Map([['usd', { id: 'usd', currency: 'USD', name: 'U' } as TradingAccount]]);
const t = (id: string, symbol: string, entry: string, exit: string, pnl: number, over: Partial<Trade> = {}): Trade =>
  ({ id, symbol, direction: 'LONG', entryDate: entry, exitDate: exit, pnl, accountId: 'usd', outcome: pnl >= 0 ? 'TP' : 'SL', entryPrice: 100, exitPrice: 102, stopLoss: 99, ...over }) as Trade;
const trades = [t('1', 'XAUUSD', '2026-11-04T09:15:00', '2026-11-04T09:45:00', 5.8), t('2', 'EURUSD', '2026-11-04T14:30:00', '2026-11-04T16:15:00', 120, { brokenRuleIds: ['r'] })];
const model = buildMonth(trades, new Date(2026, 10, 1), accounts);
const all = model.weeks.flatMap((w) => w.days);
const day = all.find((d) => d.key === '2026-11-04')!;

function setup(over: Partial<React.ComponentProps<typeof DayPanel>> = {}) {
  const h = { onStepDay: vi.fn(), onClose: vi.fn(), onOpenTrade: vi.fn(), onAddTrade: vi.fn(), onOpenInTrades: vi.fn() };
  render(
    <Provider store={store}>
      <DayPanel day={day} accountMap={accounts} scope="ALL" notesSupported={false} notesReady {...h} {...over} />
    </Provider>,
  );
  return h;
}

describe('DayPanel', () => {
  it('has the pane header: day title, previous / next day, named close', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Wed 4 Nov 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close day' })).toBeInTheDocument();
  });

  it('summarises the day and lists its trades in time order with R and a rule-break mark', () => {
    setup();
    expect(screen.getByText(/2 trades · 2W · 100%/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Trades on 4 November' });
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('XAUUSD');
    expect(rows[1]).toHaveTextContent('EURUSD');
    expect(rows[1]).toHaveTextContent('! rule broken');
    // jsdom joins inline spans without spaces; browsers space the flex items.
    expect(rows[1]).toHaveAccessibleName(/^16:15\s?EURUSD\s?Long\s?! rule broken\s?\+\$120\.00\s?\+2\.00R, Wednesday$/);
  });

  it('draws a 24 hour strip with a text alternative', () => {
    setup();
    expect(screen.getByRole('img', { name: /Trades open by hour: 09:00 \(1\), 14:00 \(1\), 15:00 \(1\), 16:00 \(1\)/ })).toBeInTheDocument();
  });

  it('keeps the header focus rings inside the buttons, so the top of a phone screen never cuts them', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Close day' }).parentElement?.className).toMatch(/\[&_button:focus-visible\]:outline-offset-\[-2px\]/);
  });

  it('uses 44 px targets on touch screens for the pane buttons', () => {
    setup();
    for (const name of ['Previous day', 'Next day', 'Close day']) expect(screen.getByRole('button', { name }).className).toMatch(/pointer:coarse\)\]:h-11/);
    expect(screen.getByRole('button', { name: 'Add trade on this day' }).className).toMatch(/pointer:coarse\)\]:h-11/);
  });

  it('opens a trade, steps the day, adds a trade and opens the day in Trades', async () => {
    const user = userEvent.setup();
    const h = setup();
    const row = screen.getByRole('button', { name: /EURUSD\s?Long/ });
    // Named by its own text (WCAG 2.5.3): no aria-label, the arrow is hidden, the weekday is screen-reader text.
    expect(row).not.toHaveAttribute('aria-label');
    expect(row).toHaveAccessibleName(expect.not.stringMatching(/[↑↓]/));
    expect(row).toHaveAccessibleName(expect.stringMatching(/, \w+day$/));
    await user.click(row);
    expect(h.onOpenTrade).toHaveBeenCalledWith('2');
    await user.click(screen.getByRole('button', { name: 'Next day' }));
    expect(h.onStepDay).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Add trade on this day' }));
    expect(h.onAddTrade).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Open in Trades' }));
    expect(h.onOpenInTrades).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Close day' }));
    expect(h.onClose).toHaveBeenCalled();
  });

  it('says so for an empty day and still offers to add a trade', () => {
    setup({ day: all.find((d) => d.key === '2026-11-05')! });
    expect(screen.getByText('No trades on this day.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add trade on this day' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not draw the note block when the notes route is not available', () => {
    setup({ notesSupported: false });
    expect(screen.queryByText('Day note')).not.toBeInTheDocument();
  });
});

describe('WeekPanel', () => {
  it('groups the week’s trades by day and opens a day from its header', async () => {
    const user = userEvent.setup();
    const onOpenDay = vi.fn();
    const onOpenTrade = vi.fn();
    const week = model.weeks.find((w) => w.days.some((d) => d.key === '2026-11-04'))!;
    render(
      <Provider store={store}>
        <WeekPanel week={week} weekNumber={45} accountMap={accounts} onClose={vi.fn()} onOpenTrade={onOpenTrade} onOpenDay={onOpenDay} />
      </Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Week 45 · 2 Nov – 8 Nov 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Wed 4 Nov' }));
    expect(onOpenDay).toHaveBeenCalledWith('2026-11-04');
    await user.click(screen.getByRole('button', { name: /XAUUSD\s?Long/ }));
    expect(onOpenTrade).toHaveBeenCalledWith('1');
  });

  it('dates a row on the Settings time zone calendar, not the browser one', () => {
    patchUiState({ timeZone: 'America/Los_Angeles' }); // 02:00Z on 5 Nov is still Wednesday 4 Nov 18:00 there, Thursday in Asia and Europe
    try {
      const late = [t('9', 'EURUSD', '2026-11-05T01:00:00Z', '2026-11-05T02:00:00Z', 10)];
      const m = buildMonth(late, new Date(2026, 10, 1), accounts);
      const week = m.weeks.find((w) => w.days.some((d) => d.trades.length))!;
      render(
        <Provider store={store}>
          <WeekPanel week={week} weekNumber={45} accountMap={accounts} onClose={vi.fn()} onOpenTrade={vi.fn()} onOpenDay={vi.fn()} />
        </Provider>,
      );
      expect(screen.getByRole('button', { name: /EURUSD\s?Long/ })).toHaveAccessibleName(/, Wednesday$/);
    } finally {
      patchUiState({ timeZone: undefined });
      resetUiStateCache();
    }
  });
});

describe('helpers', () => {
  it('spans the hours between entry and exit and falls back to the entry hour', () => {
    expect(hoursOpen(trades[1])).toEqual([14, 15, 16]);
    expect(hoursOpen(t('x', 'A', '2026-11-04T09:15:00', '', 1, { exitDate: '' }))).toEqual([9]);
    expect(hoursOpen(t('y', 'A', '2026-11-03T22:00:00', '2026-11-04T01:00:00', 1))).toEqual([22, 23]);
  });
  it('writes wins and losses without a zero side', () => {
    expect(winLoss(2, 1)).toBe('2W 1L');
    expect(winLoss(0, 1)).toBe('1L');
    expect(winLoss(3, 0)).toBe('3W');
    expect(winLoss(0, 0)).toBe('0');
  });
  it('formats plurals and nets per currency', () => {
    expect(plural(1, 'trade')).toBe('1 trade');
    expect(plural(1204, 'trade')).toBe('1,204 trades');
    expect(netText([{ currency: 'USD', net: 5 }, { currency: 'INR', net: -3000 }])).toBe('+$5.00 · −₹3,000.00');
  });
});
