import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { GuidePage } from '../GuidePage';

// Mock IntersectionObserver (jsdom doesn't support it)
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    })),
  );
  // jsdom doesn't implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

describe('GuidePage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('How to Use TradeQut')).toBeInTheDocument();
  });

  it('renders the hero section with title and subtitle', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('How to Use TradeQut')).toBeInTheDocument();
    expect(
      screen.getByText(/Your complete guide to this free trading journal app/),
    ).toBeInTheDocument();
    expect(screen.getByText('Complete User Guide')).toBeInTheDocument();
  });

  it('renders the brand name in the nav bar', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getAllByText('TradeQut').length).toBeGreaterThanOrEqual(1);
  });

  it('has a "Back to Home" link pointing to /', () => {
    renderWithProviders(<GuidePage />);
    const backLinks = screen.getAllByRole('link', { name: /Back/i });
    const homeLink = backLinks.find((l) => l.getAttribute('href') === '/');
    expect(homeLink).toBeDefined();
  });

  it('has a "Get Started" link pointing to /signup', () => {
    renderWithProviders(<GuidePage />);
    const signupLinks = screen.getAllByRole('link', { name: /Get Started/i });
    const signupLink = signupLinks.find((l) => l.getAttribute('href') === '/signup');
    expect(signupLink).toBeDefined();
  });
});

describe('GuidePage - Section Headings', () => {
  it('renders all main section headings', () => {
    renderWithProviders(<GuidePage />);
    // Section labels appear in TOC buttons + section headings, so use getAllByText
    const sectionLabels = [
      'Getting Started',
      'Dashboard',
      'Adding Trades',
      'Importing Trades',
      'Trade Log',
      'Analytics',
      'Goals & Rules',
      'Settings',
      'Profile',
    ];
    sectionLabels.forEach((label) => {
      const matches = screen.getAllByText(label);
      // Each label should appear at least 3 times: mobile TOC button, desktop TOC button, section h2
      expect(matches.length).toBeGreaterThanOrEqual(3);
      // At least one should be an h2 heading
      const h2 = matches.find((el) => el.tagName === 'H2');
      expect(h2).toBeDefined();
    });
  });

  it('renders section subtitles', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Set up your account in under 2 minutes')).toBeInTheDocument();
    expect(screen.getByText('Your trading performance at a glance')).toBeInTheDocument();
    expect(screen.getByText('Log every trade with full context')).toBeInTheDocument();
    expect(screen.getByText('Bulk import from files, screenshots, or clipboard')).toBeInTheDocument();
    expect(screen.getByText('View, filter, and manage all your trades')).toBeInTheDocument();
    expect(screen.getByText('Deep insights into your trading patterns')).toBeInTheDocument();
    expect(screen.getByText('Set targets and maintain discipline')).toBeInTheDocument();
    expect(screen.getByText('Customize your dropdown options and preferences')).toBeInTheDocument();
    expect(screen.getByText('Your account info and subscription')).toBeInTheDocument();
  });

  it('renders section IDs for anchor navigation', () => {
    renderWithProviders(<GuidePage />);
    const sectionIds = [
      'getting-started',
      'dashboard',
      'adding-trades',
      'importing-trades',
      'trade-log',
      'analytics',
      'goals-rules',
      'settings',
      'profile',
    ];
    sectionIds.forEach((id) => {
      expect(document.getElementById(id)).toBeInTheDocument();
    });
  });
});

