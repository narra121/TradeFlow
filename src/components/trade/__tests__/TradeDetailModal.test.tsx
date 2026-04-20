import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeDetailModal } from '../TradeDetailModal';
import { Trade } from '@/types/trade';

// Mock RTK Query hooks
const mockRulesData = [
  { ruleId: 'rule-1', rule: 'Always use stop loss', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
  { ruleId: 'rule-2', rule: 'Max 3 trades per day', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
];
const mockAccountsData = {
  accounts: [
    { id: 'acc-1', name: 'PropFirm Challenge #2', broker: 'FTMO', type: 'prop_challenge' as const, status: 'active' as const, balance: 100000, initialBalance: 100000, currency: 'USD', createdAt: '' },
  ],
};

vi.mock('@/store/api', () => ({
  useGetRulesQuery: () => ({ data: mockRulesData }),
  useGetAccountsQuery: () => ({ data: mockAccountsData }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div data-testid="dialog-content" className={className}>{children}</div>,
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

vi.mock('@/components/trade/CachedImage', () => ({
  CachedImage: ({ src, alt, className, onClick }: any) => (
    <img data-testid="cached-image" src={src} alt={alt} className={className} onClick={onClick} />
  ),
}));

vi.mock('@/components/trade/ImageViewerModal', () => ({
  ImageViewerModal: ({ isOpen, imageId }: any) =>
    isOpen ? <div data-testid="image-viewer-modal">{imageId}</div> : null,
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  Pencil: (props: any) => <span data-testid="pencil-icon" {...props} />,
  Trash2: (props: any) => <span data-testid="trash2-icon" {...props} />,
  ArrowUpRight: (props: any) => <span data-testid="icon-arrow-up-right" {...props} />,
  ArrowDownRight: (props: any) => <span data-testid="icon-arrow-down-right" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="icon-alert-triangle" {...props} />,
  Check: (props: any) => <span data-testid="icon-check" {...props} />,
  ImageIcon: (props: any) => <span data-testid="icon-image" {...props} />,
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
  brokenRuleIds: [],
  emotions: undefined,
  newsEvents: [],
  accountId: 'acc-1',
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

  // --- Rendering basics ---

  it('renders dialog when open with a trade', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('has accessible dialog title', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Trade Details');
  });

  it('renders trade symbol in header', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('renders LONG direction badge', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('LONG')).toBeInTheDocument();
  });

  it('renders SHORT direction badge', () => {
    const shortTrade = makeTrade({ direction: 'SHORT', pnl: -200 });
    render(<TradeDetailModal {...defaultProps} trade={shortTrade} />);
    expect(screen.getByText('SHORT')).toBeInTheDocument();
  });

  it('renders outcome badge', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('TP Hit')).toBeInTheDocument();
  });

  it('renders SL Hit outcome for losing trade', () => {
    const lossTrade = makeTrade({ outcome: 'SL', pnl: -200 });
    render(<TradeDetailModal {...defaultProps} trade={lossTrade} />);
    expect(screen.getByText('SL Hit')).toBeInTheDocument();
  });

  it('does not render when trade is null', () => {
    const { container } = render(<TradeDetailModal {...defaultProps} trade={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('does not render dialog when open=false', () => {
    render(<TradeDetailModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  // --- P&L display ---

  it('shows positive P&L with plus sign', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('+$475.00')).toBeInTheDocument();
  });

  it('shows negative P&L', () => {
    const losingTrade = makeTrade({ pnl: -200.50 });
    render(<TradeDetailModal {...defaultProps} trade={losingTrade} />);
    expect(screen.getByText('$-200.50')).toBeInTheDocument();
  });

  it('shows up arrow for winning trade', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByTestId('icon-arrow-up-right')).toBeInTheDocument();
  });

  it('shows down arrow for losing trade', () => {
    const losingTrade = makeTrade({ pnl: -200 });
    render(<TradeDetailModal {...defaultProps} trade={losingTrade} />);
    expect(screen.getByTestId('icon-arrow-down-right')).toBeInTheDocument();
  });

  // --- KPI Strip ---

  it('shows KPI strip values', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('Entry')).toBeInTheDocument();
    expect(screen.getByText('175.5')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
    expect(screen.getByText('180.25')).toBeInTheDocument();
    expect(screen.getByText('Stop Loss')).toBeInTheDocument();
    expect(screen.getByText('173')).toBeInTheDocument();
    expect(screen.getByText('Take Profit')).toBeInTheDocument();
    expect(screen.getByText('182')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows R:R in KPI strip', () => {
    render(<TradeDetailModal {...defaultProps} />);
    // KPI strip sublabel
    const rrLabels = screen.getAllByText('R:R');
    expect(rrLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1.90')).toBeInTheDocument();
  });

  it('shows dash for missing exit price', () => {
    const openTrade = makeTrade({ exitPrice: undefined });
    render(<TradeDetailModal {...defaultProps} trade={openTrade} />);
    const exitLabel = screen.getByText('Exit');
    const exitContainer = exitLabel.closest('div')!.parentElement!;
    expect(exitContainer).toHaveTextContent('—');
  });

  // --- Trade Context ---

  it('shows strategy and setup in context card', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('Strategy')).toBeInTheDocument();
    expect(screen.getByText('Momentum')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Flag breakout')).toBeInTheDocument();
  });

  it('shows market and session in context card', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText('Bullish')).toBeInTheDocument();
    // Session appears in both header and context card
    expect(screen.getAllByText('New York').length).toBeGreaterThanOrEqual(1);
  });

  it('shows formatted open/close dates', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('Opened')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows dash for missing close date', () => {
    const openTrade = makeTrade({ exitDate: undefined });
    render(<TradeDetailModal {...defaultProps} trade={openTrade} />);
    const closedLabel = screen.getByText('Closed');
    const closedCell = closedLabel.closest('[class*="bg-secondary"]')!;
    expect(closedCell).toHaveTextContent('—');
  });

  // --- Duration in header ---

  it('shows duration in header when both dates exist', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('6 hours')).toBeInTheDocument();
  });

  // --- Screenshots ---

  it('shows hero screenshot when trade has images', () => {
    const tradeWithImages = makeTrade({
      images: [
        { id: 'img-1', timeframe: '1H', description: 'Entry chart' },
        { id: 'img-2', timeframe: '4H', description: 'Higher TF context' },
      ],
    });
    render(<TradeDetailModal {...defaultProps} trade={tradeWithImages} />);
    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('Entry chart')).toBeInTheDocument();
    // Hero + 2 thumbnails = 3 CachedImage elements
    expect(screen.getAllByTestId('cached-image')).toHaveLength(3);
  });

  it('shows screenshot count for multiple images', () => {
    const tradeWithImages = makeTrade({
      images: [
        { id: 'img-1', timeframe: '1H', description: 'Entry' },
        { id: 'img-2', timeframe: '4H', description: 'Context' },
      ],
    });
    render(<TradeDetailModal {...defaultProps} trade={tradeWithImages} />);
    expect(screen.getByText('2 screenshots')).toBeInTheDocument();
  });

  it('shows empty state when trade has no images', () => {
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

  it('opens image viewer modal when clicking hero screenshot', async () => {
    const user = userEvent.setup();
    const tradeWithImages = makeTrade({
      images: [{ id: 'img-1', timeframe: '1H', description: 'Entry' }],
    });
    render(<TradeDetailModal {...defaultProps} trade={tradeWithImages} />);
    expect(screen.queryByTestId('image-viewer-modal')).not.toBeInTheDocument();

    const heroContainer = screen.getAllByTestId('cached-image')[0].closest('[class*="cursor-pointer"]')!;
    await user.click(heroContainer);

    expect(screen.getByTestId('image-viewer-modal')).toBeInTheDocument();
    expect(screen.getByTestId('image-viewer-modal')).toHaveTextContent('img-1');
  });

  it('switches hero image when clicking thumbnail', async () => {
    const user = userEvent.setup();
    const tradeWithImages = makeTrade({
      images: [
        { id: 'img-1', timeframe: '1H', description: 'Entry' },
        { id: 'img-2', timeframe: '4H', description: 'Context' },
      ],
    });
    render(<TradeDetailModal {...defaultProps} trade={tradeWithImages} />);

    // Hero initially shows img-1
    const heroImage = screen.getAllByTestId('cached-image')[0];
    expect(heroImage).toHaveAttribute('src', 'img-1');

    // Click second thumbnail (index 1 = third cached-image: hero + thumb1 + thumb2)
    const thumbnails = screen.getAllByTestId('cached-image');
    await user.click(thumbnails[2].closest('button')!);

    // Hero should now show img-2
    const updatedHero = screen.getAllByTestId('cached-image')[0];
    expect(updatedHero).toHaveAttribute('src', 'img-2');
  });

  // --- Notes + Emotions ---

  it('shows trade notes', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Strong earnings play with bullish setup')).toBeInTheDocument();
  });

  it('shows empty message when trade has no notes', () => {
    const noNotesTrade = makeTrade({ notes: undefined });
    render(<TradeDetailModal {...defaultProps} trade={noNotesTrade} />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('No notes recorded')).toBeInTheDocument();
  });

  it('shows emotions when present', () => {
    const tradeWithEmotions = makeTrade({ emotions: 'Confident at entry, anxious during pullback' });
    render(<TradeDetailModal {...defaultProps} trade={tradeWithEmotions} />);
    expect(screen.getByText('Emotions')).toBeInTheDocument();
    expect(screen.getByText('Confident at entry, anxious during pullback')).toBeInTheDocument();
  });

  it('hides emotions section when not present', () => {
    const tradeNoEmotions = makeTrade({ emotions: undefined });
    render(<TradeDetailModal {...defaultProps} trade={tradeNoEmotions} />);
    expect(screen.queryByText('Emotions')).not.toBeInTheDocument();
  });

  // --- Key Lesson ---

  it('shows key lesson when present', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('Key Lesson')).toBeInTheDocument();
    expect(screen.getByText('Trust the pattern and let winners run')).toBeInTheDocument();
  });

  it('shows empty message when key lesson missing', () => {
    const trade = makeTrade({ keyLesson: undefined });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('Key Lesson')).toBeInTheDocument();
    expect(screen.getByText('No key lesson recorded')).toBeInTheDocument();
  });

  // --- Mistakes ---

  it('shows mistakes when trade has mistakes', () => {
    const tradeWithMistakes = makeTrade({
      mistakes: ['Entered too early', 'Did not follow plan'],
    });
    render(<TradeDetailModal {...defaultProps} trade={tradeWithMistakes} />);
    expect(screen.getByText('Mistakes')).toBeInTheDocument();
    expect(screen.getByText('Entered too early')).toBeInTheDocument();
    expect(screen.getByText('Did not follow plan')).toBeInTheDocument();
  });

  it('shows empty message when no mistakes', () => {
    const trade = makeTrade({ mistakes: [] });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('Mistakes')).toBeInTheDocument();
    expect(screen.getByText('Clean trade — no mistakes')).toBeInTheDocument();
  });

  // --- Broken Rules (NEW) ---

  it('resolves broken rule IDs to rule text', () => {
    const trade = makeTrade({ brokenRuleIds: ['rule-1'] });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('Broken Rules')).toBeInTheDocument();
    expect(screen.getByText('Always use stop loss')).toBeInTheDocument();
    expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
  });

  it('resolves multiple broken rules', () => {
    const trade = makeTrade({ brokenRuleIds: ['rule-1', 'rule-2'] });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('Always use stop loss')).toBeInTheDocument();
    expect(screen.getByText('Max 3 trades per day')).toBeInTheDocument();
  });

  it('shows "All rules followed" when no broken rules', () => {
    const trade = makeTrade({ brokenRuleIds: [] });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('All rules followed')).toBeInTheDocument();
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('handles unresolvable broken rule IDs gracefully', () => {
    const trade = makeTrade({ brokenRuleIds: ['nonexistent-rule'] });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('Broken Rules')).toBeInTheDocument();
    // Should show positive state since the rule couldn't be resolved
    expect(screen.getByText('All rules followed')).toBeInTheDocument();
  });

  // --- Tags ---

  it('shows tags when trade has tags', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('earnings')).toBeInTheDocument();
    expect(screen.getByText('momentum')).toBeInTheDocument();
  });

  it('shows empty message when no tags', () => {
    const trade = makeTrade({ tags: undefined });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('No tags')).toBeInTheDocument();
  });

  // --- News Events ---

  it('shows news events as badges', () => {
    const trade = makeTrade({ newsEvents: ['CPI Release', 'FOMC Minutes'] });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('CPI Release')).toBeInTheDocument();
    expect(screen.getByText('FOMC Minutes')).toBeInTheDocument();
  });

  it('shows empty message when no news events', () => {
    const trade = makeTrade({ newsEvents: [] });
    render(<TradeDetailModal {...defaultProps} trade={trade} />);
    expect(screen.getByText('None recorded')).toBeInTheDocument();
  });

  // --- Account ---

  it('shows resolved account name', () => {
    render(<TradeDetailModal {...defaultProps} />);
    expect(screen.getByText('PropFirm Challenge #2')).toBeInTheDocument();
  });

  // --- Navigation ---

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
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons.find(b => b.querySelector('[data-testid="icon-chevron-left"]'));
    const nextButton = buttons.find(b => b.querySelector('[data-testid="icon-chevron-right"]'));
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('disables prev button when hasPrevious=false', () => {
    render(
      <TradeDetailModal {...defaultProps} hasPrevious={false} hasNext={true} />
    );
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons.find(b => b.querySelector('[data-testid="icon-chevron-left"]'));
    expect(prevButton).toBeDisabled();
  });

  it('disables next button when hasNext=false', () => {
    render(
      <TradeDetailModal {...defaultProps} hasPrevious={true} hasNext={false} />
    );
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons.find(b => b.querySelector('[data-testid="icon-chevron-right"]'));
    expect(nextButton).toBeDisabled();
  });

  it('calls onPrevious when prev button clicked', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    render(
      <TradeDetailModal {...defaultProps} onPrevious={onPrevious} hasPrevious={true} />
    );
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons.find(b => b.querySelector('[data-testid="icon-chevron-left"]'))!;
    await user.click(prevButton);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button clicked', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <TradeDetailModal {...defaultProps} onNext={onNext} hasNext={true} />
    );
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons.find(b => b.querySelector('[data-testid="icon-chevron-right"]'))!;
    await user.click(nextButton);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('shows current index and total count', () => {
    render(
      <TradeDetailModal {...defaultProps} currentIndex={3} totalCount={15} />
    );
    expect(screen.getByText('4/15')).toBeInTheDocument();
  });

  // --- Edit / Delete ---

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<TradeDetailModal {...defaultProps} onEdit={onEdit} />);
    await user.click(screen.getByText('Edit').closest('button')!);
    expect(onEdit).toHaveBeenCalledWith(defaultProps.trade);
  });

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TradeDetailModal {...defaultProps} onDelete={onDelete} />);
    await user.click(screen.getByText('Delete').closest('button')!);
    expect(onDelete).toHaveBeenCalledWith('trade-1');
  });

  // --- All bottom cards always render ---

  it('renders all 5 bottom row cards even when data is empty', () => {
    const emptyTrade = makeTrade({
      notes: undefined,
      keyLesson: undefined,
      mistakes: [],
      brokenRuleIds: [],
      tags: undefined,
      emotions: undefined,
    });
    render(<TradeDetailModal {...defaultProps} trade={emptyTrade} />);

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Key Lesson')).toBeInTheDocument();
    expect(screen.getByText('Mistakes')).toBeInTheDocument();
    expect(screen.getByText('Broken Rules')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });
});
