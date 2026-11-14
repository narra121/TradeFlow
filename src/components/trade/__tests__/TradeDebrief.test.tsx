import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TradeDebrief as Debrief } from '@/types/trade';

const query = vi.hoisted(() => vi.fn());
vi.mock('@/store/api', () => ({ useGetTradeDebriefQuery: (id: string) => query(id) }));

import { TradeDebrief } from '../TradeDebrief';

const debrief = (over: Partial<Debrief> = {}): Debrief => ({
  tradeId: 't1',
  checks: [
    { id: 'stopSet', label: 'A stop was set', state: 'met', detail: 'Stop at 1.095.' },
    { id: 'riskWithinUsual', label: 'Risk within 1.5× your median', state: 'notMet', detail: 'Risked $420.00, 2.1× your median of $200.00 over the last 90 days.' },
    { id: 'lossKeptOrTarget', label: 'Loss kept to the stop, or target reached', state: 'met', detail: 'Lost -1.00R, within the stop.' },
    { id: 'notAfterLoss', label: 'Not opened within 15 minutes of a loss', state: 'met', detail: 'No losing trade closed shortly before it.' },
    { id: 'withinTradeCap', label: 'Trade number inside your daily cap', state: 'notApplicable', detail: 'No daily trade cap is set as your focus.' },
    { id: 'setupHistory', label: 'Setup has enough history to judge', state: 'met', detail: '34 trades of "Breakout" in the last 90 days: enough to judge it.' },
  ],
  metCount: 4,
  total: 5,
  currency: 'USD',
  timeZone: 'America/New_York',
  ...over,
});

const ready = (data: Debrief) => ({ data, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });

describe('TradeDebrief', () => {
  beforeEach(() => query.mockReset());

  it('asks for the debrief of its trade and shows a busy state while it loads', () => {
    query.mockReturnValue({ isLoading: true, isFetching: true, isError: false, refetch: vi.fn() });
    render(<TradeDebrief tradeId="t1" />);
    expect(query).toHaveBeenCalledWith('t1');
    expect(screen.getByLabelText('Loading the debrief')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the count, each check as met or not met with its figures, and the ones that do not apply apart', () => {
    query.mockReturnValue(ready(debrief()));
    render(<TradeDebrief tradeId="t1" />);
    expect(screen.getByText('4 of 5 checks met')).toBeInTheDocument();
    const [counted, skipped] = screen.getAllByRole('list');
    expect(within(counted).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)).toEqual([
      'Met: A stop was set',
      'Not met: Risk within 1.5× your median',
      'Met: Loss kept to the stop, or target reached',
      'Met: Not opened within 15 minutes of a loss',
      'Met: Setup has enough history to judge',
    ]);
    expect(within(counted).getByText('Risked $420.00, 2.1× your median of $200.00 over the last 90 days.')).toBeInTheDocument();
    expect(within(skipped).getByText('No daily trade cap is set as your focus.')).toBeInTheDocument();
    expect(screen.getByText('Not counted')).toBeInTheDocument();
  });

  it('says "1 of 1 check met" in the singular', () => {
    const one = debrief();
    one.checks = one.checks.map((c) => (c.id === 'stopSet' ? c : { ...c, state: 'notApplicable' as const }));
    query.mockReturnValue(ready({ ...one, metCount: 1, total: 1 }));
    render(<TradeDebrief tradeId="t1" />);
    expect(screen.getByText('1 of 1 check met')).toBeInTheDocument();
  });

  it('shows the model sentences only when the server sent some', () => {
    query.mockReturnValue(ready(debrief({ sentences: ['You wrote "late entry"; this trade opened 8 minutes after a loss.'] })));
    const { unmount } = render(<TradeDebrief tradeId="t1" />);
    expect(screen.getByText('You wrote "late entry"; this trade opened 8 minutes after a loss.')).toBeInTheDocument();
    unmount();

    query.mockReturnValue(ready(debrief()));
    render(<TradeDebrief tradeId="t1" />);
    expect(screen.queryByText(/You wrote/)).toBeNull();
  });

  it('when no check applies it says so instead of "0 of 0"', () => {
    const none = debrief();
    none.checks = none.checks.map((c) => ({ ...c, state: 'notApplicable' as const }));
    query.mockReturnValue(ready({ ...none, metCount: 0, total: 0 }));
    render(<TradeDebrief tradeId="t1" />);
    expect(screen.getByText('None of the checks apply to this trade yet. The reasons are below.')).toBeInTheDocument();
    expect(screen.queryByText(/0 of 0/)).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('shows the server message on an error and retries', async () => {
    const refetch = vi.fn();
    query.mockReturnValue({ isLoading: false, isFetching: false, isError: true, error: { status: 404, data: { message: 'Trade not found.' } }, refetch });
    render(<TradeDebrief tradeId="t1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the debrief');
    expect(screen.getByRole('alert')).toHaveTextContent('Trade not found.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
