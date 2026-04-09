import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploader } from '../ImageUploader';
import { TradeImage } from '@/types/trade';

// Mock CachedImage
vi.mock('../CachedImage', () => ({
  CachedImage: ({ src, alt, className, onClick }: any) => (
    <img data-testid="cached-image" src={src} alt={alt} className={className} onClick={onClick} />
  ),
}));

// Mock DynamicSelect
vi.mock('../DynamicSelect', () => ({
  DynamicSelect: ({ value, onChange, placeholder }: any) => (
    <select
      data-testid="dynamic-select"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      <option value="1H">1H</option>
      <option value="4H">4H</option>
    </select>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, className, ...props }: any) => (
    <button type={type} onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: any) => (
    <textarea
      data-testid="textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: any) => <label className={className}>{children}</label>,
}));

vi.mock('@/components/ui/text-enhancer-button', () => ({
  TextEnhancerButton: () => <button data-testid="text-enhancer">Enhance</button>,
}));

vi.mock('lucide-react', () => ({
  ImagePlus: () => <span data-testid="icon-image-plus" />,
  Trash2: () => <span data-testid="icon-trash" />,
  X: () => <span data-testid="icon-x" />,
}));

const makeImage = (overrides: Partial<TradeImage> = {}): TradeImage => ({
  id: 'img-1',
  url: 'data:image/png;base64,abc123',
  timeframe: '1H',
  description: 'Entry chart screenshot',
  ...overrides,
});

describe('ImageUploader', () => {
  const defaultProps = {
    images: [] as TradeImage[],
    onChange: vi.fn(),
    timeframeOptions: ['1H', '4H', '1D'],
    onAddTimeframe: vi.fn(),
    onRemoveTimeframe: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with drop zone text', () => {
    render(<ImageUploader {...defaultProps} />);

    expect(screen.getByText(/Drop images here or click to upload/)).toBeInTheDocument();
    expect(screen.getByText(/Support multiple screenshots/)).toBeInTheDocument();
  });

  it('shows upload icon', () => {
    render(<ImageUploader {...defaultProps} />);

    expect(screen.getByTestId('icon-image-plus')).toBeInTheDocument();
  });

  it('has a hidden file input element', () => {
    render(<ImageUploader {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/*');
    expect(fileInput).toHaveAttribute('multiple');
    expect(fileInput).toHaveClass('hidden');
  });

  it('shows image previews when images exist (data URL)', () => {
    const images = [
      makeImage({ id: 'img-1', url: 'data:image/png;base64,abc123', description: 'Entry chart' }),
      makeImage({ id: 'img-2', url: 'data:image/png;base64,def456', description: 'Exit chart' }),
    ];

    render(<ImageUploader {...defaultProps} images={images} />);

    // Data URL images render as regular <img> tags (not CachedImage)
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Screenshot 1')).toBeInTheDocument();
    expect(screen.getByText('Screenshot 2')).toBeInTheDocument();
  });

  it('shows image previews using CachedImage for non-data-URL images', () => {
    const images = [
      makeImage({ id: 'img-1', url: undefined }),
    ];

    render(<ImageUploader {...defaultProps} images={images} />);

    expect(screen.getByTestId('cached-image')).toBeInTheDocument();
  });

  it('removes an image when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const images = [
      makeImage({ id: 'img-1', url: 'data:image/png;base64,abc' }),
      makeImage({ id: 'img-2', url: 'data:image/png;base64,def' }),
    ];

    render(<ImageUploader {...defaultProps} images={images} onChange={onChange} />);

    // Find delete buttons (the Trash2 icon buttons)
    const deleteButtons = screen.getAllByTestId('icon-trash');
    expect(deleteButtons).toHaveLength(2);

    // Click the first delete button
    await user.click(deleteButtons[0].closest('button')!);

    expect(onChange).toHaveBeenCalledWith([images[1]]);
  });

  it('passes className prop to root element', () => {
    const { container } = render(
      <ImageUploader {...defaultProps} className="custom-uploader-class" />
    );

    expect(container.firstChild).toHaveClass('custom-uploader-class');
  });

  it('shows timeframe selector and description for each image', () => {
    const images = [makeImage({ id: 'img-1', url: 'data:image/png;base64,abc', description: 'Entry chart screenshot' })];

    render(<ImageUploader {...defaultProps} images={images} />);

    expect(screen.getByText('Timeframe')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByTestId('dynamic-select')).toBeInTheDocument();
    expect(screen.getByTestId('textarea')).toHaveValue('Entry chart screenshot');
  });

  it('calls onChange with updated description when textarea changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const images = [makeImage({ id: 'img-1', url: 'data:image/png;base64,abc', description: '' })];

    render(<ImageUploader {...defaultProps} images={images} onChange={onChange} />);

    const textarea = screen.getByTestId('textarea');
    await user.type(textarea, 'N');

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'img-1', description: 'N' }),
    ]);
  });

  it('does not show image grid when no images', () => {
    render(<ImageUploader {...defaultProps} images={[]} />);

    expect(screen.queryByText('Screenshot 1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cached-image')).not.toBeInTheDocument();
  });

  it('triggers file input click when upload button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImageUploader {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    // Click the upload button area
    const uploadButton = screen.getByText(/Drop images here or click to upload/).closest('button')!;
    await user.click(uploadButton);

    expect(clickSpy).toHaveBeenCalled();
  });
});
