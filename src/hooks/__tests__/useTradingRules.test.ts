import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTradingRules } from '../useTradingRules';

// Mock RTK Query hook
const mockUseGetRulesQuery = vi.fn();

vi.mock('@/store/api', () => ({
  useGetRulesQuery: () => mockUseGetRulesQuery(),
}));

const mockRules = [
  {
    ruleId: 'rule-1',
    title: 'Always use stop loss',
    description: 'Never enter a trade without a stop loss',
    category: 'risk',
    isActive: true,
  },
  {
    ruleId: 'rule-2',
    title: 'Max 3 trades per day',
    description: 'Do not take more than 3 trades in a single session',
    category: 'discipline',
    isActive: true,
  },
  {
    ruleId: 'rule-3',
    title: 'No revenge trading',
    description: 'Wait 30 minutes after a loss before entering another trade',
    category: 'psychology',
    isActive: false,
  },
];

describe('useTradingRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetRulesQuery.mockReturnValue({
      data: mockRules,
      isLoading: false,
    });
  });

  it('returns rules array from the query', () => {
    const { result } = renderHook(() => useTradingRules());

    expect(result.current.rules).toEqual(mockRules);
    expect(result.current.rules).toHaveLength(3);
  });

  it('returns loading state while fetching', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.loading).toBe(true);
  });

  it('returns loading false when fetch is complete', () => {
    const { result } = renderHook(() => useTradingRules());

    expect(result.current.loading).toBe(false);
  });

  it('returns empty array as default when data is undefined', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.rules).toEqual([]);
  });

  it('returns the correct shape with rules and loading', () => {
    const { result } = renderHook(() => useTradingRules());

    expect(result.current).toHaveProperty('rules');
    expect(result.current).toHaveProperty('loading');
    expect(Array.isArray(result.current.rules)).toBe(true);
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('handles empty rules array from API', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.rules).toEqual([]);
    expect(result.current.rules).toHaveLength(0);
  });

  it('returns single rule correctly', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: [mockRules[0]],
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.rules).toHaveLength(1);
    expect(result.current.rules[0].ruleId).toBe('rule-1');
    expect(result.current.rules[0].title).toBe('Always use stop loss');
  });

  it('reflects updated data on re-render', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: mockRules,
      isLoading: false,
    });

    const { result, rerender } = renderHook(() => useTradingRules());

    expect(result.current.rules).toHaveLength(3);

    const updatedRules = [...mockRules, {
      ruleId: 'rule-4',
      title: 'New rule',
      description: 'A newly added rule',
      category: 'general',
      isActive: true,
    }];

    mockUseGetRulesQuery.mockReturnValue({
      data: updatedRules,
      isLoading: false,
    });

    rerender();

    expect(result.current.rules).toHaveLength(4);
  });
});

describe('useTradingRules - Additional Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty rules array when no data is returned', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.rules).toEqual([]);
    expect(result.current.rules).toHaveLength(0);
  });

  it('handles rules with active and inactive status', () => {
    const mixedRules = [
      {
        ruleId: 'rule-active',
        title: 'Active Rule',
        description: 'This rule is active',
        category: 'risk',
        isActive: true,
      },
      {
        ruleId: 'rule-inactive',
        title: 'Inactive Rule',
        description: 'This rule is inactive',
        category: 'discipline',
        isActive: false,
      },
    ];

    mockUseGetRulesQuery.mockReturnValue({
      data: mixedRules,
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.rules).toHaveLength(2);
    expect(result.current.rules[0].isActive).toBe(true);
    expect(result.current.rules[1].isActive).toBe(false);
  });

  it('returns rules that can be filtered by category', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: mockRules,
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    const riskRules = result.current.rules.filter((r: any) => r.category === 'risk');
    const disciplineRules = result.current.rules.filter((r: any) => r.category === 'discipline');
    const psychologyRules = result.current.rules.filter((r: any) => r.category === 'psychology');

    expect(riskRules).toHaveLength(1);
    expect(disciplineRules).toHaveLength(1);
    expect(psychologyRules).toHaveLength(1);
  });

  it('returns loading state correctly during fetch', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.loading).toBe(true);
    expect(result.current.rules).toEqual([]);
  });
});
