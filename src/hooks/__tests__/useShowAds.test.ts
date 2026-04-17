import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShowAds } from '../useShowAds';

// Mock the adConfigApi query hook
const mockUseGetAdConfigQuery = vi.fn();
vi.mock('@/store/api/adConfigApi', () => ({
  useGetAdConfigQuery: () => mockUseGetAdConfigQuery(),
}));

describe('useShowAds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns showAds: false when adConfig has showAds: false', () => {
    mockUseGetAdConfigQuery.mockReturnValue({
      data: {
        showAds: false,
        tier: 'paid',
        clientId: 'ca-pub-123',
        placements: [],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useShowAds());

    expect(result.current.showAds).toBe(false);
    expect(result.current.tier).toBe('paid');
    expect(result.current.isLoading).toBe(false);
  });

  it('returns correct placement from getPlacement()', () => {
    const placements = [
      { id: 'dashboard-top', slotId: '111', format: 'auto' as const, enabled: true },
      { id: 'sidebar', slotId: '222', format: 'vertical' as const, enabled: true },
      { id: 'disabled-slot', slotId: '333', format: 'rectangle' as const, enabled: false },
    ];

    mockUseGetAdConfigQuery.mockReturnValue({
      data: {
        showAds: true,
        tier: 'free_with_ads',
        clientId: 'ca-pub-456',
        placements,
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useShowAds());

    // Should find enabled placement
    const placement = result.current.getPlacement('dashboard-top');
    expect(placement).toEqual({
      id: 'dashboard-top',
      slotId: '111',
      format: 'auto',
      enabled: true,
    });

    // Should find another enabled placement
    const sidebar = result.current.getPlacement('sidebar');
    expect(sidebar).toEqual({
      id: 'sidebar',
      slotId: '222',
      format: 'vertical',
      enabled: true,
    });

    // Should NOT return disabled placement
    const disabled = result.current.getPlacement('disabled-slot');
    expect(disabled).toBeUndefined();
  });

  it('returns undefined for unknown placement ID', () => {
    mockUseGetAdConfigQuery.mockReturnValue({
      data: {
        showAds: true,
        tier: 'free_with_ads',
        clientId: 'ca-pub-789',
        placements: [
          { id: 'dashboard-top', slotId: '111', format: 'auto' as const, enabled: true },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useShowAds());

    expect(result.current.getPlacement('nonexistent')).toBeUndefined();
  });

  it('returns defaults when adConfig is undefined (loading)', () => {
    mockUseGetAdConfigQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useShowAds());

    expect(result.current.showAds).toBe(false);
    expect(result.current.tier).toBe('free_with_ads');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.getPlacement('any')).toBeUndefined();
    expect(result.current.adConfig).toBeUndefined();
  });
});
