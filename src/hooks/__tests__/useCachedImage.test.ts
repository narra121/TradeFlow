import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCachedImage } from '../useCachedImage';

// Mock the RTK Query hook
const mockUseGetImageQuery = vi.fn();

vi.mock('@/store/api/imageCache', () => ({
  useGetImageQuery: (...args: any[]) => mockUseGetImageQuery(...args),
}));

describe('useCachedImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it('returns cached image URL when data is available', () => {
    const objectUrl = 'blob:http://localhost/abc-123';
    mockUseGetImageQuery.mockReturnValue({
      data: objectUrl,
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useCachedImage('images/account1/trade1/screenshot.png'));

    expect(result.current.src).toBe(objectUrl);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('returns loading state while fetching', () => {
    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { result } = renderHook(() => useCachedImage('some-image-id'));

    expect(result.current.src).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('returns error state on failure', () => {
    const mockError = { status: 'CUSTOM_ERROR', error: 'Image not found' };
    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useCachedImage('bad-image-id'));

    expect(result.current.src).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('skips query when imageId is undefined', () => {
    const { result } = renderHook(() => useCachedImage(undefined));

    // Should have been called with empty string and skip: true
    expect(mockUseGetImageQuery).toHaveBeenCalledWith('', { skip: true });
    expect(result.current.src).toBeUndefined();
  });

  it('does not skip query when imageId is provided', () => {
    const imageId = 'account1/trade1/img.png';
    renderHook(() => useCachedImage(imageId));

    expect(mockUseGetImageQuery).toHaveBeenCalledWith(imageId, { skip: false });
  });

  it('passes empty string when imageId is undefined', () => {
    renderHook(() => useCachedImage(undefined));

    // First arg should be '' (fallback), second should have skip: true
    expect(mockUseGetImageQuery.mock.calls[0][0]).toBe('');
  });

  it('passes actual imageId when provided', () => {
    renderHook(() => useCachedImage('my-image'));

    expect(mockUseGetImageQuery.mock.calls[0][0]).toBe('my-image');
  });

  it('returns all three fields in the result object', () => {
    mockUseGetImageQuery.mockReturnValue({
      data: 'blob:http://localhost/xyz',
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCachedImage('test'));

    expect(result.current).toHaveProperty('src');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it('updates when imageId changes', () => {
    mockUseGetImageQuery.mockReturnValue({
      data: 'blob:http://localhost/first',
      isLoading: false,
      error: undefined,
    });

    const { result, rerender } = renderHook(
      ({ imageId }) => useCachedImage(imageId),
      { initialProps: { imageId: 'image-1' as string | undefined } }
    );

    expect(result.current.src).toBe('blob:http://localhost/first');

    mockUseGetImageQuery.mockReturnValue({
      data: 'blob:http://localhost/second',
      isLoading: false,
      error: undefined,
    });

    rerender({ imageId: 'image-2' });

    expect(mockUseGetImageQuery).toHaveBeenLastCalledWith('image-2', { skip: false });
  });
});

describe('useCachedImage - Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error for 404 image not found', () => {
    const notFoundError = { status: 404, data: 'Image not found' };
    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: notFoundError,
    });

    const { result } = renderHook(() => useCachedImage('nonexistent/image.png'));

    expect(result.current.error).toEqual(notFoundError);
    expect(result.current.error).toHaveProperty('status', 404);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error for 401 unauthorized', () => {
    const unauthorizedError = { status: 401, data: 'Unauthorized' };
    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: unauthorizedError,
    });

    const { result } = renderHook(() => useCachedImage('protected/image.png'));

    expect(result.current.error).toEqual(unauthorizedError);
    expect(result.current.error).toHaveProperty('status', 401);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns undefined src when error occurs', () => {
    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: 'Internal Server Error' },
    });

    const { result } = renderHook(() => useCachedImage('broken/image.png'));

    expect(result.current.src).toBeUndefined();
    expect(result.current.error).toBeDefined();
  });
});

describe('useCachedImage - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it('handles empty string imageId by passing it and not skipping', () => {
    renderHook(() => useCachedImage(''));

    // '' is falsy, so the hook will pass '' and skip: true
    expect(mockUseGetImageQuery).toHaveBeenCalledWith('', { skip: true });
  });

  it('handles imageId with special characters', () => {
    const specialId = 'images/account@1/trade#2/screenshot (1).png';
    mockUseGetImageQuery.mockReturnValue({
      data: 'blob:http://localhost/special-123',
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useCachedImage(specialId));

    expect(mockUseGetImageQuery).toHaveBeenCalledWith(specialId, { skip: false });
    expect(result.current.src).toBe('blob:http://localhost/special-123');
  });

  it('re-renders when imageId changes from valid to undefined', () => {
    mockUseGetImageQuery.mockReturnValue({
      data: 'blob:http://localhost/valid',
      isLoading: false,
      error: undefined,
    });

    const { rerender } = renderHook(
      ({ imageId }) => useCachedImage(imageId),
      { initialProps: { imageId: 'valid-image' as string | undefined } }
    );

    expect(mockUseGetImageQuery).toHaveBeenLastCalledWith('valid-image', { skip: false });

    // Now change to undefined
    mockUseGetImageQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });

    rerender({ imageId: undefined });

    expect(mockUseGetImageQuery).toHaveBeenLastCalledWith('', { skip: true });
  });
});
