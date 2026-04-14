import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStripeCheckout } from '../useStripeCheckout';

const mockCreateCheckoutSession = vi.fn();
const mockGetSubscription = vi.fn();

vi.mock('@/lib/api/stripe', () => ({
  stripeApi: {
    createCheckoutSession: (...args: any[]) => mockCreateCheckoutSession(...args),
    getSubscription: (...args: any[]) => mockGetSubscription(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

describe('useStripeCheckout', () => {
  let originalOpen: typeof window.open;
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    originalOpen = window.open;
    originalLocation = window.location;

    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://tradequt.com', href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    window.open = originalOpen;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('returns initial state with loading=false, error=null, and initiateSubscription function', () => {
    const { result } = renderHook(() => useStripeCheckout());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.initiateSubscription).toBe('function');
  });

  it('calls createCheckoutSession with correct payload', async () => {
    const mockPopup = { closed: true, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_123',
      checkoutSessionId: 'cs_123',
      status: 'open',
    });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      const promise = result.current.initiateSubscription({ planId: 'price_monthly' });
      // Advance past the poll interval so the closed-popup check resolves the promise
      await vi.advanceTimersByTimeAsync(2500);
      await promise;
    });

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      planId: 'price_monthly',
      successUrl: 'https://tradequt.com/app/profile?checkout=success',
      cancelUrl: 'https://tradequt.com/app/profile?checkout=cancelled',
    });
  });

  it('opens popup window with checkout URL', async () => {
    const mockPopup = { closed: true, close: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_abc',
      checkoutSessionId: 'cs_abc',
      status: 'open',
    });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      const promise = result.current.initiateSubscription({ planId: 'price_monthly' });
      await vi.advanceTimersByTimeAsync(2500);
      await promise;
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://checkout.stripe.com/session_abc',
      'StripeCheckout',
      expect.stringContaining('width=')
    );
  });

  it('falls back to redirect when popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_blocked',
      checkoutSessionId: 'cs_blocked',
      status: 'open',
    });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    // When popup is blocked, it redirects via window.location.href
    expect(window.location.href).toBe('https://checkout.stripe.com/session_blocked');
  });

  it('polls for subscription status until active', async () => {
    const mockPopup = { closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_poll',
      checkoutSessionId: 'cs_poll',
      status: 'open',
    });

    // First call: inactive, second call: active
    mockGetSubscription
      .mockResolvedValueOnce({ status: 'incomplete', subscriptionId: 'sub_1' })
      .mockResolvedValueOnce({ status: 'active', subscriptionId: 'sub_1' });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      const promise = result.current.initiateSubscription({ planId: 'price_monthly' });
      // First poll — incomplete
      await vi.advanceTimersByTimeAsync(2000);
      // Second poll — active
      await vi.advanceTimersByTimeAsync(2000);
      await promise;
    });

    expect(mockGetSubscription).toHaveBeenCalledTimes(2);
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('calls onSuccess when subscription becomes active', async () => {
    const mockPopup = { closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_success',
      checkoutSessionId: 'cs_success',
      status: 'open',
    });

    mockGetSubscription.mockResolvedValue({
      status: 'active',
      subscriptionId: 'sub_active',
      stripeSubscriptionId: 'sub_stripe_123',
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      const promise = result.current.initiateSubscription({
        planId: 'price_monthly',
        onSuccess,
      });
      await vi.advanceTimersByTimeAsync(2500);
      await promise;
    });

    expect(onSuccess).toHaveBeenCalledWith('sub_active');
  });

  it('resolves when popup is closed by user', async () => {
    const mockPopup = { closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_close',
      checkoutSessionId: 'cs_close',
      status: 'open',
    });

    // Never return active — user closes popup instead
    mockGetSubscription.mockResolvedValue({ status: 'incomplete', subscriptionId: 'sub_1' });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      const promise = result.current.initiateSubscription({ planId: 'price_monthly' });

      // First poll — popup still open, subscription incomplete
      await vi.advanceTimersByTimeAsync(2000);

      // User closes popup
      mockPopup.closed = true;

      // Next poll detects closed popup and resolves
      await vi.advanceTimersByTimeAsync(2000);
      await promise;
    });

    // The promise resolved without error — loading should be false
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error when createCheckoutSession fails', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    expect(result.current.error).toBe('Network error');
  });

  it('calls onFailure callback on error', async () => {
    const networkError = new Error('Payment gateway unavailable');
    mockCreateCheckoutSession.mockRejectedValue(networkError);

    const onFailure = vi.fn();
    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({
        planId: 'price_monthly',
        onFailure,
      });
    });

    expect(onFailure).toHaveBeenCalledWith(networkError);
  });

  it('sets loading=true during operation and loading=false after', async () => {
    const mockPopup = { closed: true, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

    let resolveCheckout: (value: any) => void;
    mockCreateCheckoutSession.mockReturnValue(
      new Promise((resolve) => {
        resolveCheckout = resolve;
      })
    );

    const { result } = renderHook(() => useStripeCheckout());

    expect(result.current.loading).toBe(false);

    let promise: Promise<void>;
    act(() => {
      promise = result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    // loading should be true while awaiting
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveCheckout!({
        checkoutUrl: 'https://checkout.stripe.com/session_load',
        checkoutSessionId: 'cs_load',
        status: 'open',
      });
      await vi.advanceTimersByTimeAsync(2500);
      await promise!;
    });

    expect(result.current.loading).toBe(false);
  });
});
