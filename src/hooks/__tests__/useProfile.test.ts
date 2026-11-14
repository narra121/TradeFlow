import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NAME_MAX_LENGTH, signInMethod, useProfile, validateName } from '../useProfile';

const useGetProfileQuery = vi.fn();
const updateProfile = vi.fn();
const getIdToken = vi.fn();

vi.mock('@/lib/auth/authService', () => ({ getIdToken: (opts?: unknown) => getIdToken(opts) }));

vi.mock('@/store/api/userApi', () => ({
  useGetProfileQuery: () => useGetProfileQuery(),
  useUpdateProfileMutation: () => [updateProfile, { isLoading: false }],
}));

describe('validateName', () => {
  it('rejects blank and over-long names', () => {
    expect(validateName('   ')).toMatch(/Enter the name/);
    expect(validateName('x'.repeat(NAME_MAX_LENGTH + 1))).toMatch(/60 characters/);
  });

  it('accepts a normal name', () => {
    expect(validateName(' Ada ')).toBeNull();
  });
});

describe('signInMethod', () => {
  const P = 'CognitoIdentityServiceProvider.c1';
  beforeEach(() => localStorage.clear());

  it('is Google for a session that came through the Google redirect', () => {
    localStorage.setItem(`${P}.oauthSignIn`, 'true,false');
    expect(signInMethod()).toBe('google');
  });

  it('is password for an email sign-in, even when the account has a Google identity linked to it', () => {
    localStorage.setItem(`${P}.LastAuthUser`, 'abc');
    localStorage.setItem(`${P}.abc.idToken`, `h.${btoa(JSON.stringify({ 'cognito:username': 'abc', identities: [{ providerName: 'Google' }] }))}.s`);
    expect(signInMethod()).toBe('password');
  });

  it('is password when signed out', () => {
    expect(signInMethod()).toBe('password');
  });
});

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('idToken');
  });

  it('exposes the error of a failed profile load', () => {
    const failure = { status: 500, data: { message: 'Your profile is being restored.' } };
    useGetProfileQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: failure, refetch: vi.fn() });
    const { result } = renderHook(() => useProfile());
    expect(result.current).toMatchObject({ isError: true, error: failure });
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
    getIdToken.mockResolvedValue('t');
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
    getIdToken.mockImplementation(() => { order.push('refresh'); return Promise.resolve('t'); });
    refetch.mockImplementation(() => { order.push('refetch'); });
    const { result } = renderHook(() => useProfile());
    await act(async () => {
      await result.current.saveName('  Ada  ');
    });
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Ada' });
    expect(order).toEqual(['update', 'refresh', 'refetch']);
    expect(getIdToken).toHaveBeenCalledWith({ forceRefresh: true });
    await expect(result.current.saveName('  ')).rejects.toThrow();
    expect(updateProfile).toHaveBeenCalledTimes(1);
  });

  it('a name that was saved is not reported as failed when the token reissue fails; a failed save still is', async () => {
    const refetch = vi.fn();
    useGetProfileQuery.mockReturnValue({ data: { name: 'Old', email: 'a@b.co' }, isLoading: false, isError: false, refetch });
    updateProfile.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    getIdToken.mockRejectedValue(new Error('refresh failed'));
    const { result } = renderHook(() => useProfile());
    await act(async () => {
      await expect(result.current.saveName('Ada')).resolves.toBeUndefined();
    });
    expect(refetch).not.toHaveBeenCalled();
    expect(result.current.name).toBe('Ada');

    updateProfile.mockReturnValue({ unwrap: () => Promise.reject({ status: 500 }) });
    await act(async () => {
      await expect(result.current.saveName('Grace')).rejects.toBeDefined();
    });
  });
});
