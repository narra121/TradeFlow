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
    rule: 'Always use stop loss',
    userId: 'u1',
    completed: false,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    ruleId: 'rule-2',
    rule: 'Max 3 trades per day',
    userId: 'u1',
    completed: false,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    ruleId: 'rule-3',
    rule: 'No revenge trading',
    userId: 'u1',
    completed: false,
    isActive: false,
    createdAt: '',
    updatedAt: '',
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
    expect(result.current.rules[0].rule).toBe('Always use stop loss');
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
      rule: 'New rule',
      userId: 'u1',
      completed: false,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    }];

    mockUseGetRulesQuery.mockReturnValue({
      data: updatedRules,
      isLoading: false,
    });

    rerender();

    expect(result.current.rules).toHaveLength(4);
  });

  it('deduplicates rules with the same rule text across periods', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: [
        { ruleId: 'week#2026-04-06#r1', rule: 'Always use stop loss', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
        { ruleId: 'week#2026-04-13#r1', rule: 'Always use stop loss', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
        { ruleId: 'week#2026-04-06#r2', rule: 'Max 3 trades per day', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
        { ruleId: 'week#2026-04-13#r2', rule: 'Max 3 trades per day', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
        { ruleId: 'legacy-r3', rule: 'No revenge trading', userId: 'u1', completed: false, isActive: true, createdAt: '', updatedAt: '' },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    expect(result.current.rules).toHaveLength(3);
    expect(result.current.rules.map((r: any) => r.rule)).toEqual([
      'Always use stop loss',
      'Max 3 trades per day',
      'No revenge trading',
    ]);
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
        rule: 'Active Rule',
        userId: 'u1',
        completed: false,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
      {
        ruleId: 'rule-inactive',
        rule: 'Inactive Rule',
        userId: 'u1',
        completed: false,
        isActive: false,
        createdAt: '',
        updatedAt: '',
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

  it('returns rules that can be filtered by isActive', () => {
    mockUseGetRulesQuery.mockReturnValue({
      data: mockRules,
      isLoading: false,
    });

    const { result } = renderHook(() => useTradingRules());

    const activeRules = result.current.rules.filter((r: any) => r.isActive);
    const inactiveRules = result.current.rules.filter((r: any) => !r.isActive);

    expect(activeRules).toHaveLength(2);
    expect(inactiveRules).toHaveLength(1);
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
