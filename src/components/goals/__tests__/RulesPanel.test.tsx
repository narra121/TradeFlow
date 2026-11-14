import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulesPanel, type RuleRow } from '../RulesPanel';

const none = Array.from({ length: 8 }, (_, i) => ({ label: `Week ${i}`, cell: { kind: 'none' as const } }));
const rows: RuleRow[] = [
  {
    id: 'r1',
    text: 'No trade after two losses in a row',
    key: 'no trade after two losses in a row',
    stat: { breaks: 2, cost: [{ currency: 'USD', net: -48 }], tradeIds: ['t1', 't2'] },
    history: none.map((h, i) => ({ ...h, cell: i === 7 ? { kind: 'broken' as const, count: 2 } : { kind: 'clean' as const } })),
  },
  { id: 'r2', text: 'Risk at most 1% per trade', key: 'risk at most 1% per trade', history: none.map((h) => ({ ...h, cell: { kind: 'clean' as const } })) },
];

function setup(over: Partial<React.ComponentProps<typeof RulesPanel>> = {}) {
  const handlers = {
    onCloseAdd: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    onEdit: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue({}),
    onCopy: vi.fn().mockResolvedValue(undefined),
    onOpenTrades: vi.fn(),
  };
  render(<RulesPanel rows={rows} period="weekly" readOnly={false} starters={['Review trades weekly']} pullable={[]} siblingLabel="monthly" adding={false} complianceText="Followed on 10 of 12 trades this week (83%)" {...handlers} {...over} />);
  return handlers;
}

