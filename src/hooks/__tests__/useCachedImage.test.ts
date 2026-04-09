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
