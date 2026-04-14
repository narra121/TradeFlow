import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStripeCheckout } from '../useStripeCheckout';

const mockCreateCheckoutSession = vi.fn();

vi.mock('@/lib/api/stripe', () => ({
  stripeApi: {
    createCheckoutSession: (...args: any[]) => mockCreateCheckoutSession(...args),
  },
}));

describe('useStripeCheckout', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    originalLocation = window.location;

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://tradequt.com', href: '' },
      writable: true,
    });
  });

  afterEach(() => {
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

  it('calls createCheckoutSession with correct payload including session_id template', async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_123',
      checkoutSessionId: 'cs_123',
    });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      planId: 'price_monthly',
      successUrl: 'https://tradequt.com/app/profile?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://tradequt.com/app/profile?checkout=cancelled',
    });
  });

  it('redirects to Stripe checkout URL via window.location.href', async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session_abc',
      checkoutSessionId: 'cs_abc',
    });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    expect(window.location.href).toBe('https://checkout.stripe.com/session_abc');
  });

  it('throws error when no checkout URL received', async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      checkoutUrl: null,
      checkoutSessionId: 'cs_no_url',
    });

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    expect(result.current.error).toBe('No checkout URL received from server');
    expect(result.current.loading).toBe(false);
  });

  it('sets error when createCheckoutSession fails', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
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

  it('sets loading=true during operation', async () => {
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
      });
      await promise!;
    });

    // loading stays true during redirect (page will unload)
    expect(result.current.loading).toBe(true);
  });

  it('sets loading=false after error', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      await result.current.initiateSubscription({ planId: 'price_monthly' });
    });

    expect(result.current.loading).toBe(false);
  });
});
