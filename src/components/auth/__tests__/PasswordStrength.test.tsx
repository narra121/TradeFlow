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

describe('PasswordStrength - boundary cases', () => {
  it('shows "Very Weak" for exactly 8 lowercase characters (only length criterion met)', () => {
    // Exactly 8 chars, lowercase only => strength 1 => "Very Weak"
    render(<PasswordStrength password="abcdefgh" />);
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
  });

  it('shows "Very Weak" for exactly 7 characters (length criterion not met, has digit)', () => {
    // 7 chars with a digit => length < 8 (0) + no mixed case (0) + digit (1) + no special (0) = 1 => "Very Weak"
    render(<PasswordStrength password="abcdef1" />);
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
  });

  it('shows correct strength for exactly 12 mixed-case characters with digit and special', () => {
    // 12 chars, mixed case, digit, special => all 4 criteria => "Strong"
    render(<PasswordStrength password="Abcdefghij1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('shows "Enter password" for a single character that meets no length criterion', () => {
    // 1 char, lowercase only => strength 0 => "Enter password"
    render(<PasswordStrength password="a" />);
    expect(screen.getByText('Enter password')).toBeInTheDocument();
  });
});

describe('PasswordStrength - special character detection', () => {
  it('detects special characters like @#$%', () => {
    // 8+ chars with special char only => length (1) + no mixed case (0) + no digit (0) + special (1) = 2 => "Weak"
    render(<PasswordStrength password="abcdefg@" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('detects special characters like underscores and hyphens', () => {
    // length (1) + no mixed case (0) + no digit (0) + special (1) = 2 => "Weak"
    render(<PasswordStrength password="abcdefg_" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('does not count spaces as special characters (spaces are non-alphanumeric)', () => {
    // "abcdefg " => length (1) + no mixed case (0) + no digit (0) + space is special (1) = 2 => "Weak"
    render(<PasswordStrength password="abcdefg " />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });
});

describe('PasswordStrength - mixed case detection', () => {
  it('does not count mixed case when only uppercase letters are present', () => {
    // "ABCDEFGH" => length (1) + mixed case needs both lower AND upper (0) + no digit (0) + no special (0) = 1 => "Very Weak"
    render(<PasswordStrength password="ABCDEFGH" />);
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
  });

  it('does not count mixed case when only lowercase letters are present', () => {
    // "abcdefgh" => length (1) + no mixed case (0) + no digit (0) + no special (0) = 1 => "Very Weak"
    render(<PasswordStrength password="abcdefgh" />);
    expect(screen.getByText('Very Weak')).toBeInTheDocument();
  });

  it('counts mixed case when both lowercase and uppercase are present', () => {
    // "Abcdefgh" => length (1) + mixed case (1) + no digit (0) + no special (0) = 2 => "Weak"
    render(<PasswordStrength password="Abcdefgh" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });
});

describe('PasswordStrength - all criteria met shows Strong', () => {
  it('shows "Strong" for a password with length >= 8, mixed case, digit, and special char', () => {
    render(<PasswordStrength password="MyPass1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('fills all 4 bars when strength is Strong', () => {
    const { container } = render(<PasswordStrength password="MyPass1!" />);
    const bars = container.querySelectorAll('.rounded-full');
    const coloredBars = Array.from(bars).filter(
      (bar) => !bar.classList.contains('bg-muted')
    );
    expect(coloredBars).toHaveLength(4);
  });

  it('applies emerald color to all bars when Strong', () => {
    const { container } = render(<PasswordStrength password="MyPass1!" />);
    const bars = container.querySelectorAll('.rounded-full');
    const emeraldBars = Array.from(bars).filter((bar) =>
      bar.classList.contains('bg-emerald-500')
    );
    expect(emeraldBars).toHaveLength(4);
  });

  it('shows "Strong" with a complex password containing multiple special chars', () => {
    render(<PasswordStrength password="C0mpl3x!@#" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});
