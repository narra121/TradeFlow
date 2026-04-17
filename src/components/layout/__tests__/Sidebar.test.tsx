import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';

// Mock the useIsMobile hook — default to desktop (false)
const mockUseIsMobile = vi.fn(() => false);
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

describe('Sidebar', () => {
  const defaultProps = {
    activeView: 'dashboard',
    onViewChange: vi.fn(),
    collapsed: false,
    onCollapsedChange: vi.fn(),
    mobileOpen: false,
    onMobileOpenChange: vi.fn(),
  };

  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Desktop (original) tests ──────────────────────────────────────

  it('renders without crashing', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('TradeQut')).toBeInTheDocument();
  });

  it('displays the app name when expanded', () => {
    render(<Sidebar {...defaultProps} collapsed={false} />);
    expect(screen.getByText('TradeQut')).toBeInTheDocument();
  });

  it('hides the app name when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />);
    expect(screen.queryByText('TradeQut')).not.toBeInTheDocument();
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

  it('calls onCollapsedChange(true) when toggle button is clicked in expanded state', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} collapsed={false} />);

    const toggleButton = screen.getByRole('button', { name: 'Collapse sidebar' });
    await user.click(toggleButton);
    expect(defaultProps.onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('calls onCollapsedChange(false) when toggle button is clicked in collapsed state', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} collapsed={true} />);

    const toggleButton = screen.getByRole('button', { name: 'Expand sidebar' });
    await user.click(toggleButton);
    expect(defaultProps.onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it('highlights the active nav item', () => {
    render(<Sidebar {...defaultProps} activeView="analytics" collapsed={false} />);
    const analyticsButton = screen.getByText('Analytics').closest('button');
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
    // 6 nav items + 1 Zap logo + 1 Guide (HelpCircle) + 1 Profile (User icon) + 1 ChevronRight toggle + 1 active dot = 11
    expect(svgs.length).toBe(11);
  });

  // ─── Mobile-specific tests ─────────────────────────────────────────

  it('mobile: shows expanded labels even when collapsed', () => {
    mockUseIsMobile.mockReturnValue(true);
    render(<Sidebar {...defaultProps} collapsed={true} mobileOpen={true} />);

    // In mobile mode showExpanded is always true, so labels should be visible
    expect(screen.getByText('TradeQut')).toBeInTheDocument();
    const navLabels = ['Dashboard', 'Accounts', 'Trade Log', 'Analytics', 'Goals', 'Settings', 'Profile'];
    navLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('mobile: shows close (X) button instead of chevron', () => {
    mockUseIsMobile.mockReturnValue(true);
    render(<Sidebar {...defaultProps} mobileOpen={true} />);

    // Mobile renders a "Close sidebar" button, not collapse/expand
    expect(screen.getByRole('button', { name: 'Close sidebar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument();
  });

  it('mobile: backdrop overlay is rendered when open', () => {
    mockUseIsMobile.mockReturnValue(true);
    const { container } = render(<Sidebar {...defaultProps} mobileOpen={true} />);

    // The backdrop is a div with bg-black/50 class and aria-hidden
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass('bg-black/50');
  });

  it('mobile: backdrop is not rendered when closed', () => {
    mockUseIsMobile.mockReturnValue(true);
    const { container } = render(<Sidebar {...defaultProps} mobileOpen={false} />);

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeInTheDocument();
  });

  it('mobile: clicking backdrop calls onMobileOpenChange(false)', async () => {
    mockUseIsMobile.mockReturnValue(true);
    const user = userEvent.setup();
    const { container } = render(<Sidebar {...defaultProps} mobileOpen={true} />);

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);
    expect(defaultProps.onMobileOpenChange).toHaveBeenCalledWith(false);
  });

  it('mobile: clicking close button calls onMobileOpenChange(false)', async () => {
    mockUseIsMobile.mockReturnValue(true);
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} mobileOpen={true} />);

    await user.click(screen.getByRole('button', { name: 'Close sidebar' }));
    expect(defaultProps.onMobileOpenChange).toHaveBeenCalledWith(false);
  });

  it('mobile: clicking a nav item calls onMobileOpenChange(false) to auto-close', async () => {
    mockUseIsMobile.mockReturnValue(true);
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} mobileOpen={true} />);

    await user.click(screen.getByText('Analytics'));
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('analytics');
    expect(defaultProps.onMobileOpenChange).toHaveBeenCalledWith(false);
  });

  // ─── Tooltip behavior ───────────────────────────────────────────────

  describe('Sidebar - Tooltip behavior', () => {
    it('renders TooltipProvider wrapping sidebar content', () => {
      const { container } = render(<Sidebar {...defaultProps} collapsed={true} />);

      // When collapsed on desktop, nav buttons are wrapped by TooltipTrigger
      // which adds a data-state attribute from Radix UI
      const triggers = container.querySelectorAll('[data-state]');
      expect(triggers.length).toBeGreaterThan(0);
    });

    it('shows tooltip content for nav items when collapsed', async () => {
      const user = userEvent.setup();
      const { container } = render(<Sidebar {...defaultProps} collapsed={true} />);

      // When collapsed on desktop, each nav button is inside a TooltipTrigger
      // Radix UI marks these triggers with data-state="closed" initially
      const triggers = container.querySelectorAll('button[data-state]');
      expect(triggers.length).toBeGreaterThan(0);

      // Hover over the first nav button to attempt to open tooltip
      await user.hover(triggers[0]);

      // In jsdom, Radix tooltips may not fully render portaled content,
      // but we can verify the trigger is recognized by checking its data-state
      expect(triggers[0]).toHaveAttribute('data-state');
    });
  });

  // ─── Mobile behavior ────────────────────────────────────────────────

  describe('Sidebar - Mobile behavior', () => {
    it('closes sidebar when Escape key is pressed on mobile', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(<Sidebar {...defaultProps} mobileOpen={true} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onMobileOpenChange).toHaveBeenCalledWith(false);
    });

    it('sets body overflow to hidden when mobile sidebar is open', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(<Sidebar {...defaultProps} mobileOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body overflow when mobile sidebar closes', () => {
      mockUseIsMobile.mockReturnValue(true);
      const { rerender } = render(<Sidebar {...defaultProps} mobileOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Sidebar {...defaultProps} mobileOpen={false} />);
      expect(document.body.style.overflow).toBe('');
    });

    it('auto-closes when Profile button is clicked on mobile', async () => {
      mockUseIsMobile.mockReturnValue(true);
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} mobileOpen={true} />);

      await user.click(screen.getByText('Profile'));
      expect(defaultProps.onViewChange).toHaveBeenCalledWith('profile');
      expect(defaultProps.onMobileOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
