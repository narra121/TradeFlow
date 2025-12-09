import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  Heart, 
  Check,
  Edit2,
  Camera,
  Loader2,
  LogOut
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchProfile, 
  updateProfile as updateProfileAction,
  fetchSubscription,
  createSubscription as createSubscriptionAction
} from '@/store/slices/userSlice';
import { useRazorpay } from '@/hooks/useRazorpay';
import { razorpayApi, SubscriptionDetails, PlanResponse, authApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { ProfileCardSkeleton, SubscriptionCardSkeleton, SubscriptionPlansCardSkeleton } from '@/components/ui/loading-skeleton';
import { tokenRefreshScheduler } from '@/lib/tokenRefreshScheduler';
import { logout as logoutThunk } from '@/store/slices/authSlice';

export function ProfileView() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { profile, subscription, loading } = useAppSelector((state) => state.user);
  const { initiateSubscription, loading: paymentLoading, error: paymentError } = useRazorpay();
  
  const handleLogout = async () => {
    // Dispatch logout thunk which stops scheduler and calls API
    await dispatch(logoutThunk()).unwrap();
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    
    // Navigate to login
    navigate('/login', { replace: true });
  };
  
  const [availablePlans, setAvailablePlans] = useState<PlanResponse[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  
  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchSubscription());
    if (!plansLoaded) {
      loadAvailablePlans();
    }
  }, [dispatch, plansLoaded]);
  
  const loadAvailablePlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await razorpayApi.getPlans();
      setAvailablePlans(response.plans || []);
      setPlansLoaded(true);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(99);
  const [selectedAnnualAmount, setSelectedAnnualAmount] = useState(999);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  
  // Get plan ID based on selected amount and billing cycle
  const getSelectedPlanId = () => {
    const amount = billingCycle === 'monthly' ? selectedAmount : selectedAnnualAmount;
    const plan = availablePlans.find(p => p.period === billingCycle && p.amount === amount);
    return plan?.planId || '';
  };
  
  // Local state for editing
  const [user, setUser] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    avatar: '',
    joinedDate: '',
    subscription: {
      status: subscription?.status || 'inactive',
      plan: 'Supporter',
      amount: subscription?.amount || 0,
      nextBilling: subscription?.nextBillingDate || ''
    }
  });
  
  useEffect(() => {
    if (profile) {
      setUser(prev => ({
        ...prev,
        name: profile.name || '',
        email: profile.email || ''
      }));
    }
  }, [profile]);
  
  useEffect(() => {
    if (subscription) {
      setUser(prev => ({
        ...prev,
        subscription: {
          status: subscription.status,
          plan: 'Supporter',
          amount: subscription.amount,
          nextBilling: subscription.nextBillingDate
        }
      }));
    }
  }, [subscription]);

  const supportTiers = [
    { amount: 99, label: 'Basic', description: 'Minimum support' },
    { amount: 299, label: 'Supporter', description: 'Help us grow' },
  ];

  const annualTiers = [
    { amount: 999, label: 'Basic', description: 'Save 17%!', monthly: 99 },
    { amount: 2999, label: 'Supporter', description: 'Save 17%!', monthly: 299 },
  ];

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await dispatch(updateProfileAction({ name: user.name, email: user.email })).unwrap();
      setIsEditing(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Fetch current subscription on mount
  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (subscriptionLoaded) return;
      
      try {
        setLoadingSubscription(true);
        const details = await razorpayApi.getSubscription();
        setSubscriptionDetails(details);
        setSubscriptionLoaded(true);
      } catch (error) {
        console.log('No active subscription found');
        setSubscriptionLoaded(true);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscriptionDetails();
  }, [subscriptionLoaded]);

  const handleSubscribe = async (amount: number, cycle: 'monthly' | 'annual') => {
    setIsSubscribing(true);
    try {
      // Find plan ID based on amount and cycle
      const plan = availablePlans.find(p => p.period === cycle && p.amount === amount);
      
      if (!plan) {
        console.error('Plan not found for:', { amount, cycle });
        alert('Selected plan is not available. Please try another option.');
        return;
      }

      await initiateSubscription({
        planId: plan.planId,
        name: plan.name,
        description: plan.description || `${cycle === 'monthly' ? 'Monthly' : 'Annual'} recurring subscription - ₹${amount}`,
        onSuccess: async (subscriptionId) => {
          console.log('Subscription created:', subscriptionId);
          
          // Refresh subscription details
          const details = await razorpayApi.getSubscription();
          setSubscriptionDetails(details);
          
          // Update Redux store
          await dispatch(createSubscriptionAction({ 
            amount, 
            billingCycle: cycle 
          })).unwrap();
        },
        onFailure: (error) => {
          console.error('Subscription failed:', error);
        },
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCancelSubscription = async (immediate = false) => {
    if (!confirm(`Are you sure you want to cancel your subscription${immediate ? ' immediately' : ' at the end of the billing cycle'}?`)) {
      return;
    }

    setManagingSubscription(true);
    try {
      await razorpayApi.cancelSubscription(!immediate);
      const details = await razorpayApi.getSubscription();
      setSubscriptionDetails(details);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setManagingSubscription(false);
    }
  };

  const handlePauseSubscription = async () => {
    setManagingSubscription(true);
    try {
      await razorpayApi.pauseSubscription('now');
      const details = await razorpayApi.getSubscription();
      setSubscriptionDetails(details);
    } catch (error) {
      console.error('Failed to pause subscription:', error);
    } finally {
      setManagingSubscription(false);
    }
  };

  const handleResumeSubscription = async () => {
    setManagingSubscription(true);
    try {
      await razorpayApi.resumeSubscription('now');
      const details = await razorpayApi.getSubscription();
      setSubscriptionDetails(details);
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    } finally {
      setManagingSubscription(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and subscription</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        {loading && !profile ? (
          <div className="lg:col-span-2">
            <ProfileCardSkeleton />
          </div>
        ) : (
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">{user.name}</h3>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Member since {user.joinedDate}
                </p>
              </div>
            </div>

            <Separator />

            {/* Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  value={user.name}
                  onChange={(e) => setUser({...user, name: e.target.value})}
                  disabled={!isEditing}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email"
                    type="email"
                    value={user.email}
                    onChange={(e) => setUser({...user, email: e.target.value})}
                    disabled={!isEditing}
                    className="pl-10 bg-background/50"
                  />
                </div>
              </div>
            </div>

            <Separator />
            
            {/* Logout Button */}
            <div className="pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be redirected to the login page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Current Subscription Card */}
        {loading && !profile ? (
          <SubscriptionCardSkeleton />
        ) : (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription
            </CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSubscription && !subscriptionLoaded ? (
              <SubscriptionCardSkeleton />
            ) : subscriptionDetails ? (
              <>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-foreground">
                      Active Subscription
                    </span>
                    <Badge 
                      variant="default" 
                      className={
                        subscriptionDetails.status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : subscriptionDetails.status === 'paused'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {subscriptionDetails.status}
                    </Badge>
                  </div>
                  {subscriptionDetails.currentEnd && (
                    <p className="text-sm text-muted-foreground">
                      Next billing: {new Date(subscriptionDetails.currentEnd).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid cycles: {subscriptionDetails.paidCount}
                    {subscriptionDetails.remainingCount && ` • Remaining: ${subscriptionDetails.remainingCount}`}
                  </p>
                </div>

                {/* Subscription Management Buttons */}
                {subscriptionDetails.status === 'active' && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseSubscription()}
                      disabled={managingSubscription}
                      className="w-full"
                    >
                      {managingSubscription ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                      ) : (
                        'Pause Subscription'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelSubscription(false)}
                      disabled={managingSubscription}
                      className="w-full text-destructive hover:text-destructive"
                    >
                      Cancel at End of Cycle
                    </Button>
                  </div>
                )}

                {subscriptionDetails.status === 'paused' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleResumeSubscription()}
                    disabled={managingSubscription}
                    className="w-full"
                  >
                    {managingSubscription ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                    ) : (
                      'Resume Subscription'
                    )}
                  </Button>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>Thank you for supporting TradeFlow! Payments are automatically processed on your billing date.</p>
                </div>
              </>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                <p className="text-success font-medium mb-1">Free Account</p>
                <p className="text-sm">You have full access to all features! Support us below if you'd like.</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Subscription Plans */}
      {(loading && !profile) || (loadingPlans && !plansLoaded) ? (
        <SubscriptionPlansCardSkeleton />
      ) : (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Support the Developer (Optional)</CardTitle>
          <CardDescription className="max-w-xl mx-auto mt-2">
            TradeFlow is <span className="text-success font-semibold">100% free to use</span> with all features included.
            If you love TradeFlow and want to support the developer, you can contribute a small amount 
            to help cover hosting and development costs.
            <span className="block mt-2 text-foreground/80 font-medium">
              Minimum ₹99 or ₹299 — completely optional!
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Billing Cycle Toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg bg-muted/50 p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          {/* Monthly Tiers */}
          {billingCycle === 'monthly' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {supportTiers
                  .filter(tier => availablePlans.some(p => p.period === 'monthly' && p.amount === tier.amount))
                  .map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => setSelectedAmount(tier.amount)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedAmount === tier.amount
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 hover:border-primary/50 bg-background/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-foreground">₹{tier.amount}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{tier.label}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                    {selectedAmount === tier.amount && (
                      <div className="mt-3 flex items-center gap-1 text-primary text-sm">
                        <Check className="w-4 h-4" />
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Annual Tiers */}
          {billingCycle === 'annual' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {annualTiers
                  .filter(tier => availablePlans.some(p => p.period === 'yearly' && p.amount === tier.amount))
                  .map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => setSelectedAnnualAmount(tier.amount)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedAnnualAmount === tier.amount
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 hover:border-primary/50 bg-background/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-foreground">₹{tier.amount}</span>
                      <span className="text-sm text-muted-foreground">/year</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{tier.label}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                    <p className="text-xs text-primary mt-1">(₹{tier.monthly}/month)</p>
                    {selectedAnnualAmount === tier.amount && (
                      <div className="mt-3 flex items-center gap-1 text-primary text-sm">
                        <Check className="w-4 h-4" />
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 mb-6">
            <p className="text-sm text-muted-foreground text-center">
              <span className="text-success font-medium">The app is completely free!</span> Your support is optional but greatly appreciated. 
              It helps cover server hosting, database costs, and ongoing development. 
              No features are locked — this is purely a way to say thanks!
            </p>
          </div>

          {/* Subscribe Button */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="px-8 bg-gradient-primary hover:opacity-90 text-primary-foreground"
              onClick={() => handleSubscribe(
                billingCycle === 'monthly' ? selectedAmount : selectedAnnualAmount,
                billingCycle
              )}
              disabled={isSubscribing}
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Subscribe for ₹{billingCycle === 'monthly' ? selectedAmount : selectedAnnualAmount}/{billingCycle === 'monthly' ? 'month' : 'year'}
                </>
              )}
            </Button>
          </div>

          {/* Features included */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-center text-sm text-muted-foreground mb-4">All supporters get access to:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                'Unlimited trades',
                'Full analytics',
                'Calendar view',
                'Trade import',
                'Goal tracking',
                'All future features',
                'Priority support',
                'Community access'
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
