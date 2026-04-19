import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter, getDateRangeFromPreset } from '../DateRangeFilter';
import { startOfWeek, startOfMonth, subDays, subMonths } from 'date-fns';

describe('DateRangeFilter', () => {
  const defaultProps = {
    selectedPreset: 30 as const,
    onPresetChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders day preset buttons', () => {
    render(<DateRangeFilter {...defaultProps} />);

    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('60 days')).toBeInTheDocument();
    expect(screen.getByText('90 days')).toBeInTheDocument();
    expect(screen.getByText('1 year')).toBeInTheDocument();
    expect(screen.getByText('All time')).toBeInTheDocument();
  });

  it('renders period preset buttons', () => {
    render(<DateRangeFilter {...defaultProps} />);

    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('calls onPresetChange when a day preset is clicked', async () => {
    const user = userEvent.setup();
    const onPresetChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onPresetChange={onPresetChange} />);

    await user.click(screen.getByText('7 days'));
    expect(onPresetChange).toHaveBeenCalledWith(7);

    await user.click(screen.getByText('90 days'));
    expect(onPresetChange).toHaveBeenCalledWith(90);
  });

  it('calls onPresetChange when a period preset is clicked', async () => {
    const user = userEvent.setup();
    const onPresetChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onPresetChange={onPresetChange} />);

    await user.click(screen.getByText('This week'));
    expect(onPresetChange).toHaveBeenCalledWith('thisWeek');

    await user.click(screen.getByText('This month'));
    expect(onPresetChange).toHaveBeenCalledWith('thisMonth');
  });

  it('calls onPresetChange with "all" when All time is clicked', async () => {
    const user = userEvent.setup();
    const onPresetChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onPresetChange={onPresetChange} />);

    await user.click(screen.getByText('All time'));
    expect(onPresetChange).toHaveBeenCalledWith('all');
  });

  it('highlights the selected preset', () => {
    const { container } = render(
      <DateRangeFilter {...defaultProps} selectedPreset={7} />
    );

    const btn7 = screen.getByText('7 days');
    expect(btn7).toHaveClass('bg-background');

    const btn30 = screen.getByText('30 days');
    expect(btn30).not.toHaveClass('bg-background');
  });

  it('does not show "Custom" button by default', () => {
    render(<DateRangeFilter {...defaultProps} />);
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
  });

  it('shows "Custom" button when showCustomPicker is true', () => {
    render(<DateRangeFilter {...defaultProps} showCustomPicker />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('does not show custom date pickers when preset is not "custom"', () => {
    render(
      <DateRangeFilter
        {...defaultProps}
        showCustomPicker
        customRange={{ from: new Date('2024-01-01'), to: new Date('2024-06-01') }}
      />
    );
    // The date pickers (calendar popovers) should not be rendered
    expect(screen.queryByText('to')).not.toBeInTheDocument();
  });

  it('shows custom date pickers when preset is "custom" and showCustomPicker is true', () => {
    const from = new Date('2024-01-15');
    const to = new Date('2024-06-15');
    render(
      <DateRangeFilter
        selectedPreset="custom"
        onPresetChange={vi.fn()}
        showCustomPicker
        customRange={{ from, to }}
        onCustomRangeChange={vi.fn()}
      />
    );

    // "to" separator text should be visible
    expect(screen.getByText('to')).toBeInTheDocument();
    // The formatted dates should appear in the buttons
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
  });
});

describe('getDateRangeFromPreset', () => {
  it('returns custom range when preset is "custom" and range provided', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2024-06-01');
    const result = getDateRangeFromPreset('custom', { from, to });

    expect(result.from).toBe(from);
    expect(result.to).toBe(to);
  });

  it('returns range starting from 2000 for "all"', () => {
    const result = getDateRangeFromPreset('all');
    expect(result.from.getFullYear()).toBe(2000);
  });

  it('returns correct range for "thisWeek"', () => {
    const result = getDateRangeFromPreset('thisWeek');
    const expected = startOfWeek(new Date());
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('returns correct range for "thisMonth"', () => {
    const result = getDateRangeFromPreset('thisMonth');
    const expected = startOfMonth(new Date());
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('returns correct range for numeric preset (e.g. 30)', () => {
    const result = getDateRangeFromPreset(30);
    const expected = subDays(new Date(), 30);
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });
});

describe('DateRangeFilter - additional preset and custom range coverage', () => {
  const defaultProps = {
    selectedPreset: 30 as const,
    onPresetChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all preset buttons including period presets', () => {
    render(<DateRangeFilter {...defaultProps} />);

    // Day presets
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('60 days')).toBeInTheDocument();
    expect(screen.getByText('90 days')).toBeInTheDocument();
    expect(screen.getByText('1 year')).toBeInTheDocument();
    expect(screen.getByText('All time')).toBeInTheDocument();

    // Period presets
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('handles custom date range selection by showing from and to dates', () => {
    const from = new Date('2024-03-01');
    const to = new Date('2024-03-31');
    render(
      <DateRangeFilter
        selectedPreset="custom"
        onPresetChange={vi.fn()}
        showCustomPicker
        customRange={{ from, to }}
        onCustomRangeChange={vi.fn()}
      />
    );

    // Both date buttons should show the formatted dates
    expect(screen.getByText('Mar 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Mar 31, 2024')).toBeInTheDocument();
    // The "to" separator should be visible
    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('shows active preset highlighted with bg-background class', () => {
    render(<DateRangeFilter {...defaultProps} selectedPreset={90} />);

    const btn90 = screen.getByText('90 days');
    expect(btn90).toHaveClass('bg-background');

    // Other day presets should not be highlighted
    const btn7 = screen.getByText('7 days');
    expect(btn7).not.toHaveClass('bg-background');

    const btn30 = screen.getByText('30 days');
    expect(btn30).not.toHaveClass('bg-background');

    const btn60 = screen.getByText('60 days');
    expect(btn60).not.toHaveClass('bg-background');
  });

  it('highlights "This week" when selected', () => {
    render(
      <DateRangeFilter
        selectedPreset="thisWeek"
        onPresetChange={vi.fn()}
      />
    );

    const thisWeekBtn = screen.getByText('This week');
    expect(thisWeekBtn).toHaveClass('bg-background');

    const thisMonthBtn = screen.getByText('This month');
    expect(thisMonthBtn).not.toHaveClass('bg-background');
  });

  it('highlights "This month" when selected', () => {
    render(
      <DateRangeFilter
        selectedPreset="thisMonth"
        onPresetChange={vi.fn()}
      />
    );

    const thisMonthBtn = screen.getByText('This month');
    expect(thisMonthBtn).toHaveClass('bg-background');

    const thisWeekBtn = screen.getByText('This week');
    expect(thisWeekBtn).not.toHaveClass('bg-background');
  });

  it('highlights "Custom" button when custom preset is selected', () => {
    render(
      <DateRangeFilter
        selectedPreset="custom"
        onPresetChange={vi.fn()}
        showCustomPicker
      />
    );

    const customBtn = screen.getByText('Custom');
    expect(customBtn).toHaveClass('bg-background');
  });
});

describe('getDateRangeFromPreset - additional coverage', () => {
  it('returns correct range for 7 days', () => {
    const result = getDateRangeFromPreset(7);
    const expected = subDays(new Date(), 7);
    expect(result.from.toDateString()).toBe(expected.toDateString());
    expect(result.to.toDateString()).toBe(new Date().toDateString());
  });

  it('returns correct range for 60 days', () => {
    const result = getDateRangeFromPreset(60);
    const expected = subDays(new Date(), 60);
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('returns correct range for 90 days', () => {
    const result = getDateRangeFromPreset(90);
    const expected = subDays(new Date(), 90);
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('returns correct range for 365 days (1 year)', () => {
    const result = getDateRangeFromPreset(365);
    const expected = subDays(new Date(), 365);
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('falls back to 30 days for unrecognized string preset without custom range', () => {
    // When 'custom' is passed without a customRange, it falls through to the default
    const result = getDateRangeFromPreset('custom');
    const expected = subDays(new Date(), 30);
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('returns correct range for last2Months', () => {
    const result = getDateRangeFromPreset('last2Months');
    const expected = startOfMonth(subMonths(new Date(), 1));
    expect(result.from.toDateString()).toBe(expected.toDateString());
    expect(result.to.toDateString()).toBe(new Date().toDateString());
  });

  it('returns correct range for last3Months', () => {
    const result = getDateRangeFromPreset('last3Months');
    const expected = startOfMonth(subMonths(new Date(), 2));
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('returns correct range for last6Months', () => {
    const result = getDateRangeFromPreset('last6Months');
    const expected = startOfMonth(subMonths(new Date(), 5));
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });

  it('returns correct range for last1Year', () => {
    const result = getDateRangeFromPreset('last1Year');
    const expected = startOfMonth(subMonths(new Date(), 11));
    expect(result.from.toDateString()).toBe(expected.toDateString());
  });
});

describe('DateRangeFilter - insightsMode', () => {
  const defaultProps = {
    selectedPreset: 'thisMonth' as const,
    onPresetChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders only insights presets when insightsMode is true', () => {
    render(<DateRangeFilter {...defaultProps} insightsMode />);

    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('Last 2 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 6 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 1 Year')).toBeInTheDocument();

    // Standard presets should NOT be present
    expect(screen.queryByText('7 days')).not.toBeInTheDocument();
    expect(screen.queryByText('30 days')).not.toBeInTheDocument();
    expect(screen.queryByText('All time')).not.toBeInTheDocument();
    expect(screen.queryByText('This week')).not.toBeInTheDocument();
  });

  it('does not show "Last" prefix label in insightsMode', () => {
    render(<DateRangeFilter {...defaultProps} insightsMode />);
    // The "Last" prefix from the standard daysPresets row should not appear
    const lastLabels = screen.queryAllByText('Last');
    // "Last" only appears as part of preset labels, not as standalone
    expect(screen.queryByText(/^Last$/)).not.toBeInTheDocument();
  });

  it('calls onPresetChange with insights presets', async () => {
    const user = userEvent.setup();
    const onPresetChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onPresetChange={onPresetChange} insightsMode />);

    await user.click(screen.getByText('Last 3 Months'));
    expect(onPresetChange).toHaveBeenCalledWith('last3Months');

    await user.click(screen.getByText('Last 1 Year'));
    expect(onPresetChange).toHaveBeenCalledWith('last1Year');
  });

  it('highlights selected preset in insightsMode', () => {
    render(
      <DateRangeFilter
        selectedPreset="last6Months"
        onPresetChange={vi.fn()}
        insightsMode
      />
    );

    const btn = screen.getByText('Last 6 Months');
    expect(btn).toHaveClass('bg-background');

    const otherBtn = screen.getByText('Last 2 Months');
    expect(otherBtn).not.toHaveClass('bg-background');
  });

  it('does not show custom date picker in insightsMode', () => {
    render(
      <DateRangeFilter
        {...defaultProps}
        insightsMode
        showCustomPicker
        customRange={{ from: new Date('2024-01-01'), to: new Date('2024-06-01') }}
      />
    );

    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    expect(screen.queryByText('to')).not.toBeInTheDocument();
  });
});
