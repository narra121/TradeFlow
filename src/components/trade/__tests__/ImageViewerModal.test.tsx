import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageViewerModal } from '../ImageViewerModal';

// Mock useCachedImage hook
const mockUseCachedImage = vi.fn();
vi.mock('@/hooks/useCachedImage', () => ({
  useCachedImage: (...args: unknown[]) => mockUseCachedImage(...args),
}));

// Mock Dialog from radix to render inline
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children?: ReactNode; className?: string }) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: HTMLAttributes<HTMLSpanElement>) => <span data-testid="badge" {...props}>{children}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('lucide-react', () => ({
  ZoomIn: () => <span data-testid="icon-zoom-in" />,
  ZoomOut: () => <span data-testid="icon-zoom-out" />,
  Minimize2: () => <span data-testid="icon-minimize" />,
  X: ({ className }: { className?: string }) => <span data-testid="icon-x" className={className} />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
  RotateCcw: () => <span data-testid="icon-rotate" />,
}));

describe('ImageViewerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    imageId: 'test-image-id',
    timeframe: '1H',
    description: 'Entry confirmation screenshot',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCachedImage.mockReturnValue({
      src: 'blob:http://localhost/test-image-url',
      isLoading: false,
      error: null,
    });
  });

  it('renders image when open', () => {
    render(<ImageViewerModal {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:http://localhost/test-image-url');
    expect(img).toHaveAttribute('alt', 'Trade screenshot');
  });

  it('does not render when closed', () => {
    render(<ImageViewerModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows timeframe badge when timeframe is provided', () => {
    render(<ImageViewerModal {...defaultProps} timeframe="4H" />);

    expect(screen.getByText('4H')).toBeInTheDocument();
  });

  it('does not show timeframe badge when not provided', () => {
    render(<ImageViewerModal {...defaultProps} timeframe={undefined} />);

    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });

  it('shows description panel when description is provided', () => {
    render(<ImageViewerModal {...defaultProps} />);

    expect(screen.getByText('Entry confirmation screenshot')).toBeInTheDocument();
  });

  it('does not show description panel when description is not provided', () => {
    render(<ImageViewerModal {...defaultProps} description={undefined} />);

    expect(screen.queryByText('Entry confirmation screenshot')).not.toBeInTheDocument();
  });

  it('shows close button that calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ImageViewerModal {...defaultProps} onClose={onClose} />);

    // The close button contains the X icon
    const xIcons = screen.getAllByTestId('icon-x');
    // The close button is the one in the header controls
    const closeButton = xIcons.find(
      icon => icon.closest('button')
    )?.closest('button');

    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows zoom controls', () => {
    render(<ImageViewerModal {...defaultProps} />);

    expect(screen.getByTestId('icon-zoom-in')).toBeInTheDocument();
    expect(screen.getByTestId('icon-zoom-out')).toBeInTheDocument();
    // Shows 100% zoom level text
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows zoom percentage that updates on zoom in', async () => {
    const user = userEvent.setup();
    render(<ImageViewerModal {...defaultProps} />);

    expect(screen.getByText('100%')).toBeInTheDocument();

    const zoomInButton = screen.getByTestId('icon-zoom-in').closest('button')!;
    await user.click(zoomInButton);

    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('shows zoom percentage that updates on zoom out', async () => {
    const user = userEvent.setup();
    render(<ImageViewerModal {...defaultProps} />);

    const zoomOutButton = screen.getByTestId('icon-zoom-out').closest('button')!;
    await user.click(zoomOutButton);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows loading skeleton while image is loading', () => {
    mockUseCachedImage.mockReturnValue({
      src: undefined,
      isLoading: true,
      error: null,
    });

    render(<ImageViewerModal {...defaultProps} />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows error state when image fails to load', () => {
    mockUseCachedImage.mockReturnValue({
      src: undefined,
      isLoading: false,
      error: { status: 500, data: 'Error' },
    });

    render(<ImageViewerModal {...defaultProps} />);

    expect(screen.getByText('Failed to load image')).toBeInTheDocument();
  });

  it('says why the image failed: the API message, or the connection message when nothing answered', () => {
    mockUseCachedImage.mockReturnValue({ src: undefined, isLoading: false, error: { status: 'CUSTOM_ERROR', error: 'Image not found', data: 'Image not found' } });
    const { unmount } = render(<ImageViewerModal {...defaultProps} />);
    expect(screen.getByText('Image not found')).toBeInTheDocument();
    unmount();

    mockUseCachedImage.mockReturnValue({ src: undefined, isLoading: false, error: { status: 'FETCH_ERROR', error: "Can't reach TradeQut.", data: "Can't reach TradeQut. Check your internet connection and try again." } });
    render(<ImageViewerModal {...defaultProps} />);
    expect(screen.getByText(/internet connection/i)).toBeInTheDocument();
  });

  it('calls useCachedImage with the correct imageId', () => {
    render(<ImageViewerModal {...defaultProps} imageId="my-special-image" />);

    expect(mockUseCachedImage).toHaveBeenCalledWith('my-special-image');
  });

  it('shows reset button and fit-to-screen button', () => {
    render(<ImageViewerModal {...defaultProps} />);

    expect(screen.getByTestId('icon-rotate')).toBeInTheDocument();
    expect(screen.getByTestId('icon-minimize')).toBeInTheDocument();
  });

  it('toggles description visibility with eye button', async () => {
    const user = userEvent.setup();
    render(<ImageViewerModal {...defaultProps} />);

    // Description is visible initially
    expect(screen.getByText('Entry confirmation screenshot')).toBeInTheDocument();
    // Eye icon is shown (description visible)
    expect(screen.getByTestId('icon-eye')).toBeInTheDocument();

    // Click the eye toggle button
    const eyeButton = screen.getByTestId('icon-eye').closest('button')!;
    await user.click(eyeButton);

    // Description should be hidden
    expect(screen.queryByText('Entry confirmation screenshot')).not.toBeInTheDocument();
    // Now shows eye-off
    expect(screen.getByTestId('icon-eye-off')).toBeInTheDocument();
  });

  it('names every icon-only button (FE-048)', () => {
    render(<ImageViewerModal {...defaultProps} />);
    for (const name of ['Zoom out', 'Zoom in', 'Reset zoom', 'Fit to screen', 'Show description', 'Close viewer']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('zooms with the wheel through a non-passive listener that stops the page scrolling (FE-048)', () => {
    const add = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    render(<ImageViewerModal {...defaultProps} />);
    expect(add.mock.calls.some(([type, , opts]) => type === 'wheel' && (opts as AddEventListenerOptions).passive === false)).toBe(true);
    add.mockRestore();

    const area = screen.getByRole('img').parentElement!;
    expect(screen.getByText('100%')).toBeInTheDocument();
    const notPrevented = fireEvent.wheel(area, { deltaY: -100 });
    expect(notPrevented).toBe(false);
    expect(screen.getByText('110%')).toBeInTheDocument();
  });
});
