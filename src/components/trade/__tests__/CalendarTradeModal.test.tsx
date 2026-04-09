import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarTradeModal } from '../CalendarTradeModal';
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

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  ArrowUpRight: () => <span data-testid="icon-arrow-up-right" />,
  ArrowDownRight: () => <span data-testid="icon-arrow-down-right" />,
}));

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-1',
  symbol: 'EURUSD',
  direction: 'LONG',
  entryPrice: 1.1050,
  exitPrice: 1.1100,
  stopLoss: 1.1000,
  takeProfit: 1.1150,
  size: 100000,
  entryDate: '2025-03-15T09:30:00Z',
  exitDate: '2025-03-15T14:00:00Z',
  outcome: 'TP',
  pnl: 250.00,
  riskRewardRatio: 2.0,
  notes: 'Clean breakout trade',
  session: 'London',
  marketCondition: 'Trending',
  setup: 'Breakout',
  strategy: 'Momentum',
  images: [],
  tags: ['forex', 'breakout'],
  mistakes: [],
  ...overrides,
});

describe('CalendarTradeModal', () => {
  const defaultDate = new Date('2025-03-15');
  const defaultProps = {
    trades: [makeTrade()],
    selectedDate: defaultDate,
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal title with formatted date when open', () => {
    render(<CalendarTradeModal {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Trades on March 15th, 2025');
  });

  it('shows trade details for selected trade', () => {
    render(<CalendarTradeModal {...defaultProps} />);

    // EURUSD appears in both sidebar and detail section
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/PnL: \+\$250\.00/)).toBeInTheDocument();
    expect(screen.getByText('1.105')).toBeInTheDocument(); // entry price
    expect(screen.getByText('1.11')).toBeInTheDocument(); // exit price
    expect(screen.getByText('2.00')).toBeInTheDocument(); // risk/reward
  });

  it('shows trade count in sidebar', () => {
    const trades = [
      makeTrade({ id: 't1', symbol: 'EURUSD' }),
      makeTrade({ id: 't2', symbol: 'GBPUSD', pnl: -100, direction: 'SHORT' }),
    ];

    render(
      <CalendarTradeModal {...defaultProps} trades={trades} />
    );

    // The sidebar header shows trade count
    const tradeCountTexts = screen.getAllByText(/Trades \(2\)/);
    expect(tradeCountTexts.length).toBeGreaterThan(0);
  });

  it('shows list of trades in the sidebar', () => {
    const trades = [
      makeTrade({ id: 't1', symbol: 'EURUSD', pnl: 250 }),
      makeTrade({ id: 't2', symbol: 'GBPUSD', pnl: -100, direction: 'SHORT' }),
    ];

    render(
      <CalendarTradeModal {...defaultProps} trades={trades} />
    );

    // EURUSD appears in both sidebar and detail (first trade is selected by default)
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    expect(screen.getByText('+$250.00')).toBeInTheDocument();
    expect(screen.getByText('$-100.00')).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(<CalendarTradeModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('returns null when trades list is empty', () => {
    const { container } = render(
      <CalendarTradeModal {...defaultProps} trades={[]} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('navigates between trades using sidebar buttons', async () => {
    const user = userEvent.setup();
    const trades = [
      makeTrade({ id: 't1', symbol: 'EURUSD', pnl: 250 }),
      makeTrade({ id: 't2', symbol: 'GBPUSD', pnl: -100 }),
    ];

    render(
      <CalendarTradeModal {...defaultProps} trades={trades} />
    );

    // Initially shows first trade detail
    // The detail section shows symbol in the header card
    expect(screen.getByText(/PnL: \+\$250\.00/)).toBeInTheDocument();

    // Click on second trade in sidebar
    await user.click(screen.getByText('GBPUSD'));

    // Now shows second trade's PnL
    expect(screen.getByText(/PnL: \$-100\.00/)).toBeInTheDocument();
  });

  it('shows day navigation buttons', () => {
    const onPreviousDay = vi.fn();
    const onNextDay = vi.fn();

    render(
      <CalendarTradeModal
        {...defaultProps}
        onPreviousDay={onPreviousDay}
        onNextDay={onNextDay}
        hasPreviousDay={true}
        hasNextDay={true}
      />
    );

    const prevBtn = screen.getByText('Prev');
    const nextBtn = screen.getByText('Next');
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
    expect(prevBtn.closest('button')).not.toBeDisabled();
    expect(nextBtn.closest('button')).not.toBeDisabled();
  });

  it('disables prev/next day buttons when no adjacent days', () => {
    render(
      <CalendarTradeModal
        {...defaultProps}
        hasPreviousDay={false}
        hasNextDay={false}
      />
    );

    const prevBtn = screen.getByText('Prev').closest('button');
    const nextBtn = screen.getByText('Next').closest('button');
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });

  it('shows day index/total when provided', () => {
    render(
      <CalendarTradeModal
        {...defaultProps}
        currentDayIndex={2}
        totalDays={10}
      />
    );

    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('shows notes section when trade has notes', () => {
    const tradeWithNotes = makeTrade({ notes: 'Clean breakout trade' });

    render(
      <CalendarTradeModal {...defaultProps} trades={[tradeWithNotes]} />
    );

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Clean breakout trade')).toBeInTheDocument();
  });

  it('shows trade images when available', () => {
    const tradeWithImages = makeTrade({
      images: [
        { id: 'img-1', timeframe: '1H', description: 'Entry chart' },
        { id: 'img-2', timeframe: '4H', description: 'Higher TF' },
      ],
    });

    render(
      <CalendarTradeModal {...defaultProps} trades={[tradeWithImages]} />
    );

    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('4H')).toBeInTheDocument();
    expect(screen.getByText('Entry chart')).toBeInTheDocument();
    expect(screen.getByText('Higher TF')).toBeInTheDocument();
    expect(screen.getAllByTestId('cached-image')).toHaveLength(2);
  });

  it('shows "No screenshots attached" when trade has no images', () => {
    const tradeNoImages = makeTrade({ images: [] });

    render(
      <CalendarTradeModal {...defaultProps} trades={[tradeNoImages]} />
    );

    expect(screen.getByText('No screenshots attached')).toBeInTheDocument();
  });

  it('shows BUY badge for LONG trades and SELL badge for SHORT trades', () => {
    const longTrade = makeTrade({ direction: 'LONG' });

    const { rerender } = render(
      <CalendarTradeModal {...defaultProps} trades={[longTrade]} />
    );

    expect(screen.getByText('BUY')).toBeInTheDocument();

    const shortTrade = makeTrade({ id: 't2', direction: 'SHORT', pnl: -50 });

    rerender(
      <CalendarTradeModal {...defaultProps} trades={[shortTrade]} />
    );

    expect(screen.getByText('SELL')).toBeInTheDocument();
  });

  it('shows tags when trade has tags', () => {
    const tradeWithTags = makeTrade({ tags: ['forex', 'breakout', 'london'] });

    render(
      <CalendarTradeModal {...defaultProps} trades={[tradeWithTags]} />
    );

    expect(screen.getByText('forex')).toBeInTheDocument();
    expect(screen.getByText('breakout')).toBeInTheDocument();
    expect(screen.getByText('london')).toBeInTheDocument();
  });

  it('shows mistakes when trade has mistakes', () => {
    const tradeWithMistakes = makeTrade({ mistakes: ['Moved stop loss', 'Entered too early'] });

    render(
      <CalendarTradeModal {...defaultProps} trades={[tradeWithMistakes]} />
    );

    expect(screen.getByText('Moved stop loss')).toBeInTheDocument();
    expect(screen.getByText('Entered too early')).toBeInTheDocument();
  });

  it('shows session and market condition', () => {
    const trade = makeTrade({ session: 'London', marketCondition: 'Trending' });

    render(
      <CalendarTradeModal {...defaultProps} trades={[trade]} />
    );

    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });
});
