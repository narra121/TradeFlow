import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRazorpay } from '../useRazorpay';

// Mock the razorpay API module
const mockCreateOrder = vi.fn();
const mockVerifyPayment = vi.fn();
const mockCreateSubscription = vi.fn();
const mockGetSubscription = vi.fn();

vi.mock('@/lib/api', () => ({
  razorpayApi: {
    createOrder: (...args: any[]) => mockCreateOrder(...args),
    verifyPayment: (...args: any[]) => mockVerifyPayment(...args),
    createSubscription: (...args: any[]) => mockCreateSubscription(...args),
    getSubscription: (...args: any[]) => mockGetSubscription(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useRazorpay', () => {
  const originalEnv = import.meta.env.VITE_RAZORPAY_KEY_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.Razorpay
    delete (window as any).Razorpay;
    // Set a valid key
    import.meta.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_validkey123';
  });

  afterEach(() => {
    import.meta.env.VITE_RAZORPAY_KEY_ID = originalEnv;
  });

  it('returns initial state with loading false and no error', () => {
    const { result } = renderHook(() => useRazorpay());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes initiatePayment and initiateSubscription functions', () => {
    const { result } = renderHook(() => useRazorpay());

    expect(typeof result.current.initiatePayment).toBe('function');
    expect(typeof result.current.initiateSubscription).toBe('function');
  });

  describe('initiatePayment', () => {
    it('throws error when Razorpay SDK is not loaded', async () => {
      const onFailure = vi.fn();

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiatePayment({
          amount: 1000,
          name: 'Test',
          description: 'Test payment',
          onFailure,
        });
      });

      expect(result.current.error).toBe(
        'Razorpay SDK not loaded. Please include the checkout script for one-time payments.'
      );
      expect(onFailure).toHaveBeenCalled();
    });

    it('creates an order and opens Razorpay checkout when SDK is loaded', async () => {
      const mockOpen = vi.fn();
      const mockRazorpayConstructor = vi.fn().mockImplementation(() => ({
        open: mockOpen,
      }));
      (window as any).Razorpay = mockRazorpayConstructor;

      mockCreateOrder.mockResolvedValue({
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
      });

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiatePayment({
          amount: 1000,
          name: 'TradeFlow',
          description: 'Subscription',
        });
      });

      expect(mockCreateOrder).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'INR',
      });
      expect(mockRazorpayConstructor).toHaveBeenCalled();
      expect(mockOpen).toHaveBeenCalled();
    });

    it('uses provided currency when specified', async () => {
      const mockOpen = vi.fn();
      (window as any).Razorpay = vi.fn().mockImplementation(() => ({ open: mockOpen }));

      mockCreateOrder.mockResolvedValue({
        orderId: 'order_123',
        amount: 1000,
        currency: 'USD',
      });

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiatePayment({
          amount: 1000,
          currency: 'USD',
          name: 'Test',
          description: 'Test',
        });
      });

      expect(mockCreateOrder).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'USD',
      });
    });

    it('handles order creation failure', async () => {
      (window as any).Razorpay = vi.fn();

      mockCreateOrder.mockRejectedValue(new Error('Network error'));
      const onFailure = vi.fn();

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiatePayment({
          amount: 1000,
          name: 'Test',
          description: 'Test',
          onFailure,
        });
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading).toBe(false);
      expect(onFailure).toHaveBeenCalled();
    });

    it('sets loading to false after payment failure', async () => {
      const onFailure = vi.fn();

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiatePayment({
          amount: 1000,
          name: 'Test',
          description: 'Test',
          onFailure,
        });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('initiateSubscription', () => {
    it('throws error when Razorpay key is not configured', async () => {
      import.meta.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_xxxxxxxxxxxxx';
      const onFailure = vi.fn();

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Pro Plan',
          description: 'Monthly subscription',
          onFailure,
        });
      });

      expect(result.current.error).toBe(
        'Razorpay Key ID is not configured. Please set VITE_RAZORPAY_KEY_ID in .env file'
      );
      expect(onFailure).toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it('throws error when Razorpay key is empty', async () => {
      import.meta.env.VITE_RAZORPAY_KEY_ID = '';
      const onFailure = vi.fn();

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Pro Plan',
          description: 'Monthly subscription',
          onFailure,
        });
      });

      expect(result.current.error).toContain('Razorpay Key ID is not configured');
      expect(onFailure).toHaveBeenCalled();
    });

    it('calls createSubscription API with correct payload', async () => {
      // Mock a successful subscription creation but with no payment link to trigger error
      mockCreateSubscription.mockResolvedValue({
        subscriptionId: 'sub_123',
        planId: 'plan_123',
        status: 'created',
        shortUrl: '',
        paymentLink: '',
        authAttempts: 0,
      });

      const onFailure = vi.fn();
      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Pro Plan',
          description: 'Monthly subscription',
          onFailure,
        });
      });

      expect(mockCreateSubscription).toHaveBeenCalledWith({
        planId: 'plan_123',
        customerNotify: 1,
      });
    });

    it('handles missing payment link in response', async () => {
      mockCreateSubscription.mockResolvedValue({
        subscriptionId: 'sub_123',
        planId: 'plan_123',
        status: 'created',
        shortUrl: '',
        paymentLink: '',
        authAttempts: 0,
      });

      const onFailure = vi.fn();
      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Test',
          description: 'Test',
          onFailure,
        });
      });

      expect(result.current.error).toBe('No payment link received from server');
      expect(onFailure).toHaveBeenCalled();
    });

    it('opens popup window when payment link is available', async () => {
      const mockPopup = { closed: true, close: vi.fn() };
      const mockWindowOpen = vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

      mockCreateSubscription.mockResolvedValue({
        subscriptionId: 'sub_123',
        planId: 'plan_123',
        status: 'created',
        shortUrl: 'https://rzp.io/short',
        paymentLink: 'https://rzp.io/i/payment-link',
        authAttempts: 0,
      });

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Pro Plan',
          description: 'Monthly subscription',
        });
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://rzp.io/i/payment-link',
        'RazorpaySubscription',
        expect.stringContaining('width=')
      );

      mockWindowOpen.mockRestore();
    });

    it('handles popup blocked scenario', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null);

      mockCreateSubscription.mockResolvedValue({
        subscriptionId: 'sub_123',
        planId: 'plan_123',
        status: 'created',
        shortUrl: 'https://rzp.io/short',
        paymentLink: 'https://rzp.io/i/payment-link',
        authAttempts: 0,
      });

      const onFailure = vi.fn();
      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Test',
          description: 'Test',
          onFailure,
        });
      });

      expect(result.current.error).toContain('Popup blocked');
      expect(onFailure).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('handles API error during subscription creation', async () => {
      mockCreateSubscription.mockRejectedValue(new Error('Server error'));

      const onFailure = vi.fn();
      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Test',
          description: 'Test',
          onFailure,
        });
      });

      expect(result.current.error).toBe('Server error');
      expect(onFailure).toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it('sets loading to false in finally block', async () => {
      mockCreateSubscription.mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useRazorpay());

      await act(async () => {
        await result.current.initiateSubscription({
          planId: 'plan_123',
          name: 'Test',
          description: 'Test',
        });
      });

      expect(result.current.loading).toBe(false);
    });
  });
});

