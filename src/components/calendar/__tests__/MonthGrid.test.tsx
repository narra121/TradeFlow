import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthGrid } from '../MonthGrid';
import { cellName, compactMoney, metricText, zoneName } from '../cellText';
import { buildMonth } from '@/lib/calendar';
import { patchUiState } from '@/hooks/useUiState';
import type { Trade, TradingAccount } from '@/types/trade';

const accounts = new Map([['usd', { id: 'usd', currency: 'USD', name: 'U' } as TradingAccount]]);
const t = (id: string, exit: string, pnl: number, over: Partial<Trade> = {}): Trade =>
  ({ id, symbol: 'X', direction: 'LONG', entryDate: exit, exitDate: exit, pnl, accountId: 'usd', outcome: pnl >= 0 ? 'TP' : 'SL', entryPrice: 100, exitPrice: 101, stopLoss: 99, ...over }) as Trade;
const nov = new Date(2026, 10, 1);
const trades = [t('1', '2026-11-02T10:00:00', -48, { brokenRuleIds: ['r'] }), t('2', '2026-11-04T10:00:00', 64), t('3', '2026-11-04T12:00:00', 61.8), t('4', '2026-11-06T10:00:00', 1400)];

function setup(over: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  const h = { onOpenDay: vi.fn(), onOpenWeek: vi.fn(), onPageMonth: vi.fn() };
  const model = buildMonth(trades, nov, accounts);
  render(<MonthGrid model={model} metric="pnl" month={nov} openKey={null} openWeek={null} noteDays={new Set(['2026-11-04'])} todayKey="2026-11-11" {...h} {...over} />);
  return h;
}

describe('MonthGrid', () => {
  it('is a grid of Monday-first columns with a week column', () => {
    setup();
    expect(screen.getByRole('grid', { name: 'Calendar, November 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Week']);
  });

  it('names a day cell with its net, trades, wins, rule breaks and note', () => {
    setup();
    expect(screen.getByRole('gridcell', { name: 'Wednesday 4 November, net +$125.80, 2 trades, 2 wins, has a note' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Monday 2 November, net −$48.00, 1 trade, 0 wins, 1 trade with a broken rule' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Thursday 5 November, no trades' })).toBeInTheDocument();
  });

  it('prints a compact signed amount and the exact value stays in the name', () => {
    setup();
    expect(screen.getByRole('gridcell', { name: /Friday 6 November, net \+\$1,400\.00/ })).toHaveTextContent('+$1.4k');
  });

  it('marks a rule-broken day and a day with a note without relying on colour', () => {
    setup();
    expect(screen.getByRole('gridcell', { name: /Monday 2 November/ })).toHaveTextContent('!');
  });

  it('keeps days outside the month as plain, unfocusable dates', () => {
    setup();
    const outside = screen.getAllByText('28').find((el) => el.closest('[aria-hidden="true"]'));
    expect(outside).toBeDefined();
    expect(document.querySelectorAll('[data-day]').length).toBe(30);
  });

  it('opens a day with Enter on a focused cell and has one tab stop', async () => {
    const user = userEvent.setup();
    const h = setup();
    const stops = [...document.querySelectorAll<HTMLElement>('[data-day]')].filter((el) => el.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0].dataset.day).toBe('2026-11-11');
    await user.tab();
    await user.tab();
    stops[0].focus();
    await user.keyboard('{Enter}');
    expect(h.onOpenDay).toHaveBeenCalledWith('2026-11-11');
  });

  it('moves with arrows, Home, End and pages the month with PageUp / PageDown', async () => {
    const user = userEvent.setup();
    const h = setup();
    const cell = (key: string) => document.querySelector<HTMLElement>(`[data-day="${key}"]`)!;
    cell('2026-11-11').focus();
    await user.keyboard('{ArrowRight}');
    expect(cell('2026-11-12')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(cell('2026-11-19')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(cell('2026-11-16')).toHaveFocus();
    await user.keyboard('{End}');
    expect(cell('2026-11-22')).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(h.onPageMonth).toHaveBeenLastCalledWith(1, 22);
    await user.keyboard('{PageUp}');
    expect(h.onPageMonth).toHaveBeenLastCalledWith(-1, 22);
  });

  it('prints the result in plain foreground on a tint and coloured only where nothing is tinted', () => {
    setup();
    const tinted = screen.getByRole('gridcell', { name: /Friday 6 November/ });
    expect(tinted.className).toMatch(/bg-tint-profit-3/);
    expect(tinted.querySelector('.font-mono')?.className).toMatch(/text-foreground/);
    expect(tinted.querySelector('.font-mono')?.className).not.toMatch(/text-profit/);
  });

  it('opens a week from its cell and disables a week without trades', async () => {
    const user = userEvent.setup();
    const h = setup();
    await user.click(screen.getByRole('button', { name: /^Week 45, 4 trades/ }));
    expect(h.onOpenWeek).toHaveBeenCalledWith('2026-11-02');
    expect(screen.getByRole('button', { name: /^Week 47, 0 trades/ })).toBeDisabled();
  });

  it('marks today and the open day', () => {
    setup({ openKey: '2026-11-04' });
    expect(screen.getByRole('gridcell', { name: /Wednesday 11 November/ })).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('gridcell', { name: /Wednesday 4 November/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('colours and prints by the chosen metric', () => {
    setup({ metric: 'trades' });
    expect(screen.getByRole('gridcell', { name: /Wednesday 4 November/ })).toHaveTextContent('2 trades');
    expect(screen.getByRole('gridcell', { name: /Wednesday 4 November/ }).className).toMatch(/bg-foreground-soft/);
  });
});

describe('cell helpers', () => {
  const model = buildMonth(trades, nov, accounts);
  const day = (key: string) => model.weeks.flatMap((w) => w.days).find((d) => d.key === key)!;
  it('prints each metric', () => {
    expect(metricText(day('2026-11-04'), 'pnl')).toBe('+$126');
    expect(metricText(day('2026-11-04'), 'r')).toBe('+2.00R');
    expect(metricText(day('2026-11-04'), 'win')).toBe('100%');
    expect(metricText(day('2026-11-05'), 'pnl')).toBeNull();
  });
  it('prints small amounts whole and compacts only from 1,000', () => {
    expect(compactMoney(64.4, 'USD')).toBe('+$64');
    expect(compactMoney(-13.2, 'INR')).toBe('−₹13');
    expect(compactMoney(1400, 'USD')).toBe('+$1.4k');
  });
  it('names the zone the app shows times in (the Settings preference), under its canonical name', () => {
    patchUiState({ timeZone: 'Asia/Calcutta' });
    expect(zoneName()).toBe('Asia/Kolkata');
    patchUiState({ timeZone: 'UTC' });
    expect(zoneName()).toBe('UTC');
    patchUiState({ timeZone: '' });
  });
  it('names an empty day with a note', () => {
    expect(cellName(day('2026-11-05'), true)).toBe('Thursday 5 November, no trades, has a note');
  });
});
