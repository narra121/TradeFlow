import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NAME_MAX_LENGTH, signInMethodFromToken, useProfile, validateName } from '../useProfile';

const useGetProfileQuery = vi.fn();
const updateProfile = vi.fn();
const refreshToken = vi.fn();

vi.mock('@/lib/api/tokenRefresh', () => ({ refreshToken: () => refreshToken() }));

vi.mock('@/store/api/userApi', () => ({
  useGetProfileQuery: () => useGetProfileQuery(),
  useUpdateProfileMutation: () => [updateProfile, { isLoading: false }],
}));

function token(payload: object): string {
  return `h.${btoa(JSON.stringify(payload))}.s`;
}

describe('validateName', () => {
  it('rejects blank and over-long names', () => {
    expect(validateName('   ')).toMatch(/Enter the name/);
    expect(validateName('x'.repeat(NAME_MAX_LENGTH + 1))).toMatch(/60 characters/);
  });

  it('accepts a normal name', () => {
    expect(validateName(' Ada ')).toBeNull();
  });
});

describe('signInMethodFromToken', () => {
  it('detects Google through identities or the username prefix', () => {
    expect(signInMethodFromToken(token({ identities: [{ providerName: 'Google' }] }))).toBe('google');
    expect(signInMethodFromToken(token({ 'cognito:username': 'Google_123' }))).toBe('google');
  });

  it('defaults to password', () => {
    expect(signInMethodFromToken(token({ 'cognito:username': 'abc' }))).toBe('password');
    expect(signInMethodFromToken(null)).toBe('password');
  });
});

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('idToken');
  });

  it('exposes name, email and hasName', () => {
    useGetProfileQuery.mockReturnValue({ data: { name: ' Ada ', email: 'a@b.co' }, isLoading: false, isError: false, refetch: vi.fn() });
    const { result } = renderHook(() => useProfile());
    expect(result.current).toMatchObject({ name: 'Ada', email: 'a@b.co', hasName: true, method: 'password' });
  });

  it('keeps the saved name while the server still returns the old one (stale refetch), then follows the server', async () => {
    const stale = { data: { name: 'Old', email: 'a@b.co' }, isLoading: false, isError: false, refetch: vi.fn() };
    useGetProfileQuery.mockReturnValue(stale);
    updateProfile.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    refreshToken.mockResolvedValue('t');
    const { result, rerender } = renderHook(() => useProfile());
    await act(async () => {
      await result.current.saveName('New');
    });
    expect(result.current.name).toBe('New');
    useGetProfileQuery.mockReturnValue({ ...stale, data: { name: 'Old', email: 'a@b.co' } });
    rerender();
    expect(result.current.name).toBe('New');
    useGetProfileQuery.mockReturnValue({ ...stale, data: { name: 'Newer', email: 'a@b.co' } });
    rerender();
    expect(result.current.name).toBe('Newer');
  });

  it('reports hasName false for an empty name so onboarding can ask', () => {
    useGetProfileQuery.mockReturnValue({ data: { name: '', email: 'a@b.co' }, isLoading: false, isError: false, refetch: vi.fn() });
    const { result } = renderHook(() => useProfile());
    expect(result.current.hasName).toBe(false);
  });

  it('saveName trims, reissues the ID token (the profile name is a token claim), then refetches; invalid names make no request', async () => {
    const refetch = vi.fn();
    const order: string[] = [];
    useGetProfileQuery.mockReturnValue({ data: { name: '', email: 'a@b.co' }, isLoading: false, isError: false, refetch });
    updateProfile.mockReturnValue({ unwrap: () => { order.push('update'); return Promise.resolve({}); } });
    refreshToken.mockImplementation(() => { order.push('refresh'); return Promise.resolve('t'); });
    refetch.mockImplementation(() => { order.push('refetch'); });
    const { result } = renderHook(() => useProfile());
    await act(async () => {
      await result.current.saveName('  Ada  ');
    });
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Ada' });
    expect(order).toEqual(['update', 'refresh', 'refetch']);
    await expect(result.current.saveName('  ')).rejects.toThrow();
    expect(updateProfile).toHaveBeenCalledTimes(1);
  });
});
