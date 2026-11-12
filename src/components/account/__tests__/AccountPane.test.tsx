import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPane } from '../AccountPane';
import { validateAccount } from '../accountForm';
import type { TradingAccount } from '@/types/trade';

const account: TradingAccount = { id: 'a1', name: 'FTMO 100K', broker: 'FTMO', type: 'prop_challenge', status: 'active', balance: 101240, initialBalance: 100000, currency: 'USD', createdAt: '', notes: 'n' };

function setup(props: Partial<React.ComponentProps<typeof AccountPane>> = {}) {
  const onSubmit = vi.fn();
  const onRequestClose = vi.fn();
  const onDirtyChange = vi.fn();
  render(<AccountPane saving={false} onSubmit={onSubmit} onRequestClose={onRequestClose} onDirtyChange={onDirtyChange} {...props} />);
  return { onSubmit, onRequestClose, onDirtyChange };
}

describe('validateAccount', () => {
  const ok = { name: 'A', broker: 'B', type: 'personal' as const, status: 'active' as const, currency: 'USD', initialBalance: '0', notes: '' };
  it('does not require a broker and sends the first-run default when it is empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    expect(screen.getByText('Broker')).not.toHaveTextContent('*');
    await user.type(screen.getByLabelText(/^Name/), 'No broker');
    await user.type(screen.getByLabelText(/^Starting balance/), '100');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ broker: 'Other' }));
  });

  it('accepts a starting balance of 0', () => expect(validateAccount(ok)).toEqual({}));
  it('states the rule for each field', () => {
    expect(validateAccount({ ...ok, name: ' ', broker: '', initialBalance: '' })).toEqual({
      name: 'Enter an account name.',
      initialBalance: 'Enter the starting balance, 0 or more.',
    });
    expect(validateAccount({ ...ok, broker: 'x'.repeat(101) }).broker).toBe('Keep the broker under 100 characters.');
    expect(validateAccount({ ...ok, initialBalance: '-5' }).initialBalance).toBeDefined();
    expect(validateAccount({ ...ok, initialBalance: 'abc' }).initialBalance).toBeDefined();
    expect(validateAccount({ ...ok, initialBalance: '1,000.50' })).toEqual({});
  });
});

describe('AccountPane', () => {
  it('has the pane anatomy: title, a named close button, footer actions, labelled fields', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'New account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close account' })).toBeInTheDocument();
    for (const label of ['Name', 'Broker', 'Type', 'Currency', 'Starting balance', 'Status', 'Notes']) expect(screen.getByLabelText(new RegExp(`^${label}`))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/current balance/i)).not.toBeInTheDocument();
  });

  it('shows the message under the field on blur and on submit, and does not submit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByLabelText(/^Starting balance/));
    await user.tab();
    expect(screen.getByText('Enter the starting balance, 0 or more.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(screen.getByText('Enter an account name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the starting balance, 0 or more.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits a new account whose balance starts at its starting balance', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText(/^Name/), ' FTMO 100K ');
    await user.type(screen.getByLabelText(/^Broker/), 'FTMO');
    await user.type(screen.getByLabelText(/^Starting balance/), '100000');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'FTMO 100K', broker: 'FTMO', type: 'personal', status: 'active', currency: 'USD', initialBalance: 100000, balance: 100000, notes: undefined });
  });

  it('accepts a starting balance of 0', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText(/^Name/), 'Demo');
    await user.type(screen.getByLabelText(/^Broker/), 'X');
    await user.type(screen.getByLabelText(/^Starting balance/), '0');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ initialBalance: 0, balance: 0 }));
  });

  it('edits an account and keeps the server-computed balance', async () => {
    const user = userEvent.setup();
    const { onSubmit, onDirtyChange } = setup({ account });
    expect(screen.getByRole('heading', { name: 'Edit FTMO 100K' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('FTMO 100K');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    await user.type(screen.getByLabelText(/^Name/), ' B');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'FTMO 100K B', balance: 101240, initialBalance: 100000, notes: 'n' }));
  });

  it('shows a save failure under the footer and disables the buttons while saving', () => {
    setup({ saveError: 'Couldn’t save the account. Name already used.', saving: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Name already used.');
    expect(screen.getByRole('button', { name: /Add account/ })).toBeDisabled();
  });

  it('disables saving with the reason while offline', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    setup();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeDisabled();
    expect(screen.getByText(/You’re offline\. Changes can’t be saved/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('closes through the same request from the header and the footer', async () => {
    const user = userEvent.setup();
    const { onRequestClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Close account' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onRequestClose).toHaveBeenCalledTimes(2);
  });
});