describe('RulesPanel', () => {
  it('shows this week, the cost of a break, the history and the streak per rule', () => {
    setup();
    expect(screen.getByText('Followed on 10 of 12 trades this week (83%)')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /No trade after two losses/ });
    expect(within(row).getByRole('button', { name: /Broken 2 times this week/ })).toHaveTextContent('Broken 2× →');
    expect(within(row).getByText('−$48.00')).toBeInTheDocument();
    const clean = screen.getByRole('row', { name: /Risk at most 1%/ });
    expect(within(clean).getByText('Followed')).toBeInTheDocument();
    expect(within(clean).getByText('8 weeks clean')).toBeInTheDocument();
  });

  it('does not say Followed when the period has no trades', () => {
    setup({ rows: rows.map((r) => ({ ...r, stat: undefined, idle: true })) });
    expect(screen.queryByText('Followed')).not.toBeInTheDocument();
    expect(screen.getAllByText('No trades yet')).toHaveLength(2);
  });

  it('opens the trades of a broken rule', async () => {
    const h = setup();
    await userEvent.setup().click(screen.getByRole('button', { name: /Broken 2 times/ }));
    expect(h.onOpenTrades).toHaveBeenCalledWith(rows[0]);
  });

  it('names the actions menu of each rule', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Actions for rule: No trade after two losses in a row' })).toBeInTheDocument();
  });

  it('adds a rule with Enter and cancels with Escape', async () => {
    const user = userEvent.setup();
    const h = setup({ adding: true });
    await user.type(screen.getByLabelText('New rule'), 'Stop after −2% day{Enter}');
    expect(h.onAdd).toHaveBeenCalledWith('Stop after −2% day');
    await vi.waitFor(() => expect(h.onCloseAdd).toHaveBeenCalled());
    h.onCloseAdd.mockClear();
    await user.type(screen.getByLabelText('New rule'), '{Escape}');
    expect(h.onCloseAdd).toHaveBeenCalled();
  });

  it('shows the API message when saving a rule fails, and the connection message only without a response', async () => {
    const user = userEvent.setup();
    const h = setup({ adding: true });
    h.onAdd.mockRejectedValueOnce({ status: 400, data: { message: 'You can keep at most 20 rules.' } });
    await user.type(screen.getByLabelText('New rule'), 'Stop after −2% day{Enter}');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('You can keep at most 20 rules.');
    expect(alert).not.toHaveTextContent(/connection/i);
    h.onAdd.mockRejectedValueOnce({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' });
    await user.type(screen.getByLabelText('New rule'), '{Enter}');
    await vi.waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/internet connection/i));
  });

  it('refuses an empty rule under the field', async () => {
    const user = userEvent.setup();
    const h = setup({ adding: true });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByLabelText('New rule')).toHaveAttribute('placeholder', expect.stringMatching(/^One sentence/));
    await user.type(screen.getByLabelText('New rule'), '{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the rule in a sentence.');
    expect(h.onAdd).not.toHaveBeenCalled();
  });

  it('edits a rule in place from its menu', async () => {
    const user = userEvent.setup();
    const h = setup();
    await user.click(screen.getByRole('button', { name: 'Actions for rule: Risk at most 1% per trade' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const input = screen.getByLabelText('Edit rule: Risk at most 1% per trade');
    await user.clear(input);
    await user.type(input, 'Risk at most 0.5%{Enter}');
    expect(h.onEdit).toHaveBeenCalledWith('r2', 'Risk at most 0.5%');
  });

  it('confirms a delete with the number of trades that keep it, default focus on Cancel', async () => {
    const user = userEvent.setup();
    const h = setup();
    await user.click(screen.getByRole('button', { name: 'Actions for rule: No trade after two losses in a row' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete this rule?');
    expect(dialog).toHaveTextContent('It stays on the 2 trades that recorded it.');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Delete rule' }));
    expect(h.onDelete).toHaveBeenCalledWith('r1');
  });

  it('returns focus to the rule actions button after the delete dialog closes', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Actions for rule: Risk at most 1% per trade' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Actions for rule: Risk at most 1% per trade' })).toHaveFocus());
  });

  it('opens the add row with the given text selected', () => {
    setup({ adding: true, addInitial: 'Stop after −2% day' });
    const input = screen.getByLabelText('New rule') as HTMLInputElement;
    expect(input).toHaveValue('Stop after −2% day');
    expect(input.selectionEnd - input.selectionStart).toBe(input.value.length);
  });

  it('keeps the dialog open and shows the failure when the delete throws (FE-057)', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue({ status: 500, data: { message: 'The rules service is busy.' } });
    setup({ onDelete });
    await user.click(screen.getByRole('button', { name: 'Actions for rule: Risk at most 1% per trade' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete rule' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The rules service is busy.');
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Delete rule' })).toBeEnabled();
  });

  it('gives the add row and an open edit row separate input ids (FE-066)', async () => {
    const user = userEvent.setup();
    setup({ adding: true, addInitial: '' });
    await user.click(screen.getByRole('button', { name: 'Actions for rule: Risk at most 1% per trade' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    const ids = inputs.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const input of inputs) expect(document.querySelectorAll(`label[for="${CSS.escape(input.id)}"]`)).toHaveLength(1);
  });

  it('says why a rule cannot be deleted when the API refuses', async () => {
    const user = userEvent.setup();
    setup({ onDelete: vi.fn().mockResolvedValue({ inUse: true }) });
    await user.click(screen.getByRole('button', { name: 'Actions for rule: No trade after two losses in a row' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete rule' }));
    expect(await screen.findByText('Used by 2 trades this week — cannot be deleted')).toBeInTheDocument();
  });

  it('offers the starter rules when there are none, and copies a rule from the other period', async () => {
    const user = userEvent.setup();
    const h = setup({ rows: [], pullable: [{ text: 'Stop after −2% day' }] });
    expect(screen.getByText(/These are starter rules/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add rule: Review trades weekly' }));
    expect(h.onCopy).toHaveBeenCalledWith('Review trades weekly');
    await user.click(screen.getByRole('button', { name: 'Copy to this week' }));
    expect(h.onCopy).toHaveBeenCalledWith('Stop after −2% day');
    expect(screen.getByText(/From your monthly rules/)).toBeInTheDocument();
  });

  it('is read-only in a past period: no menus, no add row, no copy buttons', () => {
    setup({ readOnly: true, adding: true, pullable: [{ text: 'x' }] });
    expect(screen.queryByRole('button', { name: /^Actions for rule/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New rule')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy to this week/ })).not.toBeInTheDocument();
  });
});
