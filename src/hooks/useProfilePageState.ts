import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccounts } from '@/hooks/useAccounts';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useCurrency } from '@/hooks/useCurrency';
import {
  useGetProfileQuery,
  useGetSubscriptionQuery,
  useUpdateProfileMutation,
  useLogoutMutation,
  useGetPlansQuery,
  useCancelSubscriptionMutation,
  usePauseSubscriptionMutation,
  useResumeSubscriptionMutation,
  useUndoCancellationMutation,
  useVerifyCheckoutSessionMutation,
} from '@/store/api';
import type { Subscription } from '@/lib/api/user';
import type { PlanResponse } from '@/lib/api/stripe';
import { toast } from 'sonner';

const ACTIVE_STATUSES = ['active', 'authenticated', 'paused', 'cancellation_requested'];

export function useProfilePageState() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const verifiedRef = useRef(false);

  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useGetProfileQuery();
  const { data: subscription, isLoading: subscriptionLoading, isFetching: subscriptionFetching, refetch: refetchSubscription } = useGetSubscriptionQuery();
  const { currency } = useCurrency();
  const { data: availablePlans = [], isLoading: plansLoading } = useGetPlansQuery(currency);
  const { accounts } = useAccounts();
  const { initiateSubscription } = useStripeCheckout();

  const [updateProfile] = useUpdateProfileMutation();
  const [cancelSubscriptionMutation] = useCancelSubscriptionMutation();
  const [pauseSubscriptionMutation] = usePauseSubscriptionMutation();
  const [resumeSubscriptionMutation] = useResumeSubscriptionMutation();
  const [undoCancellationMutation] = useUndoCancellationMutation();
  const [logoutMutation] = useLogoutMutation();
  const [verifyCheckout] = useVerifyCheckoutSessionMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const loading = profileLoading || profileFetching || subscriptionLoading || subscriptionFetching;
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  // Stripe redirect verification
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const cancelled = searchParams.get('checkout');

    if (cancelled === 'cancelled') {
      toast.info('Checkout was cancelled.');
      setSearchParams({}, { replace: true });
      return;
    }

    if (sessionId && !verifiedRef.current) {
      verifiedRef.current = true;
      (async () => {
        try {
          const result = await verifyCheckout(sessionId).unwrap();
          if (result.status === 'active') {
            toast.success(result.message || 'Payment successful! Your subscription is now active.');
            refetchSubscription();
          } else if (result.status === 'expired') {
            toast.error(result.message || 'Checkout session expired. Please try again.');
          } else {
            toast.info(result.message || 'Payment is being processed...');
            refetchSubscription();
          }
        } catch {
          toast.error('Failed to verify payment. Please refresh the page.');
        } finally {
          setSearchParams({}, { replace: true });
        }
      })();
    }
  }, [searchParams, setSearchParams, refetchSubscription, verifyCheckout]);

  const memberSinceDate = useMemo(() => {
    if (!accounts.length) return '';
    const earliest = accounts
      .filter(a => a.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    return earliest?.createdAt
      ? new Date(earliest.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : '';
  }, [accounts]);

  const hasActiveSubscription = useMemo(() => {
    return !!subscription && ACTIVE_STATUSES.includes(subscription.status);
  }, [subscription]);

  const showPricingSection = useMemo(() => {
    return !subscription || !ACTIVE_STATUSES.includes(subscription.status);
  }, [subscription]);

  const startEditing = useCallback(() => {
    setEditFormData({ name: profile?.name || '', email: profile?.email || '' });
    setIsEditing(true);
  }, [profile]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditFormData({ name: '', email: '' });
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!editFormData.name.trim()) {
      toast.warning('Name is required');
      return;
    }
    if (!editFormData.email.trim()) {
      toast.warning('Email is required');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({ name: editFormData.name, email: editFormData.email }).unwrap();
      setIsEditing(false);
    } finally {
      setIsSavingProfile(false);
    }
  }, [editFormData, updateProfile]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
      toast.success('You have been successfully logged out.');
      navigate('/login', { replace: true });
    } catch {
      toast.error('There was an error logging out.');
    }
  }, [logoutMutation, navigate]);

  const handleSubscribe = useCallback(async (amount: number, cycle: 'monthly' | 'annual') => {
    setIsSubscribing(true);
    try {
      const periodKey = cycle === 'annual' ? 'yearly' : cycle;
      const plan = availablePlans.find(p => p.period === periodKey && p.amount === amount);

      if (!plan) {
        toast.error('Selected plan is not available. Please try another option.');
        return;
      }

      if (subscription && ['active', 'authenticated', 'created', 'cancellation_requested'].includes(subscription.status)) {
        toast.error('You already have an active subscription', {
          description: 'Please manage your existing subscription instead of creating a new one.',
        });
        return;
      }

      await initiateSubscription({
        planId: plan.planId,
        onSuccess: async () => {
          toast.success('Your payment was successful and your subscription is now active.');
          refetchSubscription();
        },
        onFailure: (error: any) => {
          toast.error(error.message || 'Failed to initiate subscription');
        },
      });
    } finally {
      setIsSubscribing(false);
    }
  }, [availablePlans, subscription, initiateSubscription, refetchSubscription]);

  const handleCancelSubscription = useCallback(async (immediate = false) => {
    setManagingSubscription(true);
    try {
      await cancelSubscriptionMutation({ cancelAtCycleEnd: !immediate }).unwrap();
      await refetchSubscription();
    } catch {
      // Error handled by RTK Query toast middleware
    } finally {
      setManagingSubscription(false);
    }
  }, [cancelSubscriptionMutation, refetchSubscription]);

  const handlePauseSubscription = useCallback(async () => {
    setManagingSubscription(true);
    try {
      await pauseSubscriptionMutation({ pauseAt: 'now' }).unwrap();
      await refetchSubscription();
    } catch {
      // Error handled by RTK Query toast middleware
    } finally {
      setManagingSubscription(false);
    }
  }, [pauseSubscriptionMutation, refetchSubscription]);

  const handleResumeSubscription = useCallback(async () => {
    setManagingSubscription(true);
    try {
      await resumeSubscriptionMutation({ resumeAt: 'now' }).unwrap();
      await refetchSubscription();
    } catch {
      // Error handled by RTK Query toast middleware
    } finally {
      setManagingSubscription(false);
    }
  }, [resumeSubscriptionMutation, refetchSubscription]);

  const handleUndoCancellation = useCallback(async () => {
    setManagingSubscription(true);
    try {
      await undoCancellationMutation().unwrap();
      await refetchSubscription();
    } catch {
      // Error handled by RTK Query toast middleware
    } finally {
      setManagingSubscription(false);
    }
  }, [undoCancellationMutation, refetchSubscription]);

  const handleRetryPayment = useCallback(async () => {
    if (!subscription?.planId) {
      toast.error('Unable to retry payment - plan information not found');
      return;
    }
    setIsSubscribing(true);
    try {
      const plan = availablePlans.find(p => p.planId === subscription.planId);
      if (!plan) {
        toast.error('Plan details not found. Please contact support.');
        return;
      }
      await initiateSubscription({
        planId: plan.planId,
        onSuccess: async () => {
          toast.success('Your payment was successful and your subscription is now active.');
          refetchSubscription();
        },
        onFailure: (error: any) => {
          toast.error(error.message || 'Failed to initiate subscription');
        },
      });
    } finally {
      setIsSubscribing(false);
    }
  }, [subscription, availablePlans, initiateSubscription, refetchSubscription]);

  return {
    profile,
    subscription,
    availablePlans,
    currency,
    currencySymbol,
    memberSinceDate,

    loading,
    profileFetching,
    subscriptionFetching,
    plansLoading,
    isSavingProfile,
    isSubscribing,
    managingSubscription,

    isEditing,
    editFormData,
    setEditFormData,
    startEditing,
    cancelEditing,

    handleSaveProfile,
    handleLogout,
    handleSubscribe,
    handleCancelSubscription,
    handlePauseSubscription,
    handleResumeSubscription,
    handleUndoCancellation,
    handleRetryPayment,
    refetchSubscription,

    hasActiveSubscription,
    showPricingSection,
  };
}
