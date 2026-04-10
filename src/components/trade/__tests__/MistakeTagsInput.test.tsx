import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MistakeTagsInput } from '../MistakeTagsInput';

describe('MistakeTagsInput', () => {
  const defaultProps = {
    selectedTags: [] as string[],
    onChange: vi.fn(),
    availableTags: ['FOMO', 'Revenge Trading', 'No Stop Loss', 'Over-leveraged'],
    onAddNew: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all available tags', () => {
    render(<MistakeTagsInput {...defaultProps} />);

    expect(screen.getByText('FOMO')).toBeInTheDocument();
    expect(screen.getByText('Revenge Trading')).toBeInTheDocument();
    expect(screen.getByText('No Stop Loss')).toBeInTheDocument();
    expect(screen.getByText('Over-leveraged')).toBeInTheDocument();
  });

  it('renders the "Add New Mistake" button', () => {
    render(<MistakeTagsInput {...defaultProps} />);
    expect(screen.getByText('Add New Mistake')).toBeInTheDocument();
  });

  it('adds a tag when an unselected tag is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MistakeTagsInput {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByText('FOMO'));

    expect(onChange).toHaveBeenCalledWith(['FOMO']);
  });

  it('removes a tag when a selected tag is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MistakeTagsInput
        {...defaultProps}
        selectedTags={['FOMO', 'No Stop Loss']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('FOMO'));

    expect(onChange).toHaveBeenCalledWith(['No Stop Loss']);
  });

  it('shows input field when "Add New Mistake" is clicked', async () => {
    const user = userEvent.setup();
    render(<MistakeTagsInput {...defaultProps} />);

    await user.click(screen.getByText('Add New Mistake'));

    expect(screen.getByPlaceholderText('Enter new mistake...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('calls onAddNew and onChange when adding a new tag', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    const onChange = vi.fn();
    render(
      <MistakeTagsInput
        {...defaultProps}
        selectedTags={['FOMO']}
        onAddNew={onAddNew}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('Add New Mistake'));

    const input = screen.getByPlaceholderText('Enter new mistake...');
    await user.type(input, 'Moved Stop Loss');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddNew).toHaveBeenCalledWith('Moved Stop Loss');
    expect(onChange).toHaveBeenCalledWith(['FOMO', 'Moved Stop Loss']);
  });

  it('adds a new tag when pressing Enter', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    const onChange = vi.fn();
    render(
      <MistakeTagsInput
        {...defaultProps}
        onAddNew={onAddNew}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('Add New Mistake'));

    const input = screen.getByPlaceholderText('Enter new mistake...');
    await user.type(input, 'Early Exit{Enter}');

    expect(onAddNew).toHaveBeenCalledWith('Early Exit');
    expect(onChange).toHaveBeenCalledWith(['Early Exit']);
  });

  it('does not add a duplicate tag', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    render(<MistakeTagsInput {...defaultProps} onAddNew={onAddNew} />);

    await user.click(screen.getByText('Add New Mistake'));

    const input = screen.getByPlaceholderText('Enter new mistake...');
    await user.type(input, 'FOMO{Enter}');

    expect(onAddNew).not.toHaveBeenCalled();
  });

  it('cancels adding when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<MistakeTagsInput {...defaultProps} />);

    await user.click(screen.getByText('Add New Mistake'));
    expect(screen.getByPlaceholderText('Enter new mistake...')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    // Should be back to showing the "Add New Mistake" button
    expect(screen.getByText('Add New Mistake')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter new mistake...')).not.toBeInTheDocument();
  });

  it('disables Add button when input is empty', async () => {
    const user = userEvent.setup();
    render(<MistakeTagsInput {...defaultProps} />);

    await user.click(screen.getByText('Add New Mistake'));

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});

describe('MistakeTagsInput – additional coverage', () => {
  const defaultProps = {
    selectedTags: [] as string[],
    onChange: vi.fn(),
    availableTags: ['FOMO', 'Revenge Trading', 'No Stop Loss', 'Over-leveraged'],
    onAddNew: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handles empty availableTags array', () => {
    render(
      <MistakeTagsInput
        {...defaultProps}
        availableTags={[]}
      />
    );

    // No tag buttons should render, but "Add New Mistake" should still be available
    expect(screen.queryByText('FOMO')).not.toBeInTheDocument();
    expect(screen.getByText('Add New Mistake')).toBeInTheDocument();
  });

  it('removes a tag on click when it is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MistakeTagsInput
        {...defaultProps}
        selectedTags={['FOMO', 'No Stop Loss', 'Over-leveraged']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('No Stop Loss'));

    expect(onChange).toHaveBeenCalledWith(['FOMO', 'Over-leveraged']);
  });

  it('prevents adding a duplicate tag via the input', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    const onChange = vi.fn();
    render(
      <MistakeTagsInput
        {...defaultProps}
        onAddNew={onAddNew}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('Add New Mistake'));
    const input = screen.getByPlaceholderText('Enter new mistake...');
    await user.type(input, 'Revenge Trading{Enter}');

    // "Revenge Trading" already exists in availableTags, so it should not be added
    expect(onAddNew).not.toHaveBeenCalled();
  });

  it('handles very long tag text by rendering it fully', () => {
    const longTag = 'This is a very long mistake tag that describes a complex trading error in great detail';
    render(
      <MistakeTagsInput
        {...defaultProps}
        availableTags={[longTag]}
      />
    );

    expect(screen.getByText(longTag)).toBeInTheDocument();
  });

  it('trims whitespace from input before adding new tag', async () => {
    const user = userEvent.setup();
    const onAddNew = vi.fn();
    const onChange = vi.fn();
    render(
      <MistakeTagsInput
        {...defaultProps}
        selectedTags={[]}
        onAddNew={onAddNew}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('Add New Mistake'));
    const input = screen.getByPlaceholderText('Enter new mistake...');
    await user.type(input, '  Trimmed Tag  {Enter}');

    expect(onAddNew).toHaveBeenCalledWith('Trimmed Tag');
    expect(onChange).toHaveBeenCalledWith(['Trimmed Tag']);
  });
});
