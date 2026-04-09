import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeDetailModal } from '../TradeDetailModal';
import { Trade } from '@/types/trade';

// Mock Dialog from radix to render inline (no portals)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children, className }: any) => <div data-testid="dialog-header" className={className}>{children}</div>,
  DialogTitle: ({ children, className }: any) => <h2 data-testid="dialog-title" className={className}>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock CachedImage
vi.mock('@/components/trade/CachedImage', () => ({
  CachedImage: ({ src, alt, className }: any) => (
    <img data-testid="cached-image" src={src} alt={alt} className={className} />
  ),
}));

// Mock ImageViewerModal
vi.mock('@/components/trade/ImageViewerModal', () => ({
  ImageViewerModal: ({ isOpen, imageId }: any) =>
    isOpen ? <div data-testid="image-viewer-modal">{imageId}</div> : null,
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  X: () => <span data-testid="icon-x" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
}));

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-1',
  symbol: 'AAPL',
  direction: 'LONG',
  entryPrice: 175.50,
  exitPrice: 180.25,
  stopLoss: 173.00,
  takeProfit: 182.00,
  size: 100,
  entryDate: '2025-03-15T09:30:00Z',
  exitDate: '2025-03-15T15:30:00Z',
  outcome: 'TP',
  pnl: 475.00,
  riskRewardRatio: 1.90,
  notes: 'Strong earnings play with bullish setup',
  session: 'New York',
  marketCondition: 'Bullish',
  setup: 'Flag breakout',
  strategy: 'Momentum',
  keyLesson: 'Trust the pattern and let winners run',
  images: [],
  tags: ['earnings', 'momentum'],
  mistakes: [],
  ...overrides,
});

