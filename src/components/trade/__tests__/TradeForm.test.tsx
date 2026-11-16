import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const online = { value: true };
vi.mock('@/hooks/useOnline', () => ({ useOnline: () => online.value }));
vi.mock('@/hooks/useAccounts', async (orig) => ({ ...(await orig<object>()), useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO', currency: 'USD', status: 'active' }], selectedAccountId: null }) }));
vi.mock('@/hooks/useSavedOptions', () => ({
  useSavedOptions: () => ({ options: { symbols: [], strategies: [], sessions: [], marketConditions: [], newsEvents: [], mistakes: [], tags: [], timeframes: [] }, addSymbol: vi.fn(), addStrategy: vi.fn(), addSession: vi.fn(), addMarketCondition: vi.fn(), addMistake: vi.fn(), addTag: vi.fn(), addTimeframe: vi.fn(), removeTimeframe: vi.fn() }),
}));
vi.mock('@/hooks/useTradingRules', () => ({ useTradingRules: () => ({ rules: [], loading: false }) }));
vi.mock('@/store/api', () => ({ useCreateTradeMutation: () => [vi.fn()], useUpdateTradeMutation: () => [vi.fn()] }));
vi.mock('@/store/hooks', () => ({ useAppSelector: () => ({ user: null }), useAppDispatch: () => vi.fn() }));

import { TradeForm } from '../TradeForm';

const setup = () =>
  render(
    <MemoryRouter>
      <TradeForm mode="new" defaultAccountIds={['a1']} onSaved={vi.fn()} onCancel={vi.fn()} />
    </MemoryRouter>,
  );

const unload = () => {
  const e = new Event('beforeunload', { cancelable: true });
  act(() => {
    window.dispatchEvent(e);
  });
  return e;
};

describe('TradeForm', () => {
  beforeEach(() => {
    sessionStorage.clear();
    online.value = true;
  });

  it('marks the symbol example as an example and shows no empty R in the footer of an empty form', () => {
    setup();
    expect(screen.getByLabelText(/^Symbol/)).toHaveAttribute('placeholder', 'e.g. EURUSD');
    const footer = screen.getByText(/^Net —$/).parentElement as HTMLElement;
    expect(footer.textContent).not.toMatch(/–/);
  });

  it('calls a win that closed short of its target Partial, and TP hit once the exit reaches it', () => {
    setup();
    const set = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    set(/^Entry price/, '100');
    set(/^Take profit/, '120');
    set(/^Exit price/, '110');
    set(/^Net P&L/, '50');
    const outcome = screen.getByRole('radiogroup', { name: 'Outcome' });
    expect(within(outcome).getByRole('radio', { name: 'Partial' })).toBeChecked();
    set(/^Exit price/, '120');
    expect(within(outcome).getByRole('radio', { name: 'TP hit' })).toBeChecked();
    set(/^Net P&L/, '-5');
    expect(within(outcome).getByRole('radio', { name: 'SL hit' })).toBeChecked();
  });

  it('leaving one field empty flags only that field, not every untouched one', () => {
    setup();
    const closed = screen.getByLabelText(/^Closed/);
    fireEvent.change(closed, { target: { value: '' } });
    fireEvent.blur(closed);
    expect(screen.getByLabelText(/^Symbol/)).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Entry price/)).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/fields need attention/)).toBeNull();
    // The cleared date itself is flagged on that same blur (its text is committed in the blur).
    expect(closed).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('1 field needs attention')).toBeInTheDocument();
  });

  it('does not stop the tab from closing while nothing was typed', () => {
    setup();
    expect(unload().defaultPrevented).toBe(false);
  });

  it('asks before the tab closes once the form has unsaved edits', async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/Entry price/), '1.1');
    expect(unload().defaultPrevented).toBe(true);
  });

  it('disables saving while offline and says why', () => {
    online.value = false;
    setup();
    expect(screen.getByRole('button', { name: 'Save trade' })).toBeDisabled();
    expect(screen.getByText('Offline: reconnect to save.')).toBeInTheDocument();
  });
});

describe('TradeForm dates (R-fe-app-013)', () => {
  it('shows Opened and Closed as typed 24-hour text and parses what is typed on blur', async () => {
    setup();
    const opened = screen.getByLabelText(/^Opened/);
    expect(opened).toHaveAttribute('placeholder', 'e.g. 4 Nov 2026, 14:30');
    await userEvent.type(opened, '4 Nov 2026, 14:30');
    await userEvent.tab();
    expect(opened).toHaveValue('04 Nov 2026, 14:30'); // typed unpadded, shown in the one date format
  });

  it('flags text that is not a date and keeps it for correction', async () => {
    setup();
    const opened = screen.getByLabelText(/^Opened/);
    await userEvent.type(opened, '31 Feb 2026');
    await userEvent.tab();
    expect(opened).toHaveAttribute('aria-invalid', 'true');
    expect(opened).toHaveValue('31 Feb 2026');
  });

  it('Now fills Closed with the current time', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Now' }));
    expect((screen.getByLabelText(/^Closed/) as HTMLInputElement).value).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/);
  });
});
