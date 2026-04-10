import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DynamicSelect } from '../DynamicSelect';

describe('DynamicSelect', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    options: ['Apple', 'Banana', 'Cherry'],
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with the default placeholder', () => {
    render(<DynamicSelect {...defaultProps} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Select...');
  });

  it('renders with a custom placeholder', () => {
    render(<DynamicSelect {...defaultProps} placeholder="Pick a fruit" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Pick a fruit');
  });

  it('displays the selected value instead of placeholder', () => {
    render(<DynamicSelect {...defaultProps} value="Banana" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
  });

  it('shows options when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<DynamicSelect {...defaultProps} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup();
    render(<DynamicSelect {...defaultProps} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Banana'));

    expect(defaultProps.onChange).toHaveBeenCalledWith('Banana');
  });

  it('shows the "Add New" button when onAddNew is provided', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<DynamicSelect {...defaultProps} onAddNew={onAddNew} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Add New')).toBeInTheDocument();
  });

  it('does not show the "Add New" button when onAddNew is not provided', async () => {
    const user = userEvent.setup();
    render(<DynamicSelect {...defaultProps} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.queryByText('Add New')).not.toBeInTheDocument();
  });

  it('shows input field when "Add New" is clicked', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<DynamicSelect {...defaultProps} onAddNew={onAddNew} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Add New'));

    expect(screen.getByPlaceholderText('Enter new value...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('calls onAddNew and onChange when adding a new option', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<DynamicSelect {...defaultProps} onAddNew={onAddNew} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Add New'));

    const input = screen.getByPlaceholderText('Enter new value...');
    await user.type(input, 'Dragonfruit');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddNew).toHaveBeenCalledWith('Dragonfruit');
    expect(defaultProps.onChange).toHaveBeenCalledWith('Dragonfruit');
  });

  it('calls onAddNew when pressing Enter in the new value input', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<DynamicSelect {...defaultProps} onAddNew={onAddNew} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Add New'));

    const input = screen.getByPlaceholderText('Enter new value...');
    await user.type(input, 'Elderberry{Enter}');

    expect(onAddNew).toHaveBeenCalledWith('Elderberry');
  });

  it('does not add a duplicate option', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<DynamicSelect {...defaultProps} onAddNew={onAddNew} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Add New'));

    const input = screen.getByPlaceholderText('Enter new value...');
    await user.type(input, 'Apple{Enter}');

    expect(onAddNew).not.toHaveBeenCalled();
  });

  it('does not add an empty value', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<DynamicSelect {...defaultProps} onAddNew={onAddNew} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Add New'));

    // The Add button should be disabled when input is empty
    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).toBeDisabled();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<DynamicSelect {...defaultProps} onRemove={onRemove} />);

    await user.click(screen.getByRole('combobox'));

    // Each option row has a remove button (X icon). Find them via the SVG inside.
    // The remove buttons are next to each option text.
    const optionRows = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    // Click the first remove button (for "Apple")
    await user.click(optionRows[0]);

    expect(onRemove).toHaveBeenCalledWith('Apple');
  });

  it('clears value when removing the currently selected option', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onChange = vi.fn();
    render(
      <DynamicSelect
        {...defaultProps}
        value="Apple"
        onChange={onChange}
        onRemove={onRemove}
      />
    );

    await user.click(screen.getByRole('combobox'));

    const removeButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith('');
    expect(onRemove).toHaveBeenCalledWith('Apple');
  });
});

describe('DynamicSelect – additional coverage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handles empty options array', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DynamicSelect value="" onChange={onChange} options={[]} />
    );

    await user.click(screen.getByRole('combobox'));

    // No option items should be rendered inside the popover
    // The "Apple", "Banana", "Cherry" texts should not exist
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.queryByText('Banana')).not.toBeInTheDocument();
    expect(screen.queryByText('Cherry')).not.toBeInTheDocument();
  });

  it('calls onAddNew when new option is typed and submitted', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    const onChange = vi.fn();
    render(
      <DynamicSelect
        value=""
        onChange={onChange}
        options={['Existing']}
        onAddNew={onAddNew}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Add New'));

    const input = screen.getByPlaceholderText('Enter new value...');
    await user.type(input, 'BrandNew');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddNew).toHaveBeenCalledWith('BrandNew');
    expect(onChange).toHaveBeenCalledWith('BrandNew');
  });

  it('calls onRemove when an option remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <DynamicSelect
        value=""
        onChange={vi.fn()}
        options={['Alpha', 'Beta', 'Gamma']}
        onRemove={onRemove}
      />
    );

    await user.click(screen.getByRole('combobox'));

    const removeButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    // Remove the second option ("Beta")
    await user.click(removeButtons[1]);

    expect(onRemove).toHaveBeenCalledWith('Beta');
  });

  it('shows placeholder text when no value is selected', () => {
    render(
      <DynamicSelect
        value=""
        onChange={vi.fn()}
        options={['One', 'Two']}
        placeholder="Choose an item"
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Choose an item');
  });

  it('shows default placeholder when no value and no custom placeholder', () => {
    render(
      <DynamicSelect
        value=""
        onChange={vi.fn()}
        options={['One']}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Select...');
  });
});
