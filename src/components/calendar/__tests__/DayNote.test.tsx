import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const save = vi.fn();
let saving = false;
vi.mock('@/store/api/journalApi', async (orig) => ({
  ...(await orig<object>()),
  useSaveDayNoteMutation: () => [save, { isLoading: saving }],
}));

import { DayNote } from '../DayNote';

const range = { from: '2026-10-26', to: '2026-12-06', scope: 'ALL' };

function setup(note?: { date: string; accountId: string | null; plan: string; review: string }) {
  render(<DayNote date="2026-11-04" scope="ALL" note={note} range={range} />);
}

describe('DayNote', () => {
  beforeEach(() => {
    save.mockReset();
    saving = false;
    save.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('has a labelled Plan and Review field with the 2,000 character limit', () => {
    setup();
    expect(screen.getByLabelText('Plan')).toHaveAttribute('maxlength', '2000');
    expect(screen.getByLabelText('Review')).toHaveAttribute('maxlength', '2000');
    expect(screen.getAllByText(/of 2,000 characters/)).toHaveLength(2);
  });

  it('shows the stored text', () => {
    setup({ date: '2026-11-04', accountId: null, plan: 'Only London open.', review: '' });
    expect(screen.getByLabelText('Plan')).toHaveValue('Only London open.');
  });

  it('saves one part on blur with the scope and range, then says Saved', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Plan'), 'Max 2 trades.');
    await user.tab();
    expect(save).toHaveBeenCalledWith({ date: '2026-11-04', scope: 'ALL', plan: 'Max 2 trades.', range });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('does not save when nothing changed', async () => {
    const user = userEvent.setup();
    setup({ date: '2026-11-04', accountId: null, plan: 'Same', review: '' });
    await user.click(screen.getByLabelText('Plan'));
    await user.tab();
    expect(save).not.toHaveBeenCalled();
  });

  it('makes the note read-only with the reason while offline', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    setup();
    expect(screen.getByLabelText('Plan')).toHaveAttribute('readonly');
    expect(screen.getByText(/read-only while you’re offline/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('says the connection failed when no response came back, and keeps our sentence for a body-less error', async () => {
    save.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }) });
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Review'), 'Held too long.');
    await user.tab();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/internet connection/i));
    save.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 400 }) });
    await user.type(screen.getByLabelText('Review'), ' More.');
    await user.tab();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save the review."));
  });

  it('shows the failure under the fields and keeps the text', async () => {
    save.mockReturnValue({ unwrap: () => Promise.reject({ status: 500, data: { message: 'Server error' } }) });
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Review'), 'Held too long.');
    await user.tab();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Server error'));
    expect(screen.getByLabelText('Review')).toHaveValue('Held too long.');
  });
});
