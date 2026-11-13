import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploader } from '../ImageUploader';
import { TradeImage } from '@/types/trade';

const upload = vi.hoisted(() => ({ uploadScreenshot: vi.fn() }));
vi.mock('../imageUpload', async (orig) => ({ ...(await orig<object>()), uploadScreenshot: upload.uploadScreenshot }));

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
    expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
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

describe('ImageUploader – additional coverage', () => {
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

  it('handles multiple file upload via file input', async () => {
    const onChange = vi.fn();
    render(<ImageUploader {...defaultProps} onChange={onChange} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // The input accepts multiple files
    expect(fileInput).toHaveAttribute('multiple');
    expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  });

  it('shows image preview for data URL images', () => {
    const images: TradeImage[] = [
      {
        id: 'img-preview-1',
        url: 'data:image/png;base64,preview123',
        timeframe: '4H',
        description: 'Preview test',
      },
    ];

    render(<ImageUploader {...defaultProps} images={images} />);

    const imgs = screen.getAllByRole('img');
    const dataImg = imgs.find((img) => img.getAttribute('src') === 'data:image/png;base64,preview123');
    expect(dataImg).toBeInTheDocument();
    expect(screen.getByText('Screenshot 1')).toBeInTheDocument();
  });

  it('removes image on delete click and calls onChange with remaining images', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const images: TradeImage[] = [
      { id: 'img-a', url: 'data:image/png;base64,aaa', timeframe: '1H', description: 'First' },
      { id: 'img-b', url: 'data:image/png;base64,bbb', timeframe: '4H', description: 'Second' },
      { id: 'img-c', url: 'data:image/png;base64,ccc', timeframe: '1D', description: 'Third' },
    ];

    render(<ImageUploader {...defaultProps} images={images} onChange={onChange} />);

    // Delete the second image
    const deleteButtons = screen.getAllByTestId('icon-trash');
    expect(deleteButtons).toHaveLength(3);
    await user.click(deleteButtons[1].closest('button')!);

    expect(onChange).toHaveBeenCalledWith([images[0], images[2]]);
  });

  it('handles empty images array without rendering image grid', () => {
    render(<ImageUploader {...defaultProps} images={[]} />);

    expect(screen.queryByText('Screenshot 1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument();
    // Upload area should still be present
    expect(screen.getByText(/Drop images here or click to upload/)).toBeInTheDocument();
  });

  it('renders CachedImage for non-data-URL images (image IDs)', () => {
    const images: TradeImage[] = [
      { id: 'img-s3-key', url: undefined as any, timeframe: '1H', description: 'S3 image' },
    ];

    render(<ImageUploader {...defaultProps} images={images} />);

    expect(screen.getByTestId('cached-image')).toBeInTheDocument();
  });
});

describe('ImageUploader screenshots (X-003, FE-013, FE-046, FE-047, FE-048)', () => {
  const png = (name = 'chart.png') => new File(['x'], name, { type: 'image/png' });
  const base = { images: [] as TradeImage[], onChange: vi.fn(), timeframeOptions: ['1H'], onAddTimeframe: vi.fn() };
  const input = () => document.querySelector('input[type="file"]') as HTMLInputElement;

  beforeEach(() => {
    vi.clearAllMocks();
    upload.uploadScreenshot.mockReset();
  });

  it('uploads a picked file and adds it by its S3 key', async () => {
    const onChange = vi.fn();
    const onBusyChange = vi.fn();
    upload.uploadScreenshot.mockResolvedValue('images/u1/upload/a.jpg');
    render(<ImageUploader {...base} onChange={onChange} onBusyChange={onBusyChange} />);
    await userEvent.upload(input(), png());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([{ id: 'images/u1/upload/a.jpg', timeframe: '1H', description: '' }]));
    expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  });

  it('skips files the API does not take and says which', async () => {
    const onChange = vi.fn();
    render(<ImageUploader {...base} onChange={onChange} />);
    await userEvent.setup({ applyAccept: false }).upload(input(), new File(['x'], 'shot.heic', { type: 'image/heic' }));
    expect(screen.getByRole('alert')).toHaveTextContent('shot.heic is not a JPEG, PNG, WebP or GIF image.');
    expect(upload.uploadScreenshot).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps a trade to 6 screenshots', async () => {
    const onChange = vi.fn();
    const five = Array.from({ length: 5 }, (_, i) => makeImage({ id: `i${i}`, url: undefined }));
    upload.uploadScreenshot.mockResolvedValue('images/u1/upload/new.jpg');
    render(<ImageUploader {...base} images={five} onChange={onChange} />);
    await userEvent.upload(input(), [png('a.png'), png('b.png')]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(upload.uploadScreenshot).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(6);
    expect(screen.getByRole('alert')).toHaveTextContent('at most 6 screenshots');
  });

  it('uploads files dropped on the drop area and stops the browser opening them', async () => {
    const onChange = vi.fn();
    upload.uploadScreenshot.mockResolvedValue('images/u1/upload/d.jpg');
    render(<ImageUploader {...base} onChange={onChange} />);
    const zone = screen.getByText(/Drop images here/).closest('button')!.parentElement!;
    expect(fireEvent.dragOver(zone)).toBe(false);
    expect(fireEvent.drop(zone, { dataTransfer: { files: [png()] } })).toBe(false);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'images/u1/upload/d.jpg' })]));
  });

  it('merges into the images as they are when the upload ends, so a description typed meanwhile survives', async () => {
    const onChange = vi.fn();
    let finish!: (key: string) => void;
    upload.uploadScreenshot.mockReturnValue(new Promise<string>((resolve) => (finish = resolve)));
    const first = makeImage({ id: 'old', url: undefined, description: '' });
    const { rerender } = render(<ImageUploader {...base} images={[first]} onChange={onChange} />);
    await userEvent.upload(input(), png());
    rerender(<ImageUploader {...base} images={[{ ...first, description: 'typed while uploading' }]} onChange={onChange} />);
    finish('images/u1/upload/n.jpg');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'old', description: 'typed while uploading' }), expect.objectContaining({ id: 'images/u1/upload/n.jpg' })]));
  });

  it('shows why an upload failed and adds nothing', async () => {
    const onChange = vi.fn();
    upload.uploadScreenshot.mockRejectedValue(new Error('Screenshots can be at most 2 MB.'));
    render(<ImageUploader {...base} onChange={onChange} />);
    await userEvent.upload(input(), png('big.png'));
    expect(await screen.findByRole('alert')).toHaveTextContent('big.png: Screenshots can be at most 2 MB.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('names the icon-only buttons and opens the large preview as a dialog that Esc closes', async () => {
    render(<ImageUploader {...base} images={[makeImage()]} />);
    expect(screen.getByRole('button', { name: 'Remove screenshot 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enlarge screenshot 1' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not remount the previews on a re-render (the image component is module level)', () => {
    const images = [makeImage({ id: 'img-1', url: 'data:image/png;base64,abc' })];
    const { rerender } = render(<ImageUploader {...base} images={images} />);
    const before = screen.getAllByRole('img')[0];
    rerender(<ImageUploader {...base} images={[{ ...images[0], description: 'more' }]} />);
    expect(screen.getAllByRole('img')[0]).toBe(before);
  });
});
