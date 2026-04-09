import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrength } from '../PasswordStrength';

describe('PasswordStrength', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Very Weak" for a password meeting exactly one criterion (length >= 8)', () => {
    // Only length criterion met: strength = 1 => "Very Weak"
    render(<PasswordStrength password="abcdefgh" />);
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
  });

  it('shows "Enter password" when no strength criteria are met', () => {
    // Short, no uppercase, no digit, no special => strength 0 => fallback text
    render(<PasswordStrength password="abc" />);
    expect(screen.getByText('Enter password')).toBeInTheDocument();
  });

  it('shows "Weak" for a password meeting two criteria (length + mixed case)', () => {
    // length >= 8 AND mixed case => strength 2 => "Weak"
    render(<PasswordStrength password="Abcdefgh" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Fair" for a password meeting three criteria', () => {
    // length >= 8 AND mixed case AND digit => strength 3 => "Fair"
    render(<PasswordStrength password="Abcdefg1" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('shows "Strong" for a password meeting all four criteria', () => {
    // length >= 8 AND mixed case AND digit AND special char => strength 4 => "Strong"
    render(<PasswordStrength password="Abcdefg1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('renders four strength bar segments', () => {
    const { container } = render(<PasswordStrength password="test" />);
    // The bars are inside a flex container; there should be exactly 4
    const bars = container.querySelectorAll('.rounded-full');
    expect(bars).toHaveLength(4);
  });

  it('fills the correct number of bars for strength level', () => {
    // "Abcdefg1" = strength 3 (Fair) -> 3 bars colored, 1 muted
    const { container } = render(<PasswordStrength password="Abcdefg1" />);
    const bars = container.querySelectorAll('.rounded-full');
    const coloredBars = Array.from(bars).filter(
      (bar) => !bar.classList.contains('bg-muted')
    );
    const mutedBars = Array.from(bars).filter((bar) =>
      bar.classList.contains('bg-muted')
    );
    expect(coloredBars).toHaveLength(3);
    expect(mutedBars).toHaveLength(1);
  });

  it('applies red color class for Very Weak passwords', () => {
    render(<PasswordStrength password="abcdefgh" />);
    const label = screen.getByText('Very Weak');
    expect(label.className).toContain('text-red-500');
  });

  it('applies orange color class for Weak passwords', () => {
    render(<PasswordStrength password="Abcdefgh" />);
    const label = screen.getByText('Weak');
    expect(label.className).toContain('text-orange-500');
  });

  it('applies yellow color class for Fair passwords', () => {
    render(<PasswordStrength password="Abcdefg1" />);
    const label = screen.getByText('Fair');
    expect(label.className).toContain('text-yellow-500');
  });

  it('applies emerald color class for Strong passwords', () => {
    render(<PasswordStrength password="Abcdefg1!" />);
    const label = screen.getByText('Strong');
    expect(label.className).toContain('text-emerald-500');
  });

  it('shows "Enter password" for a short digit-only password (no criteria met)', () => {
    // "123" => length < 8, no mixed case, has digit but strength check: digit adds 1 only if /\d/.test passes
    // Actually: strength = 0 (length < 8) + 0 (no mixed case) + 1 (has digit) + 0 (no special) = 1 => "Very Weak"
    render(<PasswordStrength password="123" />);
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
  });

  it('shows "Very Weak" for a password with only a special character', () => {
    // strength = 0 (length < 8) + 0 (no mixed case) + 0 (no digit) + 1 (special) = 1 => "Very Weak"
    render(<PasswordStrength password="!!!" />);
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
  });
});
