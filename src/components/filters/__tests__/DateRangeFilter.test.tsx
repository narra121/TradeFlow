import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter, getDateRangeFromPreset, rangeLabel } from '../DateRangeFilter';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';

describe('DateRangeFilter', () => {
  it('shows the active range on the trigger', () => {
    render(<DateRangeFilter selectedPreset={30} onPresetChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Date range: Last 30 days/ })).toBeInTheDocument();
  });

  it('lists presets in a popover and reports the chosen one', async () => {
    const onPresetChange = vi.fn();
    render(<DateRangeFilter selectedPreset="all" onPresetChange={onPresetChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Date range/ }));
    expect(screen.getAllByRole('option').length).toBeGreaterThanOrEqual(7);
    await userEvent.click(screen.getByRole('option', { name: 'This week' }));
    expect(onPresetChange).toHaveBeenCalledWith('thisWeek');
  });

  it('marks the selected preset', async () => {
    render(<DateRangeFilter selectedPreset="thisMonth" onPresetChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Date range/ }));
    expect(screen.getByRole('option', { name: 'This month' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'All time' })).toHaveAttribute('aria-selected', 'false');
  });

  it('offers a custom range only when enabled and shows both dates', async () => {
    const range = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31) };
    const { rerender } = render(<DateRangeFilter selectedPreset="custom" onPresetChange={vi.fn()} customRange={range} />);
    await userEvent.click(screen.getByRole('button', { name: /Date range/ }));
    expect(screen.queryByRole('option', { name: /Custom/ })).toBeNull();
    rerender(<DateRangeFilter selectedPreset="custom" onPresetChange={vi.fn()} customRange={range} showCustomPicker />);
    expect(screen.getByRole('option', { name: /Custom/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Start date 1 Oct 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /End date 31 Oct 2026/ })).toBeInTheDocument();
  });

  it('lets the custom range end on today in the Settings time zone, not the browser clock', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 12:00 UTC on 16 Nov is already 02:00 on 17 Nov in Kiritimati (UTC+14), while every browser zone up to UTC+11 is still on 16 Nov.
    vi.setSystemTime(new Date('2026-11-16T12:00:00Z'));
    patchUiState({ timeZone: 'Pacific/Kiritimati' });
    try {
      render(<DateRangeFilter selectedPreset="custom" onPresetChange={vi.fn()} customRange={{ from: new Date(2026, 10, 2), to: new Date(2026, 10, 10) }} showCustomPicker />);
      fireEvent.click(screen.getByRole('button', { name: /Date range/ }));
      fireEvent.click(screen.getByRole('button', { name: /End date/ }));
      const day = (n: string) => screen.getAllByRole('gridcell').find((c) => c.textContent === n)!;
      const button = (n: string) => (day(n).tagName === 'BUTTON' ? day(n) : day(n).querySelector('button') ?? day(n));
      expect(button('17')).not.toBeDisabled();
      expect(button('18')).toBeDisabled();
    } finally {
      patchUiState({ timeZone: undefined });
      resetUiStateCache();
      vi.useRealTimers();
    }
  });

  it('labels a custom range compactly, so it fits the phone scope bar (L23-R2)', () => {
    expect(rangeLabel(new Date(2026, 9, 19), new Date(2026, 9, 25))).toBe('19 – 25 Oct 2026');
    expect(rangeLabel(new Date(2026, 9, 1), new Date(2026, 10, 16))).toBe('1 Oct – 16 Nov 2026');
    expect(rangeLabel(new Date(2025, 11, 29), new Date(2026, 0, 4))).toBe('29 Dec 2025 – 4 Jan 2026');
    render(<DateRangeFilter selectedPreset="custom" onPresetChange={vi.fn()} customRange={{ from: new Date(2026, 9, 19), to: new Date(2026, 9, 25) }} />);
    expect(screen.getByRole('button', { name: 'Date range: 19 – 25 Oct 2026' })).toBeInTheDocument();
  });
});

describe('getDateRangeFromPreset', () => {
  const now = new Date(2026, 10, 11, 15, 0, 0); // Wed 11 Nov 2026

  it('starts weeks on Monday', () => {
    const { from, to } = getDateRangeFromPreset('thisWeek', undefined, now);
    expect(from.getDay()).toBe(1);
    expect(from.getDate()).toBe(9);
    expect(to).toBe(now);
  });

  it('uses the supplied clock, not a cached date', () => {
    expect(getDateRangeFromPreset(7, undefined, now).from.getDate()).toBe(5); // 5..11 Nov is seven days, both ends included
    expect(getDateRangeFromPreset('thisMonth', undefined, now).from.getDate()).toBe(1);
    expect(getDateRangeFromPreset('all', undefined, now).from.getFullYear()).toBe(2000);
  });

  it('returns the custom range as given', () => {
    const custom = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) };
    expect(getDateRangeFromPreset('custom', custom, now)).toBe(custom);
  });
});
