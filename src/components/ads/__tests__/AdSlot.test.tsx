import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdSlot } from '../AdSlot';

// Mock the useShowAds hook
const mockUseShowAds = vi.fn();
vi.mock('@/hooks/useShowAds', () => ({
  useShowAds: () => mockUseShowAds(),
}));

describe('AdSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when showAds is false (paid user)', () => {
    mockUseShowAds.mockReturnValue({
      showAds: false,
      tier: 'paid',
      isLoading: false,
      getPlacement: () => ({
        id: 'dashboard-top',
        slotId: '1234567890',
        format: 'auto',
        enabled: true,
      }),
      adConfig: {
        showAds: false,
        tier: 'paid',
        clientId: 'ca-pub-123',
        placements: [],
      },
    });

    const { container } = render(<AdSlot placementId="dashboard-top" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when placement does not exist in config', () => {
    mockUseShowAds.mockReturnValue({
      showAds: true,
      tier: 'free_with_ads',
      isLoading: false,
      getPlacement: () => undefined,
      adConfig: {
        showAds: true,
        tier: 'free_with_ads',
        clientId: 'ca-pub-123',
        placements: [],
      },
    });

    const { container } = render(<AdSlot placementId="nonexistent" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when placement is disabled', () => {
    mockUseShowAds.mockReturnValue({
      showAds: true,
      tier: 'free_with_ads',
      isLoading: false,
      getPlacement: () => ({
        id: 'dashboard-top',
        slotId: '1234567890',
        format: 'auto',
        enabled: false,
      }),
      adConfig: {
        showAds: true,
        tier: 'free_with_ads',
        clientId: 'ca-pub-123',
        placements: [],
      },
    });

    const { container } = render(<AdSlot placementId="dashboard-top" />);
    // placement.enabled is false, so component should render nothing
    expect(container.innerHTML).toBe('');
  });

  it('renders the ad container with correct data attributes when enabled', () => {
    mockUseShowAds.mockReturnValue({
      showAds: true,
      tier: 'free_with_ads',
      isLoading: false,
      getPlacement: () => ({
        id: 'dashboard-top',
        slotId: '9876543210',
        format: 'horizontal',
        enabled: true,
      }),
      adConfig: {
        showAds: true,
        tier: 'free_with_ads',
        clientId: 'ca-pub-456',
        placements: [
          {
            id: 'dashboard-top',
            slotId: '9876543210',
            format: 'horizontal',
            enabled: true,
          },
        ],
      },
    });

    render(<AdSlot placementId="dashboard-top" />);

    // Check the wrapper is rendered
    const wrapper = screen.getByTestId('ad-slot-dashboard-top');
    expect(wrapper).toBeInTheDocument();

    // Check the "Ad" label
    expect(screen.getByText('Ad')).toBeInTheDocument();

    // Check the ins element with correct attributes
    const ins = wrapper.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
    expect(ins?.getAttribute('data-ad-client')).toBe('ca-pub-456');
    expect(ins?.getAttribute('data-ad-slot')).toBe('9876543210');
    expect(ins?.getAttribute('data-ad-format')).toBe('horizontal');
    expect(ins?.getAttribute('data-full-width-responsive')).toBe('true');
  });

  it('handles missing adConfig gracefully (loading state)', () => {
    mockUseShowAds.mockReturnValue({
      showAds: false,
      tier: 'free_with_ads',
      isLoading: true,
      getPlacement: () => undefined,
      adConfig: undefined,
    });

    const { container } = render(<AdSlot placementId="dashboard-top" />);
    // When loading, showAds defaults to false, so nothing renders
    expect(container.innerHTML).toBe('');
  });
});