describe('GuidePage - Table of Contents', () => {
  it('renders desktop TOC with all section labels', () => {
    renderWithProviders(<GuidePage />);
    // Both vertical (desktop) and horizontal (mobile) TOCs are rendered, so labels appear multiple times
    const navs = screen.getAllByRole('navigation', { name: 'Guide navigation' });
    expect(navs.length).toBe(2); // vertical + horizontal

    const labels = [
      'Getting Started',
      'Dashboard',
      'Adding Trades',
      'Importing Trades',
      'Trade Log',
      'Analytics',
      'Goals & Rules',
      'Settings',
      'Profile',
    ];

    labels.forEach((label) => {
      // Each label appears in both TOCs plus in the section heading itself
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders the "Contents" heading in the vertical TOC', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Contents')).toBeInTheDocument();
  });

  it('TOC buttons are clickable', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GuidePage />);

    // Mock scrollIntoView since jsdom doesn't support it
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    // Find the Desktop TOC (vertical) by looking for the "Contents" heading
    const contentsHeading = screen.getByText('Contents');
    const desktopTOC = contentsHeading.closest('nav')!;

    const dashboardButton = within(desktopTOC).getByText('Dashboard');
    await user.click(dashboardButton);

    // scrollIntoView should have been called on the section element
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
});

