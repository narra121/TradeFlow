import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ShareButtons } from '../ShareButtons';

const setClipboard = (writeText: unknown) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

describe('ShareButtons copy link (FE-078)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "copied" only after the clipboard write succeeded, then clears it', async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    render(<ShareButtons title="T" url="/blog/x" />);
    const button = screen.getByRole('button', { name: 'Copy link' });
    await act(async () => {
      button.click();
    });
    expect(button.querySelector('.text-profit')).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(button.querySelector('.text-profit')).toBeNull();
  });

  it('shows nothing when the write is refused', async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(<ShareButtons title="T" url="/blog/x" />);
    const button = screen.getByRole('button', { name: 'Copy link' });
    await act(async () => {
      button.click();
    });
    expect(button.querySelector('.text-profit')).toBeNull();
  });

  it('does not touch state after unmount (the timer is cleared)', async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const { unmount } = render(<ShareButtons title="T" url="/blog/x" />);
    await act(async () => {
      screen.getByRole('button', { name: 'Copy link' }).click();
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
