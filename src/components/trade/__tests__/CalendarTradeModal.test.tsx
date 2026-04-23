import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarTradeModal } from '../CalendarTradeModal';
import { Trade } from '@/types/trade';

// Mock RTK Query hooks (used by TradeDetailContent internally)
const mockRulesData = [
  { ruleId: 'rule-1', rule: 'Always use stop loss', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
];
const mockAccountsData = {
  accounts: [
    { id: 'acc-1', name: 'Test Account', broker: 'FTMO', type: 'prop_challenge' as const, status: 'active' as const, balance: 100000, initialBalance: 100000, currency: 'USD', createdAt: '' },
  ],
};

vi.mock('@/store/api', () => ({
  useGetRulesQuery: () => ({ data: mockRulesData }),
  useGetAccountsQuery: () => ({ data: mockAccountsData }),
}));

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

// Mock lucide-react icons (includes icons from TradeDetailContent)
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  ArrowUpRight: (props: any) => <span data-testid="icon-arrow-up-right" {...props} />,
  ArrowDownRight: (props: any) => <span data-testid="icon-arrow-down-right" {...props} />,
  Pencil: (props: any) => <span data-testid="pencil-icon" {...props} />,
  Trash2: (props: any) => <span data-testid="trash2-icon" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="icon-alert-triangle" {...props} />,
  Check: (props: any) => <span data-testid="icon-check" {...props} />,
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
  brokenRuleIds: [],
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
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('March 15th, 2025');
  });

  it('shows trade details for selected trade via TradeDetailContent', () => {
    render(<CalendarTradeModal {...defaultProps} />);

    // EURUSD appears in both sidebar and detail header
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(2);
    // PnL appears in both sidebar and detail header
    expect(screen.getAllByText('+$250.00').length).toBeGreaterThanOrEqual(1);
    // KPI strip shows entry/exit prices
    expect(screen.getByText('1.105')).toBeInTheDocument(); // entry price
    expect(screen.getByText('1.11')).toBeInTheDocument(); // exit price
    // R:R shown in KPI strip
    expect(screen.getByText('2.00')).toBeInTheDocument();
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
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    // PnL appears in sidebar; first trade's PnL also in detail header
    expect(screen.getAllByText('+$250.00').length).toBeGreaterThanOrEqual(1);
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

  it('navigates between trades using sidebar click', async () => {
    const user = userEvent.setup();
    const trades = [
      makeTrade({ id: 't1', symbol: 'EURUSD', pnl: 250 }),
      makeTrade({ id: 't2', symbol: 'GBPUSD', pnl: -100 }),
    ];

    render(
      <CalendarTradeModal {...defaultProps} trades={trades} />
    );

    // Initially shows first trade detail -- TradeDetailContent header shows symbol
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(2); // sidebar + detail header

    // Click on second trade in sidebar
    await user.click(screen.getByText('GBPUSD'));

    // Now shows second trade's symbol in the detail header
    expect(screen.getAllByText('GBPUSD').length).toBeGreaterThanOrEqual(2);
  });

  it('shows day navigation buttons', async () => {
    const user = userEvent.setup();
    const onPreviousDay = vi.fn();
    const onNextDay = vi.fn();

    render(
      <CalendarTradeModal
        {...defaultProps}
        onPreviousDay={onPreviousDay}
        onNextDay={onNextDay}
        hasPreviousDay={true}
        hasNextDay={true}
        currentDayIndex={1}
        totalDays={5}
      />
    );

    // Day nav buttons are icon-only (ghost variant) in the header
    // Find day counter to verify day nav is present
    expect(screen.getByText('2/5')).toBeInTheDocument();

    // Get all buttons in the dialog header area
    const header = screen.getByTestId('dialog-header');
    const headerButtons = header.querySelectorAll('button:not([disabled])');
    expect(headerButtons.length).toBeGreaterThanOrEqual(2);

    // Click first chevron (prev day) and last relevant chevron (next day)
    await user.click(headerButtons[0]);
    expect(onPreviousDay).toHaveBeenCalled();
  });

  it('disables prev/next day buttons when no adjacent days', () => {
    render(
      <CalendarTradeModal
        {...defaultProps}
        hasPreviousDay={false}
        hasNextDay={false}
        currentDayIndex={0}
        totalDays={1}
      />
    );

    const header = screen.getByTestId('dialog-header');
    // Day nav buttons should be disabled; find buttons that contain chevron icons
    const disabledButtons = header.querySelectorAll('button[disabled]');
    expect(disabledButtons.length).toBeGreaterThanOrEqual(2);
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

    // TradeDetailContent shows hero image with timeframe overlay
    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('Entry chart')).toBeInTheDocument();
    // Hero image + 2 thumbnails = 3 CachedImage elements
    expect(screen.getAllByTestId('cached-image')).toHaveLength(3);
    expect(screen.getByText('2 screenshots')).toBeInTheDocument();
  });

  it('shows "No screenshots attached" when trade has no images', () => {
    const tradeNoImages = makeTrade({ images: [] });

    render(
      <CalendarTradeModal {...defaultProps} trades={[tradeNoImages]} />
    );

    expect(screen.getByText('No screenshots attached')).toBeInTheDocument();
  });

  it('shows LONG badge for LONG trades and SHORT badge for SHORT trades', () => {
    const longTrade = makeTrade({ direction: 'LONG' });

    const { rerender } = render(
      <CalendarTradeModal {...defaultProps} trades={[longTrade]} />
    );

    // TradeDetailContent shows LONG/SHORT (not BUY/SELL)
    expect(screen.getByText('LONG')).toBeInTheDocument();

    const shortTrade = makeTrade({ id: 't2', direction: 'SHORT', pnl: -50 });

    rerender(
      <CalendarTradeModal {...defaultProps} trades={[shortTrade]} />
    );

    expect(screen.getByText('SHORT')).toBeInTheDocument();
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

  it('shows session and market condition in trade context', () => {
    const trade = makeTrade({ session: 'London', marketCondition: 'Trending' });

    render(
      <CalendarTradeModal {...defaultProps} trades={[trade]} />
    );

    // TradeDetailContent shows these in the Trade Context card
    expect(screen.getAllByText('London').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  // --- Edit / Delete ---

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<CalendarTradeModal {...defaultProps} onEdit={onEdit} />);
    await user.click(screen.getByText('Edit').closest('button')!);
    expect(onEdit).toHaveBeenCalledWith(defaultProps.trades[0]);
  });

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<CalendarTradeModal {...defaultProps} onDelete={onDelete} />);
    await user.click(screen.getByText('Delete').closest('button')!);
    expect(onDelete).toHaveBeenCalledWith('trade-1');
  });
});