describe('GuidePage - Mobile Navigation', () => {
  it('renders both desktop and mobile TOC navigation elements', () => {
    renderWithProviders(<GuidePage />);
    const navs = screen.getAllByRole('navigation', { name: 'Guide navigation' });
    // There should be two navigation elements: vertical (desktop) and horizontal (mobile)
    expect(navs.length).toBe(2);
  });

  it('mobile TOC renders pill-style buttons for all sections', () => {
    renderWithProviders(<GuidePage />);
    // The mobile (horizontal) TOC is in a sticky div with lg:hidden class
    // Both TOCs render buttons for each section
    const allButtons = screen.getAllByRole('button');
    const sectionLabels = [
      'Getting Started',
      'Dashboard',
      'Adding Trades',
      'Importing Trades',
      'Trade Log',
      'Analytics',
      'Goals & Rules',
      'Settings',
      'Profile',
    ];

    sectionLabels.forEach((label) => {
      // At least 2 buttons per label (one in desktop TOC, one in mobile TOC)
      const matching = allButtons.filter((btn) => btn.textContent === label);
      expect(matching.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('GuidePage - Lightbox (GuideScreenshot)', () => {
  it('renders screenshot images', () => {
    renderWithProviders(<GuidePage />);
    const images = screen.getAllByRole('img');
    // There should be many screenshots across all sections
    expect(images.length).toBeGreaterThanOrEqual(5);
  });

  it('renders image captions', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Manage multiple trading accounts from one place')).toBeInTheDocument();
    expect(screen.getByText('Dashboard with stat cards, filters, and equity curve')).toBeInTheDocument();
  });

  it('opens lightbox when a screenshot is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GuidePage />);

    // Find the first screenshot image (accounts.png)
    const accountsImg = screen.getByAltText('Accounts management page');
    // The clickable container is the parent div of the img
    const clickableDiv = accountsImg.closest('.cursor-zoom-in')!;

    // Before click: dialog should not have the enlarged image visible
    // The dialog image has the same alt text, but won't be visible until opened
    const imagesBefore = screen.getAllByAltText('Accounts management page');
    expect(imagesBefore.length).toBe(1); // Only the inline image

    await user.click(clickableDiv);

    // After click: dialog should now be open, showing a second image with the same alt
    const imagesAfter = screen.getAllByAltText('Accounts management page');
    expect(imagesAfter.length).toBe(2); // Inline + dialog
  });

  it('closes lightbox when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GuidePage />);

    // Open lightbox
    const accountsImg = screen.getByAltText('Accounts management page');
    const clickableDiv = accountsImg.closest('.cursor-zoom-in')!;
    await user.click(clickableDiv);

    // Dialog should be open
    expect(screen.getAllByAltText('Accounts management page').length).toBe(2);

    // The DialogContent has a built-in Radix close button with sr-only "Close" text
    // and the GuideScreenshot also renders its own X button
    // Find close buttons - the Radix one has sr-only "Close" text
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(closeButtons[0]);

    // Dialog should now be closed
    expect(screen.getAllByAltText('Accounts management page').length).toBe(1);
  });

  it('closes lightbox when the overlay is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GuidePage />);

    // Open lightbox
    const sidebarImg = screen.getByAltText('Sidebar navigation');
    const clickableDiv = sidebarImg.closest('.cursor-zoom-in')!;
    await user.click(clickableDiv);

    // Dialog should be open
    expect(screen.getAllByAltText('Sidebar navigation').length).toBe(2);

    // Click the overlay to close - Radix Dialog overlay has data-state attribute
    const overlays = document.querySelectorAll('[data-state="open"]');
    // The overlay is the fixed inset-0 element
    const overlay = Array.from(overlays).find(
      (el) => el.classList.contains('fixed') && el.getAttribute('data-state') === 'open',
    );

    if (overlay) {
      await user.click(overlay as HTMLElement);
      // Give time for dialog to close
      expect(screen.getAllByAltText('Sidebar navigation').length).toBe(1);
    }
  });
});

describe('GuidePage - Content Details', () => {
  it('renders step cards in Getting Started section', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Log In to Your Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Create a Trading Account')).toBeInTheDocument();
  });

  it('renders tip boxes', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getAllByText('Pro Tip').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Note').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Heads Up').length).toBeGreaterThanOrEqual(1);
  });

  it('renders keyboard shortcut indicators', () => {
    renderWithProviders(<GuidePage />);
    // KBD elements for keyboard shortcuts
    const kbdElements = document.querySelectorAll('kbd');
    expect(kbdElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the required fields table in Adding Trades section', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Entry / Exit Price')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Outcome')).toBeInTheDocument();
  });

  it('renders feature grid items in Dashboard section', () => {
    renderWithProviders(<GuidePage />);
    // "Total P&L" appears in both Dashboard feature grid and Analytics section
    expect(screen.getAllByText('Total P&L').length).toBeGreaterThanOrEqual(1);
    // "Win Rate" appears in Dashboard feature grid and Goals section
    expect(screen.getAllByText('Win Rate').length).toBeGreaterThanOrEqual(2);
    // "Profit Factor" appears in Dashboard and Analytics
    expect(screen.getAllByText('Profit Factor').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the CTA section at the bottom', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Ready to start?')).toBeInTheDocument();
    // Verify the CTA block contains a signup link
    const ctaHeading = screen.getByText('Ready to start?');
    const ctaContainer = ctaHeading.closest('.text-center')!;
    expect(ctaContainer).toBeInTheDocument();
    const signupLink = ctaContainer.querySelector('a[href="/signup"]');
    expect(signupLink).toBeInTheDocument();
  });

  it('renders the footer with copyright and links', () => {
    renderWithProviders(<GuidePage />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();

    const aboutLink = screen.getByRole('link', { name: 'About' });
    expect(aboutLink).toHaveAttribute('href', '/about');

    const contactLink = screen.getByRole('link', { name: 'Contact' });
    expect(contactLink).toHaveAttribute('href', '/contact');

    const privacyLink = screen.getByRole('link', { name: 'Privacy' });
    expect(privacyLink).toHaveAttribute('href', '/privacy');

    const termsLink = screen.getByRole('link', { name: 'Terms' });
    expect(termsLink).toHaveAttribute('href', '/terms');
  });
});

describe('GuidePage - Analytics Section', () => {
  it('renders chart type list', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Equity Curve')).toBeInTheDocument();
    expect(screen.getByText('Daily P&L')).toBeInTheDocument();
    expect(screen.getByText('Hourly Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Symbol Distribution')).toBeInTheDocument();
  });

  it('renders insights feature items', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Top Mistakes')).toBeInTheDocument();
    expect(screen.getByText('Broken Rules')).toBeInTheDocument();
    expect(screen.getByText('Key Lessons')).toBeInTheDocument();
  });
});

describe('GuidePage - Goals & Rules Section', () => {
  it('renders goal types', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText('Profit Target')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Max Trades')).toBeInTheDocument();
  });
});
