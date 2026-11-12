import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteAccountDialog } from '../DeleteAccountDialog';
import type { TradingAccount } from '@/types/trade';

const account = { id: 'a1', name: 'FTMO 100K', status: 'active' } as TradingAccount;

function setup(over: Partial<React.ComponentProps<typeof DeleteAccountDialog>> = {}) {
  const h = { onCancel: vi.fn(), onMarkInactive: vi.fn(), onConfirm: vi.fn() };
  render(<DeleteAccountDialog account={account} tradeCount={41} busy={false} {...h} {...over} />);
  return h;
}

describe('DeleteAccountDialog', () => {
  it('says how many trades go with the account and puts focus on Cancel', () => {
    setup();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete FTMO 100K?');
    expect(screen.getByText(/permanently deletes the account and its 41 trades/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('offers Mark inactive instead', async () => {
    const h = setup();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mark inactive instead' }));
    expect(h.onMarkInactive).toHaveBeenCalled();
  });

  it('does not offer it for an account that is already inactive', () => {
    setup({ account: { ...account, status: 'inactive' } });
    expect(screen.queryByRole('button', { name: 'Mark inactive instead' })).not.toBeInTheDocument();
  });

  it('keeps Delete disabled until the name is typed, whatever the case', async () => {
    const user = userEvent.setup();
    const h = setup();
    const del = screen.getByRole('button', { name: 'Delete account' });
    expect(del).toBeDisabled();
    await user.type(screen.getByLabelText('Type FTMO 100K to confirm'), 'ftmo 100');
    expect(del).toBeDisabled();
    await user.type(screen.getByLabelText('Type FTMO 100K to confirm'), 'k');
    expect(del).toBeEnabled();
    await user.click(del);
    expect(h.onConfirm).toHaveBeenCalled();
  });

  it('needs no typing for an account without trades', () => {
    setup({ tradeCount: 0 });
    expect(screen.queryByLabelText(/to confirm/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeEnabled();
  });

  it('still asks for the name when the trade count is unknown', () => {
    setup({ tradeCount: null });
    expect(screen.getByText(/and all of its trades/)).toBeInTheDocument();
    expect(screen.getByLabelText(/to confirm/)).toBeInTheDocument();
  });

  it('shows a failure inside the dialog', () => {
    setup({ error: 'Couldn’t delete the account. Try again.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.');
  });
});
