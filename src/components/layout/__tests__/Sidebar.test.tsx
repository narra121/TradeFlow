import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  const defaultProps = {
    activeView: 'dashboard',
    onViewChange: vi.fn(),
    collapsed: false,
    onCollapsedChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('TradeFlow')).toBeInTheDocument();
  });

  it('displays the app name when expanded', () => {
    render(<Sidebar {...defaultProps} collapsed={false} />);
    expect(screen.getByText('TradeFlow')).toBeInTheDocument();
  });

  it('hides the app name when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.queryByText('TradeFlow')).not.toBeInTheDocument();
  });

  it('renders all navigation items when expanded', () => {
    render(<Sidebar {...defaultProps} collapsed={false} />);
    const navLabels = ['Dashboard', 'Accounts', 'Trade Log', 'Analytics', 'Goals', 'Settings'];
    navLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('hides navigation labels when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    const navLabels = ['Dashboard', 'Accounts', 'Trade Log', 'Analytics', 'Goals', 'Settings'];
    navLabels.forEach((label) => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  it('renders Profile button when expanded', () => {
    render(<Sidebar {...defaultProps} collapsed={false} />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('hides Profile label when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('calls onViewChange when a nav item is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} collapsed={false} />);

    await user.click(screen.getByText('Analytics'));
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('analytics');
  });

  it('calls onViewChange with correct id for each nav item', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} collapsed={false} />);

    const navItems = [
      { label: 'Dashboard', id: 'dashboard' },
      { label: 'Accounts', id: 'accounts' },
      { label: 'Trade Log', id: 'tradelog' },
      { label: 'Analytics', id: 'analytics' },
      { label: 'Goals', id: 'goals' },
      { label: 'Settings', id: 'settings' },
    ];

    for (const item of navItems) {
      await user.click(screen.getByText(item.label));
      expect(defaultProps.onViewChange).toHaveBeenCalledWith(item.id);
    }
  });

  it('calls onViewChange with "profile" when Profile is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} collapsed={false} />);

    await user.click(screen.getByText('Profile'));
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('profile');
  });

  it('calls onCollapsedChange(true) when collapse button is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} collapsed={false} />);

    // The collapse button is the ChevronLeft button next to the app name
    // It's a button element inside the header area; find the button that is not a nav item
    const buttons = screen.getAllByRole('button');
    // The collapse chevron is the second button in the header area (after logo area)
    // Find the one that triggers onCollapsedChange(true) -- it's in the header, before nav
    // It's the button with ChevronLeft icon, which is the only non-nav button when expanded
    // Let's click it directly
    const collapseButton = buttons.find((btn) => {
      // The collapse button is in the header, not in the nav
      const parent = btn.closest('.h-16');
      return parent !== null;
    });
    expect(collapseButton).toBeDefined();
    await user.click(collapseButton!);
    expect(defaultProps.onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('calls onCollapsedChange(false) when expand button is clicked in collapsed state', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} collapsed={true} />);

    // When collapsed, there's an expand button (ChevronRight) at the bottom
    const buttons = screen.getAllByRole('button');
    // The expand button is the last button rendered (after Profile)
    const expandButton = buttons[buttons.length - 1];
    expect(expandButton).toBeDefined();
    await user.click(expandButton!);
    expect(defaultProps.onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it('highlights the active nav item', () => {
    render(<Sidebar {...defaultProps} activeView="analytics" collapsed={false} />);
    const analyticsButton = screen.getByText('Analytics').closest('button');
    // The active item gets the 'bg-sidebar-accent' and 'text-sidebar-primary' classes
    expect(analyticsButton).toHaveClass('bg-sidebar-accent');
    expect(analyticsButton).toHaveClass('text-sidebar-primary');
  });

  it('does not highlight non-active nav items', () => {
    render(<Sidebar {...defaultProps} activeView="dashboard" collapsed={false} />);
    const analyticsButton = screen.getByText('Analytics').closest('button');
    expect(analyticsButton).not.toHaveClass('text-sidebar-primary');
  });

  it('renders SVG icons for all nav items', () => {
    const { container } = render(<Sidebar {...defaultProps} collapsed={true} />);
    const svgs = container.querySelectorAll('svg');
    // 6 nav items + 1 Zap logo + 1 Profile + 1 ChevronRight expand = 9
    expect(svgs.length).toBe(9);
  });
});
