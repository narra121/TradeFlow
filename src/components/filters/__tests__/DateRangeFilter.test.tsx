import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter, getDateRangeFromPreset } from '../DateRangeFilter';

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
    expect(getDateRangeFromPreset(7, undefined, now).from.getDate()).toBe(4);
    expect(getDateRangeFromPreset('thisMonth', undefined, now).from.getDate()).toBe(1);
    expect(getDateRangeFromPreset('all', undefined, now).from.getFullYear()).toBe(2000);
  });

  it('returns the custom range as given', () => {
    const custom = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) };
    expect(getDateRangeFromPreset('custom', custom, now)).toBe(custom);
  });
});
