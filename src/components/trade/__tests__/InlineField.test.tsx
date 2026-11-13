import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineField } from '../InlineField';

const setup = (onCommit: (next: string) => Promise<void>) =>
  render(
    <InlineField label="Notes" value="old" display="old" onCommit={onCommit}>
      {(api) => <input aria-label="Notes editor" value={api.draft} onChange={(e) => api.setDraft(e.target.value)} />}
    </InlineField>,
  );

const edit = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Edit notes/i }));
  const input = screen.getByLabelText('Notes editor');
  await userEvent.clear(input);
  await userEvent.type(input, 'new{Enter}');
  await userEvent.tab();
};

describe('InlineField failure', () => {
  it('shows the API message next to "Couldn’t save." and keeps Retry', async () => {
    setup(vi.fn().mockRejectedValue({ status: 400, data: { message: 'Notes are limited to 500 characters.' } }));
    await edit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t save. Notes are limited to 500 characters.');
    expect(alert).not.toHaveTextContent(/connection/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows the connection message when no response came back', async () => {
    setup(vi.fn().mockRejectedValue({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }));
    await edit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/internet connection/i);
  });

  it('keeps the plain sentence when the failure carries no message', async () => {
    setup(vi.fn().mockRejectedValue({ status: 500 }));
    await edit();
    expect((await screen.findByRole('alert')).textContent).toMatch(/^Couldn’t save\.\s*Retry$/);
  });
});

describe('InlineField double commit (FE-051)', () => {
  it('sends one request when Enter commits and the blur it causes commits again', async () => {
    let finish!: () => void;
    const onCommit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(
      <InlineField label="Notes" value="old" display="old" onCommit={onCommit}>
        {(api) => <input aria-label="Notes editor" value={api.draft} onChange={(e) => api.setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && api.commit()} />}
      </InlineField>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Edit notes/i }));
    await userEvent.clear(screen.getByLabelText('Notes editor'));
    await userEvent.type(screen.getByLabelText('Notes editor'), 'new{Enter}');
    await userEvent.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });
});
