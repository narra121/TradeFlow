import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewedSwitch } from '../ReviewedSwitch';

describe('ReviewedSwitch', () => {
  it('shows the new value while it saves, then follows the saved trade', async () => {
    let finish!: () => void;
    const onChange = vi.fn(() => new Promise<void>((r) => (finish = r)));
    const { rerender } = render(<ReviewedSwitch checked={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Reviewed · followed plan' });
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
    rerender(<ReviewedSwitch checked onChange={onChange} />);
    await act(async () => finish());
    expect(toggle).toBeEnabled();
    expect(toggle).toBeChecked();
  });

  it('goes back and says why when the save fails', async () => {
    const onChange = vi.fn(() => Promise.reject({ status: 409, data: { message: 'This trade was changed by another request. Reload it and try again.' } }));
    render(<ReviewedSwitch checked onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Reviewed · followed plan' });
    await userEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t save. This trade was changed by another request. Reload it and try again.');
    expect(toggle).toBeChecked();
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
