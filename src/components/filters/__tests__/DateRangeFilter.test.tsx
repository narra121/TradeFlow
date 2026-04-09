import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter, getDateRangeFromPreset } from '../DateRangeFilter';
import { startOfWeek, startOfMonth, subDays } from 'date-fns';

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
