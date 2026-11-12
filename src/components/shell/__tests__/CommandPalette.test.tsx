import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';

vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO', currency: 'USD' }, { id: 'a2', name: 'Zerodha', currency: 'INR' }], setSelectedAccountId: vi.fn() }) }));

const TRADES = [
  { id: 't1', symbol: 'RELIANCE', pnl: -1476.84, accountId: 'a2', entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00' },
  { id: 't2', symbol: 'GBPJPY', pnl: 0.73, accountId: 'a1', entryDate: '2026-10-23T10:00:00', exitDate: '2026-10-23T11:00:00' },
] as never[];

import { CommandPalette } from '../CommandPalette';

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setup() {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CommandPalette open onOpenChange={vi.fn()} trades={TRADES} onShowShortcuts={vi.fn()} />
      </MemoryRouter>
    </Provider>,
  );
}

describe('CommandPalette', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('ResizeObserver', RO);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('offers screens, period, account and help commands', () => {
    setup();
    expect(screen.getByText('Go to Trades')).toBeInTheDocument();
    expect(screen.getByText('Period: Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Switch account: FTMO · USD')).toBeInTheDocument();
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
  });

  it('finds a screen by a synonym', async () => {
    setup();
    await userEvent.type(screen.getByRole('combobox'), 'upload');
    expect(screen.getByText('Import trades')).toBeInTheDocument();
    expect(screen.queryByText('Go to Calendar')).toBeNull();
  });

  it('lists the last run commands first when the query is empty', async () => {
    localStorage.setItem('tq.palette.recent', JSON.stringify(['go-/app/calendar']));
    setup();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getAllByText('Go to Calendar')).toHaveLength(2);
  });

  it('lists no trades before two characters are typed, then shows them with their currency and a day-first date', async () => {
    setup();
    expect(screen.queryByText('RELIANCE')).toBeNull();
    await userEvent.type(screen.getByRole('combobox'), 'rel');
    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    expect(screen.getByText(/04 Nov · −₹1,476\.84/)).toBeInTheDocument();
  });

  it('has Log out (found by "sign out"), settings sections, saved views and no Chat destination', async () => {
    setup();
    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(screen.getByText('Settings: Plan & billing')).toBeInTheDocument();
    expect(screen.getByText('Trades view: Needs journal')).toBeInTheDocument();
    expect(screen.queryByText('Go to Chat')).toBeNull();
    await userEvent.type(screen.getByRole('combobox'), 'sign out');
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('Log out with an unsaved trade draft asks first instead of logging out', async () => {
    sessionStorage.setItem('tq.draft.new', '{}');
    setup();
    await userEvent.click(screen.getByText('Log out'));
    expect(await screen.findByText('Log out and discard your unsaved trade?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
    sessionStorage.clear();
  });

  it('says what was searched and offers to search Trades when nothing matches', async () => {
    setup();
    await userEvent.type(screen.getByRole('combobox'), 'zzzqq');
    expect(await screen.findByText(/No results for “zzzqq”/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search trades for “zzzqq”/ })).toBeInTheDocument();
  });
});