describe('useRazorpay - Payment Callbacks and Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).Razorpay;
    import.meta.env.VITE_RAZORPAY_KEY_ID = 'rzp_test_validkey123';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles payment failure callback by invoking onFailure', async () => {
    // Razorpay SDK not loaded triggers the failure path
    const onFailure = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useRazorpay());

    await act(async () => {
      await result.current.initiatePayment({
        amount: 500,
        name: 'Test Payment',
        description: 'Failure test',
        onSuccess,
        onFailure,
      });
    });

    expect(onFailure).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      'Razorpay SDK not loaded. Please include the checkout script for one-time payments.'
    );
  });

  it('handles payment success callback when verification succeeds', async () => {
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    mockCreateOrder.mockResolvedValue({
      orderId: 'order_success',
      amount: 100000,
      currency: 'INR',
    });

    mockVerifyPayment.mockResolvedValue({
      verified: true,
      paymentId: 'pay_123',
      orderId: 'order_success',
    });

    // Mock Razorpay constructor to capture the handler and invoke it
    (window as any).Razorpay = vi.fn().mockImplementation((opts: any) => ({
      open: () => {
        // Simulate successful payment by calling the handler
        opts.handler({
          razorpay_order_id: 'order_success',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'sig_abc',
        });
      },
    }));

    const { result } = renderHook(() => useRazorpay());

    await act(async () => {
      await result.current.initiatePayment({
        amount: 1000,
        name: 'TradeFlow Pro',
        description: 'Success test',
        onSuccess,
        onFailure,
      });
    });

    expect(mockVerifyPayment).toHaveBeenCalledWith({
      razorpay_order_id: 'order_success',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'sig_abc',
    });
    expect(onSuccess).toHaveBeenCalledWith('pay_123', 'order_success');
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('handles missing Razorpay SDK for payment by setting error', async () => {
    delete (window as any).Razorpay;
    const onFailure = vi.fn();

    const { result } = renderHook(() => useRazorpay());

    await act(async () => {
      await result.current.initiatePayment({
        amount: 2000,
        name: 'Test',
        description: 'No SDK test',
        onFailure,
      });
    });

    expect(result.current.error).toBe(
      'Razorpay SDK not loaded. Please include the checkout script for one-time payments.'
    );
    expect(result.current.loading).toBe(false);
    expect(onFailure).toHaveBeenCalled();
  });

  it('handles network timeout during payment order creation', async () => {
    (window as any).Razorpay = vi.fn();
    const onFailure = vi.fn();

    mockCreateOrder.mockRejectedValue(new Error('Request timeout'));

    const { result } = renderHook(() => useRazorpay());

    await act(async () => {
      await result.current.initiatePayment({
        amount: 1000,
        name: 'Timeout Test',
        description: 'Timeout scenario',
        onFailure,
      });
    });

    expect(result.current.error).toBe('Request timeout');
    expect(result.current.loading).toBe(false);
    expect(onFailure).toHaveBeenCalled();
  });

  it('cleans up state on unmount without throwing', async () => {
    const { result, unmount } = renderHook(() => useRazorpay());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });
});
