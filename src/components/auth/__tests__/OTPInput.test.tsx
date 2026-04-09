import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OTPInput } from '../OTPInput';

describe('OTPInput', () => {
  it('renders the default number of input slots (6)', () => {
    const onComplete = vi.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('renders a custom number of input slots', () => {
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4);
  });

  it('accepts digit input and advances focus', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('1');
    expect(inputs[0]).toHaveValue('1');
    // Focus should have advanced to the second input
    expect(inputs[1]).toHaveFocus();
  });

  it('rejects non-digit input', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('a');
    expect(inputs[0]).toHaveValue('');
  });

  it('calls onComplete when all digits are entered', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('1');
    await user.keyboard('2');
    await user.keyboard('3');
    await user.keyboard('4');

    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('handles paste of a complete OTP', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={6} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.paste('123456');

    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('4');
    expect(inputs[4]).toHaveValue('5');
    expect(inputs[5]).toHaveValue('6');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('rejects paste of non-digit content', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.paste('abcd');

    expect(inputs[0]).toHaveValue('');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('handles backspace to move focus to previous input', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    // Type a digit in the first slot then advance
    await user.click(inputs[0]);
    await user.keyboard('1');
    // Now focus is on inputs[1], which is empty
    expect(inputs[1]).toHaveFocus();

    // Pressing backspace on an empty slot goes back
    await user.keyboard('{Backspace}');
    expect(inputs[0]).toHaveFocus();
  });

  it('each input has inputMode numeric and maxLength 1', () => {
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('inputmode', 'numeric');
      expect(input).toHaveAttribute('maxlength', '1');
    });
  });
});
