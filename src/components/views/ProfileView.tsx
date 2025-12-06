import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  Heart, 
  Sparkles,
  Check,
  Edit2,
  Camera,
  Loader2
} from 'lucide-react';

export function ProfileView() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customAnnualAmount, setCustomAnnualAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(1);
  const [selectedAnnualAmount, setSelectedAnnualAmount] = useState(12);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  
  // Mock user data - replace with actual user data from your API
  const [user, setUser] = useState({
    name: 'John Trader',
    email: 'john@example.com',
    avatar: '',
    joinedDate: 'January 2024',
    subscription: {
      status: 'active',
      plan: 'Supporter',
      amount: 1,
      nextBilling: 'February 1, 2025'
    }
  });

  const supportTiers = [
    { amount: 1, label: 'Basic', description: 'Cover hosting costs' },
    { amount: 3, label: 'Supporter', description: 'Help us grow' },
    { amount: 5, label: 'Champion', description: 'Fuel new features' },
  ];

  const annualTiers = [
    { amount: 12, label: 'Basic', description: 'Cover hosting costs', monthly: 1 },
    { amount: 36, label: 'Supporter', description: 'Help us grow', monthly: 3 },
    { amount: 60, label: 'Champion', description: 'Fuel new features', monthly: 5 },
  ];

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsEditing(false);
    setIsSavingProfile(false);
  };

  const handleSubscribe = async (amount: number, cycle: 'monthly' | 'annual') => {
    setIsSubscribing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Subscribe with amount: $${amount}/${cycle === 'monthly' ? 'month' : 'year'}`);
    setIsSubscribing(false);
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
          </CardContent>
        </Card>

        {/* Current Subscription Card */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription
            </CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-foreground">
                  ${user.subscription.amount}/month
                </span>
                <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {user.subscription.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Next billing: {user.subscription.nextBilling}
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Thank you for supporting TradeFlow! Your contribution helps keep the platform running.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plans */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Support TradeFlow</CardTitle>
          <CardDescription className="max-w-xl mx-auto mt-2">
            TradeFlow is built with passion by independent developers. Your contribution 
            helps cover hosting costs, maintenance, and allows us to keep building new features.
            <span className="block mt-2 text-foreground/80 font-medium">
              Choose a plan that works for you — every bit helps!
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
                {supportTiers.map((tier) => (
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
                      <span className="text-2xl font-bold text-foreground">${tier.amount}</span>
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

              {/* Custom Amount Monthly */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-background/30 border border-border/50 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground font-medium">Custom amount:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Min $1"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value && Number(e.target.value) >= 1) {
                        setSelectedAmount(Number(e.target.value));
                      }
                    }}
                    className="w-32 bg-background/50"
                  />
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
              </div>
            </>
          )}

          {/* Annual Tiers */}
          {billingCycle === 'annual' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {annualTiers.map((tier) => (
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
                      <span className="text-2xl font-bold text-foreground">${tier.amount}</span>
                      <span className="text-sm text-muted-foreground">/year</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{tier.label}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                    <p className="text-xs text-primary mt-1">(${tier.monthly}/month)</p>
                    {selectedAnnualAmount === tier.amount && (
                      <div className="mt-3 flex items-center gap-1 text-primary text-sm">
                        <Check className="w-4 h-4" />
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Amount Annual */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-background/30 border border-border/50 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground font-medium">Custom amount:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="12"
                    placeholder="Min $12"
                    value={customAnnualAmount}
                    onChange={(e) => {
                      setCustomAnnualAmount(e.target.value);
                      if (e.target.value && Number(e.target.value) >= 12) {
                        setSelectedAnnualAmount(Number(e.target.value));
                      }
                    }}
                    className="w-32 bg-background/50"
                  />
                  <span className="text-muted-foreground text-sm">/year</span>
                </div>
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 mb-6">
            <p className="text-sm text-muted-foreground text-center">
              <span className="text-foreground font-medium">Why {billingCycle === 'monthly' ? '$1' : '$12'} minimum?</span> This small amount helps us cover 
              server hosting, database costs, and ongoing maintenance. Every contribution, big or small, 
              directly supports the continued development of TradeFlow. No hidden fees, no locked features — 
              just transparent support for a tool we all love.
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
                  Subscribe for ${billingCycle === 'monthly' ? selectedAmount : selectedAnnualAmount}/{billingCycle === 'monthly' ? 'month' : 'year'}
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
    </div>
  );
}
