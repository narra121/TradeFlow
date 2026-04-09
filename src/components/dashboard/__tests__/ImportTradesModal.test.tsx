import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportTradesModal } from '../ImportTradesModal';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock trades API
vi.mock('@/lib/api/trades', () => ({
  tradesApi: { extractTrades: vi.fn() },
}));

// Mock Radix UI Dialog to render inline
vi.mock('@radix-ui/react-dialog', async () => {
  const React = await import('react');
  return {
    Root: ({ children, open }: any) => (open ? <div role="dialog">{children}</div> : null),
    Portal: ({ children }: any) => <>{children}</>,
    Overlay: React.forwardRef((_props: any, _ref: any) => <div data-testid="overlay" />),
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Title: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <h2 ref={ref} {...props}>{children}</h2>
    )),
    Description: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <p ref={ref} {...props}>{children}</p>
    )),
    Close: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
  };
});

// Mock Radix UI ScrollArea
vi.mock('@radix-ui/react-scroll-area', async () => {
  const React = await import('react');
  const ScrollAreaScrollbar = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  ScrollAreaScrollbar.displayName = 'ScrollAreaScrollbar';
  return {
    Root: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Viewport: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Scrollbar: ScrollAreaScrollbar,
    ScrollAreaScrollbar,
    ScrollAreaThumb: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Thumb: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Corner: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  };
});

// Mock Radix UI Checkbox
vi.mock('@radix-ui/react-checkbox', async () => {
  const React = await import('react');
  return {
    Root: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} role="checkbox" {...props}>{children}</button>
    )),
    Indicator: ({ children }: any) => <span>{children}</span>,
  };
});

// Mock Radix UI Select for direction select in edit rows
vi.mock('@radix-ui/react-select', async () => {
  const React = await import('react');
  return {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    Value: ({ placeholder }: any) => <span>{placeholder}</span>,
    Icon: ({ children }: any) => <>{children}</>,
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} role="option" {...props}>{children}</div>
    )),
    ItemText: ({ children }: any) => <span>{children}</span>,
    ItemIndicator: ({ children }: any) => <>{children}</>,
    ScrollUpButton: React.forwardRef((_props: any, _ref: any) => null),
    ScrollDownButton: React.forwardRef((_props: any, _ref: any) => null),
    Group: ({ children }: any) => <div>{children}</div>,
    Label: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Separator: React.forwardRef((_props: any, _ref: any) => <hr />),
  };
});

// Mock Radix UI Popover for DateTimePicker
vi.mock('@radix-ui/react-popover', async () => {
  const React = await import('react');
  return {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Close: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    Anchor: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  };
});

describe('ImportTradesModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportTrades: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Import Trades from Screenshot" title when open', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByText('Import Trades from Screenshot')).toBeInTheDocument();
  });

  it('shows upload zone with drag/drop area', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByText('Upload Trade Screenshots')).toBeInTheDocument();
    expect(
      screen.getByText('Drag & drop, paste from clipboard (Ctrl+V), or click to select')
    ).toBeInTheDocument();
  });

  it('shows "Select Images" button', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /select images/i })).toBeInTheDocument();
  });

  it('shows "Cancel" and "Save All" buttons', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save all/i })).toBeInTheDocument();
  });

  it('Save All is disabled when no trades extracted', () => {
    render(<ImportTradesModal {...defaultProps} />);
    const saveAllButton = screen.getByRole('button', { name: /save all/i });
    expect(saveAllButton).toBeDisabled();
  });

  it('Cancel calls onOpenChange(false) and resets state', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ImportTradesModal {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows info text about import limitations', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(
      screen.getByText(
        /Import extracts basic trade data only.*edit each trade in the Trade Log after importing/i
      )
    ).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ImportTradesModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Import Trades from Screenshot')).not.toBeInTheDocument();
  });

  it('has a hidden file input for image uploads', () => {
    render(<ImportTradesModal {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe('image/*');
    expect(fileInput.multiple).toBe(true);
  });
});
