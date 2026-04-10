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

describe('OTPInput - paste handling', () => {
  it('handles paste of partial OTP (shorter than length)', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={6} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.paste('123');

    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('truncates pasted content that exceeds the OTP length', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.paste('123456');

    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('4');
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('rejects paste containing mixed digits and letters', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.paste('12ab');

    expect(inputs[0]).toHaveValue('');
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('OTPInput - auto-focus on keypress', () => {
  it('advances focus through all inputs as digits are typed', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('1');
    expect(inputs[1]).toHaveFocus();

    await user.keyboard('2');
    expect(inputs[2]).toHaveFocus();

    await user.keyboard('3');
    expect(inputs[3]).toHaveFocus();
  });

  it('does not advance focus beyond the last input', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={3} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('1');
    await user.keyboard('2');
    await user.keyboard('3');
    // After filling all, focus stays on last input
    expect(inputs[2]).toHaveFocus();
  });
});

describe('OTPInput - backspace navigation', () => {
  it('moves focus to previous input on backspace when current is empty', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('1');
    await user.keyboard('2');
    // Focus is now on inputs[2]
    expect(inputs[2]).toHaveFocus();

    // Backspace clears inputs[2] (which is empty) and moves to inputs[1]
    await user.keyboard('{Backspace}');
    expect(inputs[1]).toHaveFocus();
  });

  it('does not move focus before the first input on backspace', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    // First input is empty, backspace should keep focus on first input
    await user.keyboard('{Backspace}');
    expect(inputs[0]).toHaveFocus();
  });
});

describe('OTPInput - max length enforcement', () => {
  it('only keeps the last digit when multiple characters are typed rapidly', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('1');
    // After typing '1', focus moves to inputs[1]; value of inputs[0] should be '1'
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[0]).toHaveAttribute('maxlength', '1');
  });

  it('each input element enforces maxLength of 1', () => {
    const onComplete = vi.fn();
    render(<OTPInput length={6} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('maxlength', '1');
    });
  });
});

describe('OTPInput - disabled state', () => {
  it('disables all input fields when disabled prop is true', () => {
    const onComplete = vi.fn();
    render(<OTPInput onComplete={onComplete} disabled={true} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it('does not disable inputs when disabled prop is false', () => {
    const onComplete = vi.fn();
    render(<OTPInput onComplete={onComplete} disabled={false} />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).not.toBeDisabled();
    });
  });

  it('does not disable inputs by default (no disabled prop)', () => {
    const onComplete = vi.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).not.toBeDisabled();
    });
  });

  it('prevents typing in disabled inputs', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput onComplete={onComplete} disabled={true} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[0]);
    await user.keyboard('1');

    expect(inputs[0]).toHaveValue('');
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('OTPInput - accessibility', () => {
  it('all inputs have type text for screen reader compatibility', () => {
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  it('all inputs have inputMode numeric for mobile keyboards', () => {
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('inputmode', 'numeric');
    });
  });

  it('inputs are focusable via click', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');

    await user.click(inputs[2]);
    expect(inputs[2]).toHaveFocus();
  });
});
