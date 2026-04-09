import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownOptionsManager } from '../DropdownOptionsManager';

describe('DropdownOptionsManager', () => {
  const defaultProps = {
    title: 'Trading Strategies',
    description: 'Manage your trading strategy options',
    options: ['Scalping', 'Swing Trading', 'Day Trading'],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title and description', () => {
    render(<DropdownOptionsManager {...defaultProps} />);

    expect(screen.getByText('Trading Strategies')).toBeInTheDocument();
    expect(screen.getByText('Manage your trading strategy options')).toBeInTheDocument();
  });

  it('renders all existing options as badges', () => {
    render(<DropdownOptionsManager {...defaultProps} />);

    expect(screen.getByText('Scalping')).toBeInTheDocument();
    expect(screen.getByText('Swing Trading')).toBeInTheDocument();
    expect(screen.getByText('Day Trading')).toBeInTheDocument();
  });

  it('renders the "Add" button', () => {
    render(<DropdownOptionsManager {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
  });

  it('shows input field when "Add" button is clicked', async () => {
    const user = userEvent.setup();
    render(<DropdownOptionsManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Add/i }));

    expect(screen.getByPlaceholderText('Add new option...')).toBeInTheDocument();
  });

  it('shows input field with custom placeholder', async () => {
    const user = userEvent.setup();
    render(
      <DropdownOptionsManager {...defaultProps} placeholder="Add a strategy..." />
    );

    await user.click(screen.getByRole('button', { name: /Add/i }));

    expect(screen.getByPlaceholderText('Add a strategy...')).toBeInTheDocument();
  });

  it('calls onAdd when a new option is submitted', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<DropdownOptionsManager {...defaultProps} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /Add/i }));

    const input = screen.getByPlaceholderText('Add new option...');
    await user.type(input, 'Position Trading');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith('Position Trading');
  });

  it('calls onAdd when Enter is pressed in the input', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<DropdownOptionsManager {...defaultProps} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /Add/i }));

    const input = screen.getByPlaceholderText('Add new option...');
    await user.type(input, 'Momentum{Enter}');

    expect(onAdd).toHaveBeenCalledWith('Momentum');
  });

  it('does not add duplicate options', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<DropdownOptionsManager {...defaultProps} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /Add/i }));

    const input = screen.getByPlaceholderText('Add new option...');
    await user.type(input, 'Scalping{Enter}');

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('disables Add button when input is empty', async () => {
    const user = userEvent.setup();
    render(<DropdownOptionsManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Add/i }));

    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).toBeDisabled();
  });

  it('calls onRemove when the remove button on an option is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<DropdownOptionsManager {...defaultProps} onRemove={onRemove} />);

    // Each badge has an X button. Find them by the SVG icon.
    const removeButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-x')
    );

    // Click the first remove button (for "Scalping")
    await user.click(removeButtons[0]);

    expect(onRemove).toHaveBeenCalledWith('Scalping');
  });

  it('cancels adding when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<DropdownOptionsManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Add/i }));
    expect(screen.getByPlaceholderText('Add new option...')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    // Input should be gone, Add button should be back
    expect(screen.queryByPlaceholderText('Add new option...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
  });

  it('cancels adding when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    render(<DropdownOptionsManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Add/i }));
    expect(screen.getByPlaceholderText('Add new option...')).toBeInTheDocument();

    // Find the cancel/close button (the one with X icon that is NOT a badge remove button)
    // It's the ghost variant button in the add row
    const closeButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    // The last X button is the cancel button in the add row
    await user.click(closeButtons[closeButtons.length - 1]);

    expect(screen.queryByPlaceholderText('Add new option...')).not.toBeInTheDocument();
  });

  it('renders with empty options array', () => {
    render(<DropdownOptionsManager {...defaultProps} options={[]} />);

    expect(screen.getByText('Trading Strategies')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
  });

  it('shows "Saving" text when isPendingAdd', () => {
    render(
      <DropdownOptionsManager
        {...defaultProps}
        pendingAction="add"
        pendingValue="New Option"
      />
    );
    expect(screen.getByText('Saving')).toBeInTheDocument();
  });
});
