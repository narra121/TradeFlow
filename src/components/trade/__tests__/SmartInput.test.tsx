import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartInput } from '../SmartInput';

describe('SmartInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    suggestions: ['AAPL', 'AMZN', 'GOOG', 'MSFT', 'TSLA', 'META', 'NVDA'],
    onAddNew: vi.fn(),
    placeholder: 'Enter symbol...',
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input with placeholder', () => {
    render(<SmartInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter symbol...')).toBeInTheDocument();
  });

  it('displays the current value in the input', () => {
    render(<SmartInput {...defaultProps} value="AAPL" />);
    expect(screen.getByDisplayValue('AAPL')).toBeInTheDocument();
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SmartInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.type(input, 'A');

    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('shows suggestions dropdown when input is focused', async () => {
    const user = userEvent.setup();
    // When value is empty, it shows up to first 5 suggestions
    render(<SmartInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.click(input);

    // Should show the first 5 suggestions
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('AMZN')).toBeInTheDocument();
    expect(screen.getByText('GOOG')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
  });

  it('filters suggestions based on the current value', async () => {
    const user = userEvent.setup();
    render(<SmartInput {...defaultProps} value="AA" />);

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.click(input);

    // Only AAPL matches "AA"
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('AMZN')).not.toBeInTheDocument();
    expect(screen.queryByText('GOOG')).not.toBeInTheDocument();
  });

  it('calls onChange with the selected suggestion', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SmartInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.click(input);
    await user.click(screen.getByText('GOOG'));

    expect(onChange).toHaveBeenCalledWith('GOOG');
  });

  it('shows "Create" button when typed value is not in suggestions', async () => {
    const user = userEvent.setup();
    render(<SmartInput {...defaultProps} value="XYZ" />);

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.click(input);

    expect(screen.getByText(/Create "XYZ"/)).toBeInTheDocument();
  });

  it('does not show "Create" button when typed value matches a suggestion', async () => {
    const user = userEvent.setup();
    render(<SmartInput {...defaultProps} value="AAPL" />);

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.click(input);

    expect(screen.queryByText(/Create "AAPL"/)).not.toBeInTheDocument();
  });

  it('calls onAddNew when the Create button is clicked', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<SmartInput {...defaultProps} value="XYZ" onAddNew={onAddNew} />);

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.click(input);
    await user.click(screen.getByText(/Create "XYZ"/));

    expect(onAddNew).toHaveBeenCalledWith('XYZ');
  });

  it('hides suggestions dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button data-testid="outside">Outside</button>
        <SmartInput {...defaultProps} />
      </div>
    );

    const input = screen.getByPlaceholderText('Enter symbol...');
    await user.click(input);

    // Suggestions visible
    expect(screen.getByText('AAPL')).toBeInTheDocument();

    // Click outside
    await user.click(screen.getByTestId('outside'));

    // Suggestions should be hidden
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });
});
