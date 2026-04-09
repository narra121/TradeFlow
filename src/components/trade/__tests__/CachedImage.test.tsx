import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CachedImage } from '../CachedImage';

// Mock the useCachedImage hook
const mockUseCachedImage = vi.fn();
vi.mock('@/hooks/useCachedImage', () => ({
  useCachedImage: (...args: unknown[]) => mockUseCachedImage(...args),
}));

// Mock Skeleton to be easily testable
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

describe('CachedImage', () => {
  beforeEach(() => {
    mockUseCachedImage.mockReset();
  });

  it('renders img element with cached URL when loaded', () => {
    mockUseCachedImage.mockReturnValue({
      src: 'blob:http://localhost/cached-image-url',
      isLoading: false,
      error: null,
    });

    render(
      <CachedImage src="image-key-123" alt="Trade screenshot" />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:http://localhost/cached-image-url');
    expect(img).toHaveAttribute('alt', 'Trade screenshot');
  });

  it('shows loading skeleton while image is loading', () => {
    mockUseCachedImage.mockReturnValue({
      src: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <CachedImage src="image-key-123" alt="Trade screenshot" />
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows fallback image when there is an error', () => {
    mockUseCachedImage.mockReturnValue({
      src: undefined,
      isLoading: false,
      error: { status: 500, data: 'Server error' },
    });

    render(
      <CachedImage src="image-key-123" alt="Trade screenshot" />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/placeholder.svg');
  });

  it('uses custom fallbackSrc when provided and there is an error', () => {
    mockUseCachedImage.mockReturnValue({
      src: undefined,
      isLoading: false,
      error: { status: 404, data: 'Not found' },
    });

    render(
      <CachedImage
        src="image-key-123"
        alt="Trade screenshot"
        fallbackSrc="/custom-fallback.png"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/custom-fallback.png');
  });

  it('passes className prop to the img element', () => {
    mockUseCachedImage.mockReturnValue({
      src: 'blob:http://localhost/cached-url',
      isLoading: false,
      error: null,
    });

    render(
      <CachedImage
        src="image-key-123"
        alt="Trade screenshot"
        className="w-full h-auto object-contain"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveClass('w-full', 'h-auto', 'object-contain');
  });

  it('passes className to skeleton while loading', () => {
    mockUseCachedImage.mockReturnValue({
      src: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <CachedImage
        src="image-key-123"
        alt="Trade screenshot"
        className="custom-class"
      />
    );

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('custom-class');
  });

  it('calls useCachedImage hook with the correct imageId', () => {
    mockUseCachedImage.mockReturnValue({
      src: 'blob:http://localhost/cached-url',
      isLoading: false,
      error: null,
    });

    render(
      <CachedImage src="my-image-key-456" alt="Screenshot" />
    );

    expect(mockUseCachedImage).toHaveBeenCalledWith('my-image-key-456');
  });

  it('handles onClick callback', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    mockUseCachedImage.mockReturnValue({
      src: 'blob:http://localhost/cached-url',
      isLoading: false,
      error: null,
    });

    render(
      <CachedImage
        src="image-key-123"
        alt="Trade screenshot"
        onClick={handleClick}
      />
    );

    await user.click(screen.getByRole('img'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('sets fallback src on img native error event', () => {
    mockUseCachedImage.mockReturnValue({
      src: 'blob:http://localhost/broken-url',
      isLoading: false,
      error: null,
    });

    render(
      <CachedImage src="image-key-123" alt="Trade screenshot" />
    );

    const img = screen.getByRole('img') as HTMLImageElement;

    // Simulate the native image load error
    img.dispatchEvent(new Event('error', { bubbles: true }));

    expect(img.src).toContain('/placeholder.svg');
  });
});