describe('TradeDetailModal', () => {
  const defaultProps = {
    trade: makeTrade(),
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Trade Details" title when open with a trade', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Trade Details');
  });

  it('renders trade symbol', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('renders direction badge - BUY for LONG', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('BUY')).toBeInTheDocument();
  });

  it('renders direction badge - SELL for SHORT', () => {
    const shortTrade = makeTrade({ direction: 'SHORT', pnl: -200 });

    render(<TradeDetailModal {...defaultProps} trade={shortTrade} />);

    expect(screen.getByText('SELL')).toBeInTheDocument();
  });

  it('shows entry and exit prices', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Entry Price')).toBeInTheDocument();
    expect(screen.getByText('175.5')).toBeInTheDocument();
    expect(screen.getByText('Exit Price')).toBeInTheDocument();
    expect(screen.getByText('180.25')).toBeInTheDocument();
  });

  it('shows dash for missing exit price', () => {
    const openTrade = makeTrade({ exitPrice: undefined });

    render(<TradeDetailModal {...defaultProps} trade={openTrade} />);

    // The exit price field should show a dash
    const exitPriceLabel = screen.getByText('Exit Price');
    const exitPriceContainer = exitPriceLabel.closest('div')!;
    expect(exitPriceContainer).toHaveTextContent('—');
  });

  it('shows positive P&L value with plus sign', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText(/PnL: \+\$475\.00/)).toBeInTheDocument();
  });

  it('shows negative P&L value without plus sign', () => {
    const losingTrade = makeTrade({ pnl: -200.50 });

    render(<TradeDetailModal {...defaultProps} trade={losingTrade} />);

    expect(screen.getByText(/PnL: \$-200\.50/)).toBeInTheDocument();
  });

  it('shows trade dates formatted correctly', () => {
    const trade = makeTrade({
      entryDate: '2025-03-15T09:30:00',
      exitDate: '2025-03-15T15:30:00',
    });

    render(<TradeDetailModal {...defaultProps} trade={trade} />);

    expect(screen.getByText('Open Date')).toBeInTheDocument();
    expect(screen.getByText('Close Date')).toBeInTheDocument();
    expect(screen.getByText('2025-03-15 09:30')).toBeInTheDocument();
    expect(screen.getByText('2025-03-15 15:30')).toBeInTheDocument();
  });

  it('shows dash for missing exit date', () => {
    const openTrade = makeTrade({ exitDate: undefined });

    render(<TradeDetailModal {...defaultProps} trade={openTrade} />);

    const closeDateLabel = screen.getByText('Close Date');
    const closeDateContainer = closeDateLabel.closest('div')!;
    expect(closeDateContainer).toHaveTextContent('—');
  });

  it('shows TP badge when trade has takeProfit', () => {
    const trade = makeTrade({ takeProfit: 182 });

    render(<TradeDetailModal {...defaultProps} trade={trade} />);

    expect(screen.getByText('TP')).toBeInTheDocument();
  });

  it('shows trade notes', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Strong earnings play with bullish setup')).toBeInTheDocument();
  });

  it('does not show notes section when trade has no notes', () => {
    const noNotesTrade = makeTrade({ notes: undefined });

    render(<TradeDetailModal {...defaultProps} trade={noNotesTrade} />);

    // The "Notes" label should not appear in the detail view (not as a field label)
    const allNotesTexts = screen.queryAllByText('Notes');
    // If notes are absent, the notes section header should not appear
    expect(allNotesTexts).toHaveLength(0);
  });

  it('shows key lesson when present', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Key Lesson')).toBeInTheDocument();
    expect(screen.getByText('Trust the pattern and let winners run')).toBeInTheDocument();
  });

  it('does not show key lesson section when not present', () => {
    const trade = makeTrade({ keyLesson: undefined });

    render(<TradeDetailModal {...defaultProps} trade={trade} />);

    expect(screen.queryByText('Key Lesson')).not.toBeInTheDocument();
  });

  it('shows images section with CachedImage when trade has images', () => {
    const tradeWithImages = makeTrade({
      images: [
        { id: 'img-1', timeframe: '1H', description: 'Entry chart' },
        { id: 'img-2', timeframe: '4H', description: 'Higher TF context' },
      ],
    });

    render(<TradeDetailModal {...defaultProps} trade={tradeWithImages} />);

    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('4H')).toBeInTheDocument();
    expect(screen.getByText('Entry chart')).toBeInTheDocument();
    expect(screen.getByText('Higher TF context')).toBeInTheDocument();
    expect(screen.getAllByTestId('cached-image')).toHaveLength(2);
  });

  it('shows "No screenshots attached" when trade has no images', () => {
    const tradeNoImages = makeTrade({ images: [] });

    render(<TradeDetailModal {...defaultProps} trade={tradeNoImages} />);

    expect(screen.getByText('No screenshots attached')).toBeInTheDocument();
  });

  it('shows trending up icon for winning trade with no images', () => {
    const winTrade = makeTrade({ pnl: 500, images: [] });

    render(<TradeDetailModal {...defaultProps} trade={winTrade} />);

    expect(screen.getByTestId('icon-trending-up')).toBeInTheDocument();
  });

  it('shows trending down icon for losing trade with no images', () => {
    const loseTrade = makeTrade({ pnl: -200, images: [] });

    render(<TradeDetailModal {...defaultProps} trade={loseTrade} />);

    expect(screen.getByTestId('icon-trending-down')).toBeInTheDocument();
  });

  it('does not render when trade is null', () => {
    const { container } = render(
      <TradeDetailModal {...defaultProps} trade={null} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('does not render dialog when open=false', () => {
    render(<TradeDetailModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows navigation buttons', () => {
    render(
      <TradeDetailModal
        {...defaultProps}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        hasPrevious={true}
        hasNext={true}
      />
    );

    expect(screen.getByText('Prev')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('disables prev button when hasPrevious=false', () => {
    render(
      <TradeDetailModal
        {...defaultProps}
        hasPrevious={false}
        hasNext={true}
      />
    );

    expect(screen.getByText('Prev').closest('button')).toBeDisabled();
    expect(screen.getByText('Next').closest('button')).not.toBeDisabled();
  });

  it('disables next button when hasNext=false', () => {
    render(
      <TradeDetailModal
        {...defaultProps}
        hasPrevious={true}
        hasNext={false}
      />
    );

    expect(screen.getByText('Prev').closest('button')).not.toBeDisabled();
    expect(screen.getByText('Next').closest('button')).toBeDisabled();
  });

  it('calls onPrevious when prev button clicked', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();

    render(
      <TradeDetailModal
        {...defaultProps}
        onPrevious={onPrevious}
        hasPrevious={true}
      />
    );

    await user.click(screen.getByText('Prev').closest('button')!);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button clicked', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    render(
      <TradeDetailModal
        {...defaultProps}
        onNext={onNext}
        hasNext={true}
      />
    );

    await user.click(screen.getByText('Next').closest('button')!);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('shows current index and total count', () => {
    render(
      <TradeDetailModal
        {...defaultProps}
        currentIndex={3}
        totalCount={15}
      />
    );

    expect(screen.getByText('4/15')).toBeInTheDocument();
  });

  it('shows risk/reward ratio', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Risk/Reward')).toBeInTheDocument();
    expect(screen.getByText('1.90')).toBeInTheDocument();
  });

  it('shows quantity/size', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows session and market condition', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText('Bullish')).toBeInTheDocument();
  });

  it('shows setup and strategy', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Flag breakout')).toBeInTheDocument();
    expect(screen.getByText('Strategy')).toBeInTheDocument();
    expect(screen.getByText('Momentum')).toBeInTheDocument();
  });

  it('shows tags when trade has tags', () => {
    render(<TradeDetailModal {...defaultProps} />);

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('earnings')).toBeInTheDocument();
    expect(screen.getByText('momentum')).toBeInTheDocument();
  });

  it('does not show tags section when trade has no tags', () => {
    const trade = makeTrade({ tags: undefined });

    render(<TradeDetailModal {...defaultProps} trade={trade} />);

    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('shows mistakes when trade has mistakes', () => {
    const tradeWithMistakes = makeTrade({
      mistakes: ['Entered too early', 'Did not follow plan'],
    });

    render(<TradeDetailModal {...defaultProps} trade={tradeWithMistakes} />);

    expect(screen.getByText('Mistakes')).toBeInTheDocument();
    expect(screen.getByText('Entered too early')).toBeInTheDocument();
    expect(screen.getByText('Did not follow plan')).toBeInTheDocument();
  });

  it('does not show mistakes section when no mistakes', () => {
    const trade = makeTrade({ mistakes: [] });

    render(<TradeDetailModal {...defaultProps} trade={trade} />);

    expect(screen.queryByText('Mistakes')).not.toBeInTheDocument();
  });

  it('opens image viewer modal when clicking on a trade image', async () => {
    const user = userEvent.setup();
    const tradeWithImages = makeTrade({
      images: [
        { id: 'img-1', timeframe: '1H', description: 'Entry' },
      ],
    });

    render(<TradeDetailModal {...defaultProps} trade={tradeWithImages} />);

    // Initially, image viewer modal is not open
    expect(screen.queryByTestId('image-viewer-modal')).not.toBeInTheDocument();

    // Click on the image area (the div wrapping CachedImage)
    const cachedImage = screen.getByTestId('cached-image');
    await user.click(cachedImage.closest('[class*="cursor-pointer"]')!);

    // Now the image viewer should be open
    expect(screen.getByTestId('image-viewer-modal')).toBeInTheDocument();
    expect(screen.getByTestId('image-viewer-modal')).toHaveTextContent('img-1');
  });
});
