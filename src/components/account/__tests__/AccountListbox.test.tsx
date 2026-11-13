import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountListbox, type AccountOption } from '../AccountListbox';
import { AccountPicker } from '../AccountPicker';

const many = (n: number): AccountOption[] =>
  Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, name: `Account ${String(i + 1).padStart(3, '0')}`, currency: i % 2 ? 'INR' : 'USD' }));

const names = (root: HTMLElement = document.body) => within(root).getAllByRole('option').map((o) => o.textContent);
// One change event instead of a keystroke at a time: each keystroke redraws every row of a 100-account list.
const search = (text: string) => fireEvent.change(screen.getByRole('searchbox'), { target: { value: text } });

function Chooser({ accounts, max, initial = [] }: { accounts: AccountOption[]; max?: number; initial?: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <AccountListbox
      label="Accounts"
      accounts={accounts}
      selected={selected}
      multiple
      max={max}
      onToggle={(id, on) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)))}
    />
  );
}

describe('AccountListbox', () => {
  it('has no search field for a short list and one for a long list', () => {
    const { unmount } = render(<AccountListbox label="Account" accounts={many(7)} selected={[]} onToggle={vi.fn()} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
    unmount();
    render(<AccountListbox label="Account" accounts={many(8)} selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: 'Search accounts' })).toHaveAttribute('placeholder', 'Search 8 accounts…');
  });

  it('filters by name or currency as you type and says when nothing matches', () => {
    render(<AccountListbox label="Account" accounts={many(60)} selected={[]} onToggle={vi.fn()} />);
    expect(screen.getAllByRole('option')).toHaveLength(60);
    search('04');
    expect(names()).toEqual(['Account 004INR', 'Account 040INR', 'Account 041USD', 'Account 042INR', 'Account 043USD', 'Account 044INR', 'Account 045USD', 'Account 046INR', 'Account 047USD', 'Account 048INR', 'Account 049USD']);
    search('zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No account matches “zzz”.')).toBeInTheDocument();
  });

  it('lists the selected account first', () => {
    render(<AccountListbox label="Account" accounts={many(20)} selected={['a17']} onToggle={vi.fn()} />);
    const first = screen.getAllByRole('option')[0];
    expect(first).toHaveTextContent('Account 017');
    expect(first).toHaveAttribute('aria-selected', 'true');
  });

  it('picks with the keyboard: type, arrow down, Enter', async () => {
    const onToggle = vi.fn();
    render(<AccountListbox label="Account" accounts={many(100)} selected={[]} onToggle={onToggle} />);
    const field = screen.getByRole('searchbox');
    await userEvent.type(field, '09');
    const first = screen.getAllByRole('option')[0];
    expect(field).toHaveAttribute('aria-activedescendant', first.id);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onToggle).toHaveBeenCalledWith('a90', true);
  });

  it('a short list takes the keys itself: arrows move, Space picks', async () => {
    const onToggle = vi.fn();
    render(<AccountListbox label="Account" accounts={many(3)} selected={[]} onToggle={onToggle} />);
    await userEvent.tab();
    expect(screen.getByRole('listbox', { name: 'Account' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown} ');
    expect(onToggle).toHaveBeenCalledWith('a2', true);
  });

  it('shows why a row cannot be picked and does not pick it', async () => {
    const onToggle = vi.fn();
    render(<AccountListbox label="Account" accounts={[{ id: 'a1', name: 'FTMO', currency: 'USD' }, { id: 'a2', name: 'Demo', currency: 'USD', disabledReason: 'Read-only on Free' }]} selected={[]} onToggle={onToggle} />);
    const row = screen.getByRole('option', { name: /Demo/ });
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveTextContent('Read-only on Free');
    await userEvent.click(row);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('with a limit: the chosen rows move to the top group, the rest are blocked at the limit and free again after an untick', () => {
    render(<Chooser accounts={many(30)} max={2} />);
    const chosen = screen.getByRole('group', { name: 'Selected' });
    const rest = screen.getByRole('group', { name: 'Other accounts' });
    expect(chosen).toHaveTextContent('Selected · 0 of 2');
    fireEvent.click(within(rest).getByText('Account 017'));
    search('028');
    fireEvent.click(within(rest).getByText('Account 028'));
    search('');

    expect(chosen).toHaveTextContent('Selected · 2 of 2');
    expect(names(chosen)).toEqual(['Account 017USD', 'Account 028INR']);
    expect(screen.getAllByRole('option').slice(0, 2).map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'true']);
    const others = within(rest).getAllByRole('option');
    expect(others).toHaveLength(28);
    expect(others.every((o) => o.getAttribute('aria-disabled') === 'true')).toBe(true);

    fireEvent.click(others[0]);
    expect(names(chosen)).toEqual(['Account 017USD', 'Account 028INR']);

    fireEvent.click(within(chosen).getByText('Account 017'));
    expect(names(chosen)).toEqual(['Account 028INR']);
    expect(within(rest).getByText('Account 001').closest('[role=option]')).not.toHaveAttribute('aria-disabled');
  });

  it('the chosen rows stay listed while a search narrows the rest', () => {
    render(<Chooser accounts={many(30)} max={2} initial={['a3']} />);
    search('029');
    expect(names()).toEqual(['Account 003USD', 'Account 029USD']);
  });
});

describe('AccountPicker', () => {
  const accounts: AccountOption[] = [
    { id: 'a1', name: 'FTMO 100K', currency: 'USD' },
    { id: 'a2', name: 'Zerodha F&O', currency: 'INR' },
    { id: 'a3', name: 'Old demo', currency: 'USD', disabledReason: 'Read-only on Free' },
  ];

  it('shows the placeholder, then the chosen account with its currency', () => {
    const { rerender } = render(<AccountPicker label="Account" accounts={accounts} value={null} onChange={vi.fn()} />);
    const trigger = screen.getByRole('combobox', { name: 'Account' });
    expect(trigger).toHaveTextContent('Choose an account');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    rerender(<AccountPicker label="Account" accounts={accounts} value="a2" onChange={vi.fn()} />);
    expect(trigger).toHaveTextContent('Zerodha F&OINR');
  });

  it('opens a list, picks with the keyboard and closes', async () => {
    const onChange = vi.fn();
    render(<AccountPicker label="Account" accounts={accounts} value="a1" onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Account' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const list = screen.getByRole('listbox', { name: 'Account' });
    expect(list).toHaveFocus();
    expect(within(list).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('a2');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not pick a read-only account', async () => {
    const onChange = vi.fn();
    render(<AccountPicker label="Account" accounts={accounts} value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Account' }));
    await userEvent.click(screen.getByRole('option', { name: /Old demo/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('does not open while disabled', async () => {
    render(<AccountPicker label="Account" accounts={accounts} value={null} onChange={vi.fn()} disabled />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Account' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
